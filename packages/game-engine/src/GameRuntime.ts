import type { GameType, RoomSettings } from "@brotherhood/shared";
import { RECONNECT_TIMEOUT_MS } from "@brotherhood/shared";
import {
  GameEngine,
  GameAction,
  ActionResult,
  VisibilityRole,
} from "./GameEngine";
import { GameRegistry } from "./GameRegistry";
import { Room } from "./Room";

/** Callback interface for the runtime to emit events to clients. */
export interface RuntimeEmitter {
  /** Emit to a specific socket id */
  emitToSocket(socketId: string, event: string, payload: unknown): void;
  /** Emit to all sockets in a room */
  emitToRoom(roomId: string, event: string, payload: unknown): void;
  /** Emit to all sockets in a room except one */
  emitToRoomExcept(
    roomId: string,
    excludeSocketId: string,
    event: string,
    payload: unknown,
  ): void;
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

/** Outcome of a reconnect attempt. */
export type ReconnectResult =
  | { ok: true; room: Room; seat: number; supersededSocketId?: string }
  | { ok: false; reason: "ROOM_NOT_FOUND" | "NO_RESERVATION" };

/** Delay between consecutive bot actions, for a natural pace of play. */
const BOT_ACTION_DELAY_MS = 1000;

/**
 * Longer pause applied after a "review" moment (a completed trick or a settled
 * auction) so players can actually see what happened before play advances.
 * Kept in sync with the client's on-screen hold durations: the completed trick
 * stays visible for ~2s, then the cards animate off to the winner.
 */
const REVIEW_DELAY_MS = 3100;

/** Events after which play should pause briefly for the players to review. */
const REVIEW_EVENTS = new Set(["TRICK_COMPLETED", "BIDDING_FINISHED"]);

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
    settings?: Partial<RoomSettings>,
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
    socketId: string,
  ): { room: Room; seat: number } {
    const roomId = this.roomsByCode.get(roomCode.toUpperCase());
    if (!roomId) throw new Error("Room not found");

    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");

    // A seated player returning to a game in progress goes through
    // handleReconnect, never through a join.
    if (room.status !== "waiting") throw new Error("Game already in progress");

    if (room.hasUser(userId)) throw new Error("Already in room");

    const player = room.addPlayer(userId, username);
    this.connections.set(userId, { socketId, userId, roomId: roomId });

    return { room, seat: player.seat! };
  }

  /** Join a room as a spectator. */
  joinAsSpectator(
    roomCode: string,
    userId: string,
    username: string,
    socketId: string,
  ): Room {
    const roomId = this.roomsByCode.get(roomCode.toUpperCase());
    if (!roomId) throw new Error("Room not found");

    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");

    if (room.hasUser(userId)) throw new Error("Already in room");

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

    // If a player leaves a game in progress, their team forfeits
    if (room.status === "playing" && room.players.has(userId)) {
      this.forfeitMatch(room, userId, "Player left the game");
      return { room, wasHost: false };
    }

    const wasHost = room.isHost(userId);
    room.removePlayer(userId);
    room.removeSpectator(userId);
    this.connections.delete(userId);
    this.reservations.delete(userId);

    // Count remaining human (non-bot) players
    const humanPlayers = Array.from(room.players.values()).filter(
      (p) => !room.isBot(p.userId),
    );

    // If no humans remain (empty, or only bots left), clean up the room
    if (humanPlayers.length === 0 && room.spectators.size === 0) {
      this.cleanupRoom(room.id);
      return { room, wasHost };
    }

    // If host left, transfer ownership to another human (never a bot)
    if (wasHost && humanPlayers.length > 0) {
      room.transferHost(humanPlayers[0].userId);
    }

    return { room, wasHost };
  }

  /** Add an AI bot to a waiting room. Only the host may do this. */
  addBot(roomId: string, requesterId: string): { room: Room; botId: string } {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");
    if (!room.isHost(requesterId))
      throw new Error("Only the host can add bots");
    if (room.status !== "waiting")
      throw new Error("Cannot add bots after the game starts");
    if (room.isFull()) throw new Error("Room is full");

    const botId = `bot-${crypto.randomUUID()}`;
    const botNumber = room.botIds.size + 1;
    room.addBot(botId, `Bot ${botNumber}`);

    return { room, botId };
  }

  /** Remove an AI bot from a waiting room. Only the host may do this. */
  removeBot(
    roomId: string,
    requesterId: string,
    botId: string,
  ): { room: Room } {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");
    if (!room.isHost(requesterId))
      throw new Error("Only the host can remove bots");
    if (room.status !== "waiting")
      throw new Error("Cannot remove bots after the game starts");
    if (!room.isBot(botId)) throw new Error("That player is not a bot");

    room.removePlayer(botId);
    return { room };
  }

  // ---- Game Flow ----

  /** Start a game in a room. */
  startGame(roomId: string, hostId: string): { room: Room } {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Room not found");

    if (!room.isHost(hostId))
      throw new Error("Only the host can start the game");
    if (room.status !== "waiting") throw new Error("Game already started");
    if (!room.isFull()) throw new Error("Need 4 players to start");

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
    room.gameState = engine.createInitialState(
      playerIds,
      room.settings,
      teams,
      usernames,
    );
    room.status = "playing";
    room.matchId = crypto.randomUUID();

    // Execute START_GAME action (deals cards, transitions to FIRST_DEAL)
    const startAction: GameAction = {
      type: "START_GAME",
      playerId: hostId,
      payload: {},
    };
    const result = engine.handleAction(room.gameState, startAction);
    room.gameState = result.newState;
    this.processBroadcasts(room.id, result);

    // Let any bots act on the opening phase (e.g. weak-hand / bidding).
    this.driveBots(room);

    return { room };
  }

  /** Handle a game action from a player. */
  handleGameAction(
    userId: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): { room: Room; result: ActionResult<unknown> } {
    const conn = this.connections.get(userId);
    if (!conn) throw new Error("Not connected to any room");

    const room = this.rooms.get(conn.roomId);
    if (!room) throw new Error("Room not found");
    if (room.status !== "playing") throw new Error("Game not in progress");
    if (!room.gameState) throw new Error("No game state");

    const engine = GameRegistry.getOrThrow(room.gameType);

    const action: GameAction = {
      type: actionType,
      playerId: userId,
      payload,
    };

    // Validate first
    const validation = engine.validateAction(room.gameState, action);
    if (!validation.valid) {
      throw new Error(validation.error ?? "Invalid action");
    }

    // Execute
    const result = engine.handleAction(room.gameState, action);
    room.gameState = result.newState;

    // Broadcast results
    this.processBroadcasts(room.id, result);

    // Check if game is complete
    if (engine.isComplete(result.newState)) {
      room.status = "finished";
    } else {
      // Advance any bots whose turn is now pending. If this action ended a
      // trick or the auction, give players a moment to see it first.
      const initialDelay = this.resultNeedsReview(result)
        ? REVIEW_DELAY_MS
        : BOT_ACTION_DELAY_MS;
      this.driveBots(room, initialDelay);
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
    const role: VisibilityRole = room.players.has(userId)
      ? "player"
      : "spectator";

    return engine.getVisibleState(room.gameState, userId, role);
  }

  // ---- Connection Management ----

  /** Handle a player disconnecting. */
  handleDisconnect(
    socketId: string,
  ): { userId: string; roomId: string } | null {
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

    // Spectators hold no seat: they simply leave, whatever the game status.
    if (room.spectators.has(disconnectedUserId)) {
      room.removeSpectator(disconnectedUserId);
      this.connections.delete(disconnectedUserId);
      this.emitter.emitToRoom(room.id, "SPECTATOR_LEFT", {
        spectatorId: disconnectedUserId,
      });
      return { userId: disconnectedUserId, roomId: conn.roomId };
    }

    // SPEC: spec-bc6000 — a seated player who drops mid-game keeps the seat
    // for RECONNECT_TIMEOUT_MS; when it lapses their team forfeits.
    if (room.status === "playing") {
      const player = room.players.get(disconnectedUserId);
      if (player) player.isConnected = false;

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
      this.emitter.emitToRoom(room.id, "PLAYER_DISCONNECTED", {
        playerId: disconnectedUserId,
        timeout: RECONNECT_TIMEOUT_MS,
      });
    } else {
      // If waiting, just remove the player
      room.removePlayer(disconnectedUserId);
      this.connections.delete(disconnectedUserId);

      this.emitter.emitToRoom(room.id, "PLAYER_LEFT", {
        playerId: disconnectedUserId,
      });
    }

    return { userId: disconnectedUserId, roomId: conn.roomId };
  }

  /**
   * Handle a player reconnecting to a room.
   *
   * SPEC: spec-95c801 — the client names its guestId and the roomCode; the
   * seat is restored only against a live reservation for that guest in that
   * room. The caller then sends the room (seat) and the visible state (hand).
   */
  handleReconnect(
    userId: string,
    roomCode: string,
    socketId: string,
  ): ReconnectResult {
    const roomId = this.roomsByCode.get(roomCode.toUpperCase());
    const room = roomId ? this.rooms.get(roomId) : undefined;
    if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };

    // A new socket can arrive before the server has noticed the old one drop
    // (a page refresh, a network blip). Retire the stale socket first, which
    // reserves the seat, then redeem that reservation like any other.
    let supersededSocketId: string | undefined;
    const conn = this.connections.get(userId);
    if (
      !this.reservations.has(userId) &&
      conn &&
      conn.roomId === room.id &&
      conn.socketId !== socketId &&
      room.status === "playing" &&
      room.players.has(userId)
    ) {
      supersededSocketId = conn.socketId;
      this.handleDisconnect(conn.socketId);
    }

    const reservation = this.reservations.get(userId);
    const player = room.players.get(userId);
    if (!reservation || reservation.roomId !== room.id || !player) {
      return { ok: false, reason: "NO_RESERVATION" };
    }

    clearTimeout(reservation.timeout);
    this.reservations.delete(userId);

    this.connections.set(userId, { socketId, userId, roomId: room.id });
    player.isConnected = true;

    this.emitter.emitToRoom(room.id, "PLAYER_RECONNECTED", {
      playerId: userId,
    });

    return { ok: true, room, seat: player.seat!, supersededSocketId };
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

  /**
   * Drive AI bots: repeatedly apply pending bot actions until it is a human's
   * turn (or the game ends). Runs asynchronously with a small delay between
   * actions so play feels natural, and re-broadcasts state after each move.
   */
  private driveBots(
    room: Room,
    initialDelay: number = BOT_ACTION_DELAY_MS,
  ): void {
    const engine = GameRegistry.getOrThrow(room.gameType);
    if (!engine.getBotAction || room.botIds.size === 0) return;

    const step = (iterations: number): void => {
      if (iterations > 60) return; // safety cap against unexpected loops
      if (room.status !== "playing" || !room.gameState) return;

      const botAction = engine.getBotAction!(
        room.gameState,
        Array.from(room.botIds),
      );
      if (!botAction) return; // nothing pending — a human must act

      // Guard: never crash the room on an unexpected illegal bot action.
      const validation = engine.validateAction(room.gameState, botAction);
      if (!validation.valid) return;

      const result = engine.handleAction(room.gameState, botAction);
      room.gameState = result.newState;
      this.processBroadcasts(room.id, result);
      this.broadcastVisibleState(room);

      if (engine.isComplete(result.newState)) {
        room.status = "finished";
        return;
      }

      // Pause longer after a trick / auction concludes so it can be reviewed.
      const nextDelay = this.resultNeedsReview(result)
        ? REVIEW_DELAY_MS
        : BOT_ACTION_DELAY_MS;
      setTimeout(() => step(iterations + 1), nextDelay);
    };

    setTimeout(() => step(0), initialDelay);
  }

  /** Whether an action result should trigger a review pause before advancing. */
  private resultNeedsReview(result: ActionResult<unknown>): boolean {
    return result.broadcasts.some((b) => REVIEW_EVENTS.has(b.event));
  }

  /** Send each connected player/spectator their personalized visible state. */
  private broadcastVisibleState(room: Room): void {
    for (const player of room.players.values()) {
      const socketId = this.connections.get(player.userId)?.socketId;
      if (!socketId) continue; // bots have no socket
      const visible = this.getVisibleState(player.userId);
      if (visible)
        this.emitter.emitToSocket(socketId, "GAME_STATE_UPDATED", visible);
    }
    for (const spectator of room.spectators.values()) {
      const socketId = this.connections.get(spectator.userId)?.socketId;
      if (!socketId) continue;
      const visible = this.getVisibleState(spectator.userId);
      if (visible)
        this.emitter.emitToSocket(socketId, "GAME_STATE_UPDATED", visible);
    }
  }

  /** Process broadcasts from an action result. */
  private processBroadcasts(
    roomId: string,
    result: ActionResult<unknown>,
  ): void {
    for (const broadcast of result.broadcasts) {
      if (broadcast.targetPlayerIds) {
        // Send to specific players
        const socketIds = broadcast.targetPlayerIds
          .map((pid) => this.connections.get(pid)?.socketId)
          .filter((s): s is string => !!s);
        this.emitter.emitToSockets(
          socketIds,
          broadcast.event,
          broadcast.payload,
        );
      } else if (broadcast.excludePlayerIds) {
        // Send to all except specific players
        const excludeSocketIds = broadcast.excludePlayerIds
          .map((pid) => this.connections.get(pid)?.socketId)
          .filter((s): s is string => !!s);
        for (const socketId of excludeSocketIds) {
          this.emitter.emitToRoomExcept(
            roomId,
            socketId,
            broadcast.event,
            broadcast.payload,
          );
        }
      } else {
        // Broadcast to whole room
        this.emitter.emitToRoom(roomId, broadcast.event, broadcast.payload);
      }
    }
  }

  /** Handle reconnect timeout (forfeit). */
  private handleReconnectTimeout(userId: string): void {
    const reservation = this.reservations.get(userId);
    if (!reservation) return;

    this.reservations.delete(userId);

    const room = this.rooms.get(reservation.roomId);
    if (!room) return;

    const username = room.players.get(userId)?.username ?? "Unknown player";
    this.forfeitMatch(room, userId, `${username} failed to reconnect`);
  }

  /**
   * SPEC: spec-bc6000 — the player's team forfeits, the match ends and the
   * room is cleaned up.
   */
  private forfeitMatch(room: Room, userId: string, reason: string): void {
    const forfeitedTeam = room.players.get(userId)?.team ?? null;

    room.status = "finished";
    this.emitter.emitToRoom(room.id, "GAME_FINISHED", {
      winner: "forfeit",
      reason,
      forfeitedPlayerId: userId,
      forfeitedTeam,
      winningTeam: forfeitedTeam === null ? null : 1 - forfeitedTeam,
    });

    this.cleanupRoom(room.id);
  }

  /** Clean up a room: its reservations, connections and lookups. */
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

    // Nobody is in a room that no longer exists
    for (const [userId, conn] of this.connections.entries()) {
      if (conn.roomId === roomId) this.connections.delete(userId);
    }

    this.roomsByCode.delete(room.code);
    this.rooms.delete(roomId);
  }
}
