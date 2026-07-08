import type { GameType, RoomSettings } from '@brotherhood/shared';
import { RECONNECT_TIMEOUT_MS } from '@brotherhood/shared';
import { GameEngine, GameAction, ActionResult, VisibilityRole } from './GameEngine';
import { GameRegistry } from './GameRegistry';
import { Room } from './Room';

/** Callback interface for the runtime to emit events to clients. */
export interface RuntimeEmitter {
  /** Emit to a specific socket id */
  emitToSocket(socketId: string, event: string, payload: unknown): void;
  /** Emit to all sockets in a room */
  emitToRoom(roomId: string, event: string, payload: unknown): void;
  /** Emit to all sockets in a room except one */
  emitToRoomExcept(roomId: string, excludeSocketId: string, event: string, payload: unknown): void;
  /** Emit to specific sockets in a room */
  emitToSockets(socketIds: string[], event: string, payload: unknown): void;
}

/** Connection info: maps userId to socketId */
interface ConnectionInfo {
  socketId: string;
  userId: string;
  roomId: string;
}

/** Disconnection reservation */
interface DisconnectionReservation {
  userId: string;
  roomId: string;
  expiresAt: number;
  timeout: NodeJS.Timeout;
}

/**
 * Game-agnostic runtime.
 *
 * Manages:
 * - Rooms (create, join, leave)
 * - Player connections (connect, disconnect, reconnect)
 * - Delegates ALL game logic to the registered GameEngine
 * - Broadcasts engine results to the room
 */
export class GameRuntime {
  private rooms = new Map<string, Room>(); // roomId -> Room
  private roomsByCode = new Map<string, string>(); // roomCode -> roomId
  private connections = new Map<string, ConnectionInfo>(); // userId -> ConnectionInfo
  private reservations = new Map<string, DisconnectionReservation>(); // userId -> reservation
  private emitter: RuntimeEmitter;

  constructor(emitter: RuntimeEmitter) {
    this.emitter = emitter;
  }

  // ---- Room Management ----

  /** Create a new room. */
  createRoom(
    gameType: GameType,
    hostId: string,
    hostUsername: string,
    socketId: string,
    settings?: Partial<RoomSettings>
  ): Room {
    const engine = GameRegistry.getOrThrow(gameType);

    const room = new Room(gameType, hostId, settings);
    room.addPlayer(hostId, hostUsername, 0); // Host gets seat 0

    this.rooms.set(room.id, room);
    this.roomsByCode.set(room.code, room.id);
    this.connections.set(hostId, { socketId, userId: hostId, roomId: room.id });

    return room;
  }

  /** Join an existing room as a player. */
  joinRoom(
    roomCode: string,
    userId: string,
    username: string,
    socketId: string
  ): { room: Room; seat: number } {
    const roomId = this.roomsByCode.get(roomCode.toUpperCase());
    if (!roomId) throw new Error('Room not found');

    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    if (room.status !== 'waiting') throw new Error('Game already in progress');

    // Check if this user was disconnected and has a reservation
    const reservation = this.reservations.get(userId);
    if (reservation && reservation.roomId === roomId) {
      // Reconnect to existing seat
      clearTimeout(reservation.timeout);
      this.reservations.delete(userId);
      return this.reconnectToRoom(room, userId, socketId);
    }

    if (room.hasUser(userId)) throw new Error('Already in room');

    const player = room.addPlayer(userId, username);
    this.connections.set(userId, { socketId, userId, roomId: roomId });

    return { room, seat: player.seat! };
  }

  /** Join a room as a spectator. */
  joinAsSpectator(
    roomCode: string,
    userId: string,
    username: string,
    socketId: string
  ): Room {
    const roomId = this.roomsByCode.get(roomCode.toUpperCase());
    if (!roomId) throw new Error('Room not found');

    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    if (room.hasUser(userId)) throw new Error('Already in room');

    room.addSpectator(userId, username);
    this.connections.set(userId, { socketId, userId, roomId: roomId });

    return room;
  }

