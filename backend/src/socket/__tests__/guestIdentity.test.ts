/**
 * Guest identity over a real socket — SPEC: spec-b5759c, SPEC: spec-95c801
 */
import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Server } from 'socket.io';
import { io as connectClient, Socket as ClientSocket } from 'socket.io-client';
import { setupSocketManager } from '../SocketManager.js';
import { derivePlayerId } from '../guestIdentity.js';

const TOKENS = [
  'token-alice-0000-0000-000000000000',
  'token-bob---0000-0000-000000000000',
  'token-cara--0000-0000-000000000000',
  'token-dev---0000-0000-000000000000',
];

interface Received {
  event: string;
  payload: unknown;
}

describe('guest identity', () => {
  let http: HttpServer;
  let io: Server;
  let url: string;
  const clients: ClientSocket[] = [];
  const received: Received[] = [];

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    http = createServer();
    io = setupSocketManager(http);
    await new Promise<void>((resolve) => http.listen(0, resolve));
    url = `http://localhost:${(http.address() as AddressInfo).port}`;
    received.length = 0;
  });

  afterEach(async () => {
    for (const c of clients.splice(0)) c.disconnect();
    io.close();
    await new Promise((resolve) => http.close(resolve));
    vi.restoreAllMocks();
  });

  /** Connect with a guestToken; resolve once SESSION_READY names the id. */
  function connect(guestToken: string | undefined, username = 'Guest') {
    const socket = connectClient(url, {
      auth: guestToken === undefined ? { username } : { guestToken, username },
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(socket);
    socket.onAny((event, payload) => received.push({ event, payload }));
    return new Promise<{ socket: ClientSocket; playerId: string }>(
      (resolve, reject) => {
        socket.once('SESSION_READY', (data: { playerId: string }) =>
          resolve({ socket, playerId: data.playerId }),
        );
        socket.once('connect_error', reject);
      },
    );
  }

  function next<T = any>(socket: ClientSocket, event: string): Promise<T> {
    return new Promise((resolve) => socket.once(event, resolve));
  }

  /** Four guests seated in one room, and the game started. */
  async function startedGame() {
    const guests = await Promise.all(
      TOKENS.map((t, i) => connect(t, `P${i}`)),
    );
    const [host, ...rest] = guests;

    const created = next<{ roomCode: string }>(host.socket, 'ROOM_CREATED');
    host.socket.emit('CREATE_ROOM', { gameType: 'twenty-nine', username: 'P0' });
    const { roomCode } = await created;

    for (const g of rest) {
      const joined = next(g.socket, 'ROOM_UPDATED');
      g.socket.emit('JOIN_ROOM', { roomCode, username: 'P' });
      await joined;
    }

    const started = next(host.socket, 'GAME_STARTED');
    host.socket.emit('START_GAME', {});
    await started;
    return { guests, roomCode };
  }

  it('sends each socket its public id, derived from and different to its token', async () => {
    const { playerId } = await connect(TOKENS[0]);

    expect(playerId).toBe(derivePlayerId(TOKENS[0]));
    expect(playerId).not.toBe(TOKENS[0]);
    expect(playerId).not.toContain(TOKENS[0]);
  });

  it('gives the same id to every connection with the same token', async () => {
    const a = await connect(TOKENS[1]);
    const b = await connect(TOKENS[1]);

    expect(a.playerId).toBe(b.playerId);
  });

  it('refuses a connection with no guestToken', async () => {
    await expect(connect(undefined)).rejects.toThrow('Missing guestToken');
  });

  it('never puts a guestToken in any event payload', async () => {
    const { guests } = await startedGame();
    // Let the deal broadcasts land
    await new Promise((resolve) => setTimeout(resolve, 100));

    const everything = JSON.stringify(received);
    for (const token of TOKENS) expect(everything).not.toContain(token);
    // ...while the public ids are what the room shows
    expect(everything).toContain(guests[1].playerId);
  });

  it("knowing a player's public id gives no control over that player", async () => {
    const { guests, roomCode } = await startedGame();
    const victim = guests[1];

    // The impostor presents the victim's public id as its token
    const impostor = await connect(victim.playerId, 'Impostor');
    expect(impostor.playerId).not.toBe(victim.playerId);

    // It cannot take the seat over...
    const failed = next(impostor.socket, 'RECONNECT_FAILED');
    impostor.socket.emit('RECONNECT_ROOM', { roomCode });
    expect(await failed).toEqual({ roomCode, reason: 'NO_RESERVATION' });

    // ...cannot act for the victim...
    const refused = next(impostor.socket, 'ERROR');
    impostor.socket.emit('PASS_BID', {});
    expect(await refused).toMatchObject({ code: 'ACTION_FAILED' });

    // ...and cannot make the victim leave
    impostor.socket.emit('LEAVE_ROOM', {});
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(victim.socket.connected).toBe(true);
    const names = received.map((r) => r.event);
    expect(names).not.toContain('GAME_FINISHED');
    expect(names).not.toContain('PLAYER_DISCONNECTED');
    expect(names).not.toContain('PLAYER_LEFT');
  });

  it('the real guest reclaims their seat with their own token', async () => {
    const { guests, roomCode } = await startedGame();
    const dropped = next(guests[0].socket, 'PLAYER_DISCONNECTED');
    guests[2].socket.disconnect();
    await dropped;

    const back = await connect(TOKENS[2], 'P2');
    expect(back.playerId).toBe(guests[2].playerId);

    const state = next(back.socket, 'GAME_STATE_UPDATED');
    back.socket.emit('RECONNECT_ROOM', { roomCode });
    expect(await state).toBeTruthy();
  });
});
