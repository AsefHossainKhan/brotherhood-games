/**
 * Reconnection and forfeit — SPEC: spec-95c801, SPEC: spec-bc6000
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RECONNECT_TIMEOUT_MS } from "@brotherhood/shared";
import type { GameType } from "@brotherhood/shared";
import { GameRuntime, RuntimeEmitter } from "../GameRuntime";
import { GameRegistry } from "../GameRegistry";
import type { GameEngine } from "../GameEngine";

const GAME = "reconnect-test" as GameType;

interface StubState {
  hands: Record<string, string[]>;
}

/** Minimal engine: each player's visible state is their own hand. */
const stubEngine: GameEngine<StubState> = {
  gameType: GAME,
  createInitialState: (playerIds) => ({
    hands: Object.fromEntries(playerIds.map((id) => [id, [`${id}-card`]])),
  }),
  handleAction: (state) => ({ newState: state, broadcasts: [] }),
  validateAction: () => ({ valid: true }),
  getVisibleState: (state, playerId, role) => ({
    role,
    hand: role === "player" ? state.hands[playerId] : [],
  }),
  getPhase: () => "PLAYING",
  isComplete: () => false,
  getCurrentPlayer: () => null,
};

interface Emitted {
  target: string;
  event: string;
  payload: any;
}

function makeEmitter(log: Emitted[]): RuntimeEmitter {
  return {
    emitToSocket: (socketId, event, payload) =>
      log.push({ target: socketId, event, payload }),
    emitToRoom: (roomId, event, payload) =>
      log.push({ target: roomId, event, payload }),
    emitToRoomExcept: (roomId, _ex, event, payload) =>
      log.push({ target: roomId, event, payload }),
    emitToSockets: (ids, event, payload) =>
      ids.forEach((id) => log.push({ target: id, event, payload })),
  };
}

/** Four players seated (p0..p3, teams by seat parity) and the game started. */
function startedGame(runtime: GameRuntime) {
  const room = runtime.createRoom(GAME, "p0", "Alice", "s0");
  runtime.joinRoom(room.code, "p1", "Bob", "s1");
  runtime.joinRoom(room.code, "p2", "Cara", "s2");
  runtime.joinRoom(room.code, "p3", "Dev", "s3");
  runtime.startGame(room.id, "p0");
  return room;
}