  /** Leave a room. */
  leaveRoom(userId: string): { room: Room; wasHost: boolean } | null {
    const conn = this.connections.get(userId);
    if (!conn) return null;

    const room = this.rooms.get(conn.roomId);
    if (!room) return null;

    // If game is in progress, treat leaving as forfeit
    if (room.status === 'playing') {
      room.status = 'finished';
      this.emitter.emitToRoom(room.id, 'GAME_FINISHED', {
        winner: 'forfeit',
        reason: `Player left the game`,
        forfeitedPlayerId: userId,
      });
      this.cleanupRoom(room.id);
      return { room, wasHost: false };
    }

    const wasHost = room.isHost(userId);
    room.removePlayer(userId);
    room.removeSpectator(userId);
    this.connections.delete(userId);
    this.reservations.delete(userId);

    // If room is empty, clean it up
    if (room.players.size === 0 && room.spectators.size === 0) {
      this.cleanupRoom(room.id);
      return { room, wasHost };
    }

    // If host left, transfer ownership
    if (wasHost && room.players.size > 0) {
      const newHost = Array.from(room.players.values())[0];
      room.transferHost(newHost.userId);
    }

    return { room, wasHost };
  }

  // ---- Game Flow ----

  /** Start a game in a room. */
  startGame(roomId: string, hostId: string): { room: Room } {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    if (!room.isHost(hostId)) throw new Error('Only the host can start the game');
    if (room.status !== 'waiting') throw new Error('Game already started');
    if (!room.isFull()) throw new Error('Need 4 players to start');

    const engine = GameRegistry.getOrThrow(room.gameType);
    const playerIds = room.getPlayerIdsInSeatOrder();

    // Get team assignments in the same order as playerIds
    const teams: (0 | 1)[] = playerIds.map((pid) => {
      const player = room.players.get(pid);
      return player?.team ?? 0;
    });

    // Get usernames in the same order as playerIds
    const usernames: string[] = playerIds.map((pid) => {
      const player = room.players.get(pid);
      return player?.username ?? `Player`;
    });

    // Create initial state
    room.gameState = engine.createInitialState(playerIds, room.settings, teams, usernames);
    room.status = 'playing';
    room.matchId = crypto.randomUUID();

    // Execute START_GAME action (deals cards, transitions to FIRST_DEAL)
    const startAction: GameAction = {
      type: 'START_GAME',
      playerId: hostId,
      payload: {},
    };
    const result = engine.handleAction(room.gameState, startAction);
    room.gameState = result.newState;
    this.processBroadcasts(room.id, result);

    return { room };
  }

  /** Handle a game action from a player. */
  handleGameAction(
    userId: string,
    actionType: string,
    payload: Record<string, unknown>
  ): { room: Room; result: ActionResult<unknown> } {
    const conn = this.connections.get(userId);
    if (!conn) throw new Error('Not connected to any room');

    const room = this.rooms.get(conn.roomId);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'playing') throw new Error('Game not in progress');
    if (!room.gameState) throw new Error('No game state');

    const engine = GameRegistry.getOrThrow(room.gameType);

    const action: GameAction = {
      type: actionType,
      playerId: userId,
      payload,
    };

    // Validate first
    const validation = engine.validateAction(room.gameState, action);
    if (!validation.valid) {
      throw new Error(validation.error ?? 'Invalid action');
    }

    // Execute
    const result = engine.handleAction(room.gameState, action);
    room.gameState = result.newState;

    // Broadcast results
    this.processBroadcasts(room.id, result);

    // Check if game is complete
    if (engine.isComplete(result.newState)) {
      room.status = 'finished';
    }

    return { room, result };
  }

  /** Get the socket id for a connected user. */
  getSocketIdForUser(userId: string): string | undefined {
    return this.connections.get(userId)?.socketId;
  }

  /** Get the visible state for a specific player. */
  getVisibleState(userId: string): Record<string, unknown> | null {
    const conn = this.connections.get(userId);
    if (!conn) return null;

    const room = this.rooms.get(conn.roomId);
    if (!room || !room.gameState) return null;

    const engine = GameRegistry.getOrThrow(room.gameType);
    const role: VisibilityRole = room.players.has(userId) ? 'player' : 'spectator';

    return engine.getVisibleState(room.gameState, userId, role);
  }

  // ---- Connection Management ----

  /** Handle a player disconnecting. */
  handleDisconnect(socketId: string): { userId: string; roomId: string } | null {
    // Find the connection by socketId
    let disconnectedUserId: string | null = null;
    for (const [userId, conn] of this.connections.entries()) {
      if (conn.socketId === socketId) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (!disconnectedUserId) return null;

    const conn = this.connections.get(disconnectedUserId)!;
    const room = this.rooms.get(conn.roomId);
    if (!room) return null;

    // If game is in progress, create a reservation
    if (room.status === 'playing') {
      const reservation: DisconnectionReservation = {
        userId: disconnectedUserId,
        roomId: conn.roomId,
        expiresAt: Date.now() + RECONNECT_TIMEOUT_MS,
        timeout: setTimeout(() => {
          this.handleReconnectTimeout(disconnectedUserId!);
        }, RECONNECT_TIMEOUT_MS),
      };
      this.reservations.set(disconnectedUserId, reservation);

      // Notify the room
      this.emitter.emitToRoom(room.id, 'PLAYER_DISCONNECTED', {
        playerId: disconnectedUserId,
        timeout: RECONNECT_TIMEOUT_MS,
      });
    } else {
      // If waiting, just remove the player
      room.removePlayer(disconnectedUserId);
      this.connections.delete(disconnectedUserId);

      this.emitter.emitToRoom(room.id, 'PLAYER_LEFT', {
        playerId: disconnectedUserId,
      });
    }

    return { userId: disconnectedUserId, roomId: conn.roomId };
  }

  /** Handle a player reconnecting. */
  handleReconnect(userId: string, socketId: string): Room | null {
    const reservation = this.reservations.get(userId);
    if (!reservation) return null;

    const room = this.rooms.get(reservation.roomId);
    if (!room) return null;

    clearTimeout(reservation.timeout);
    this.reservations.delete(userId);

    // Update connection
    this.connections.set(userId, { socketId, userId, roomId: reservation.roomId });

    // Mark player as connected on the Room object
    const player = room.players.get(userId);
    if (player) {
      player.isConnected = true;
    }

    // Notify the room
    this.emitter.emitToRoom(room.id, 'PLAYER_RECONNECTED', { playerId: userId });

    return room;
  }

  // ---- Helpers ----

  /** Get a room by code. */
  getRoomByCode(code: string): Room | undefined {
    const roomId = this.roomsByCode.get(code.toUpperCase());
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /** Get a room by id. */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /** Get the room a user is in. */
  getUserRoom(userId: string): Room | undefined {
    const conn = this.connections.get(userId);
    return conn ? this.rooms.get(conn.roomId) : undefined;
  }

  /** Process broadcasts from an action result. */
  private processBroadcasts(roomId: string, result: ActionResult<unknown>): void {
    for (const broadcast of result.broadcasts) {
      if (broadcast.targetPlayerIds) {
        // Send to specific players
        const socketIds = broadcast.targetPlayerIds
          .map((pid) => this.connections.get(pid)?.socketId)
          .filter((s): s is string => !!s);
        this.emitter.emitToSockets(socketIds, broadcast.event, broadcast.payload);
      } else if (broadcast.excludePlayerIds) {
        // Send to all except specific players
        const excludeSocketIds = broadcast.excludePlayerIds
          .map((pid) => this.connections.get(pid)?.socketId)
          .filter((s): s is string => !!s);
        for (const socketId of excludeSocketIds) {
          this.emitter.emitToRoomExcept(roomId, socketId, broadcast.event, broadcast.payload);
        }
      } else {
        // Broadcast to whole room
        this.emitter.emitToRoom(roomId, broadcast.event, broadcast.payload);
      }
    }
  }

  /** Reconnect a user to their existing seat. */
  private reconnectToRoom(room: Room, userId: string, socketId: string): { room: Room; seat: number } {
    const player = room.players.get(userId);
    if (!player) throw new Error('Player not found in room');

    player.isConnected = true;
    this.connections.set(userId, { socketId, userId, roomId: room.id });

    return { room, seat: player.seat! };
  }

  /** Handle reconnect timeout (forfeit). */
  private handleReconnectTimeout(userId: string): void {
    const reservation = this.reservations.get(userId);
    if (!reservation) return;

    this.reservations.delete(userId);

    const room = this.rooms.get(reservation.roomId);
    if (!room) return;

    const player = room.players.get(userId);
    const username = player?.username ?? 'Unknown player';

    // Notify room of forfeit
    this.emitter.emitToRoom(room.id, 'GAME_FINISHED', {
      winner: 'forfeit',
      reason: `${username} failed to reconnect`,
      forfeitedPlayerId: userId,
    });

    room.status = 'finished';
    this.cleanupRoom(room.id);
  }

  /** Clean up a room. */
  private cleanupRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Clear any reservations for this room
    for (const [userId, reservation] of this.reservations.entries()) {
      if (reservation.roomId === roomId) {
        clearTimeout(reservation.timeout);
        this.reservations.delete(userId);
      }
    }

    this.roomsByCode.delete(room.code);
    this.rooms.delete(roomId);
  }
}