describe("GameRuntime reconnection and forfeit", () => {
  let log: Emitted[];
  let runtime: GameRuntime;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    GameRegistry.register(stubEngine as GameEngine);
    log = [];
    runtime = new GameRuntime(makeEmitter(log));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ---- SPEC: spec-95c801 ----

  it("restores the seat and the hand when the guest reconnects with the room code", () => {
    const room = startedGame(runtime);
    const seat = room.players.get("p2")!.seat;

    runtime.handleDisconnect("s2");
    expect(room.players.get("p2")!.isConnected).toBe(false);

    const result = runtime.handleReconnect("p2", room.code.toLowerCase(), "s2b");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.room).toBe(room);
    expect(result.seat).toBe(seat);
    expect(room.players.get("p2")!.isConnected).toBe(true);
    expect(runtime.getSocketIdForUser("p2")).toBe("s2b");
    expect(runtime.getVisibleState("p2")).toEqual({
      role: "player",
      hand: ["p2-card"],
    });
    expect(log).toContainEqual({
      target: room.id,
      event: "PLAYER_RECONNECTED",
      payload: { playerId: "p2" },
    });
  });

  it("cancels the forfeit timer once the seat is reclaimed", () => {
    const room = startedGame(runtime);
    runtime.handleDisconnect("s1");
    runtime.handleReconnect("p1", room.code, "s1b");

    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS + 1);

    expect(runtime.getRoom(room.id)).toBe(room);
    expect(room.status).toBe("playing");
    expect(log.some((e) => e.event === "GAME_FINISHED")).toBe(false);
  });

  it("restores no seat when the guest holds no reservation", () => {
    const room = startedGame(runtime);

    const result = runtime.handleReconnect("stranger", room.code, "sx");

    expect(result).toEqual({ ok: false, reason: "NO_RESERVATION" });
    expect(runtime.getUserRoom("stranger")).toBeUndefined();
    expect(runtime.getVisibleState("stranger")).toBeNull();
  });

  it("restores no seat when the reservation belongs to a different room", () => {
    const roomA = startedGame(runtime);
    const roomB = runtime.createRoom(GAME, "q0", "Quinn", "t0");
    runtime.handleDisconnect("s3");

    const result = runtime.handleReconnect("p3", roomB.code, "s3b");

    expect(result).toEqual({ ok: false, reason: "NO_RESERVATION" });
    // The reservation for room A is still intact
    expect(runtime.handleReconnect("p3", roomA.code, "s3b").ok).toBe(true);
  });

  it("reports an unknown room code", () => {
    startedGame(runtime);
    runtime.handleDisconnect("s1");
    expect(runtime.handleReconnect("p1", "ZZZZ", "s1b")).toEqual({
      ok: false,
      reason: "ROOM_NOT_FOUND",
    });
  });

  it("a new socket supersedes a stale one the server has not seen drop", () => {
    const room = startedGame(runtime);

    const result = runtime.handleReconnect("p1", room.code, "s1b");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.supersededSocketId).toBe("s1");
    expect(runtime.getSocketIdForUser("p1")).toBe("s1b");

    // The old socket's late disconnect no longer touches the seat
    expect(runtime.handleDisconnect("s1")).toBeNull();
    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS + 1);
    expect(room.status).toBe("playing");
  });

  // ---- SPEC: spec-bc6000 ----

  it("forfeits the team and ends the match when 5 minutes pass without reconnect", () => {
    const room = startedGame(runtime);
    const team = room.players.get("p1")!.team;

    runtime.handleDisconnect("s1");
    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS - 1);
    expect(log.some((e) => e.event === "GAME_FINISHED")).toBe(false);

    vi.advanceTimersByTime(1);

    expect(log).toContainEqual({
      target: room.id,
      event: "GAME_FINISHED",
      payload: {
        winner: "forfeit",
        reason: "Bob failed to reconnect",
        forfeitedPlayerId: "p1",
        forfeitedTeam: team,
        winningTeam: 1 - team,
      },
    });
    expect(room.status).toBe("finished");
  });

  it("removes the room once the forfeited match ends", () => {
    const room = startedGame(runtime);
    runtime.handleDisconnect("s1");

    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS);

    expect(runtime.getRoom(room.id)).toBeUndefined();
    expect(runtime.getRoomByCode(room.code)).toBeUndefined();
    for (const id of ["p0", "p1", "p2", "p3"]) {
      expect(runtime.getUserRoom(id)).toBeUndefined();
    }
    // A late reconnect finds nothing to restore
    expect(runtime.handleReconnect("p1", room.code, "s1b")).toEqual({
      ok: false,
      reason: "ROOM_NOT_FOUND",
    });
  });

  it("fires a single forfeit when two players are disconnected", () => {
    startedGame(runtime);
    runtime.handleDisconnect("s1");
    vi.advanceTimersByTime(1000);
    runtime.handleDisconnect("s2");

    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS);

    const finished = log.filter((e) => e.event === "GAME_FINISHED");
    expect(finished).toHaveLength(1);
    expect(finished[0].payload.forfeitedPlayerId).toBe("p1");
  });

  it("a disconnected spectator never forfeits the match", () => {
    const room = startedGame(runtime);
    room.settings.allowSpectators = true;
    runtime.joinAsSpectator(room.code, "v1", "Viewer", "sv");

    runtime.handleDisconnect("sv");
    vi.advanceTimersByTime(RECONNECT_TIMEOUT_MS + 1);

    expect(room.status).toBe("playing");
    expect(room.spectators.has("v1")).toBe(false);
    expect(log.some((e) => e.event === "GAME_FINISHED")).toBe(false);
  });
});
