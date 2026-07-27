import type { RoomSettings, GameType, RoomPlayer, Spectator, RoomStatus } from '@brotherhood/shared';
import { DEFAULT_ROOM_SETTINGS, ROOM_CODE_LENGTH, ROOM_CODE_CHARS } from '@brotherhood/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory room representation.
 * Persisted to DB for durability, but the runtime operates on this in-memory model.
 */
export class Room {
  public readonly id: string;
  public readonly code: string;
  public readonly gameType: GameType;
  public readonly hostId: string;
  public readonly createdAt: Date;

  public status: RoomStatus = 'waiting';
  public settings: RoomSettings;
  public players: Map<string, RoomPlayer> = new Map();
  public spectators: Map<string, Spectator> = new Map();

  /** Ids of AI-controlled players in this room. */
  public botIds: Set<string> = new Set();

  /** In-memory game state (set when game starts) */
  public gameState: unknown = null;

  /** Match id for current game */
  public matchId: string | null = null;

  constructor(gameType: GameType, hostId: string, settings?: Partial<RoomSettings>) {
    this.id = uuidv4();
    this.code = Room.generateCode();
    this.gameType = gameType;
    this.hostId = hostId;
    this.createdAt = new Date();
    this.settings = { ...DEFAULT_ROOM_SETTINGS, ...settings };
  }

  /** Generate a random room code. */
  static generateCode(): string {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
    }
    return code;
  }

  /** Add a player to a seat. Returns the seat number. */
  addPlayer(userId: string, username: string, seat?: number): RoomPlayer {
    if (this.players.size >= 4) {
      throw new Error('Room is full');
    }

    // Auto-assign seat if not specified
    const assignedSeat = seat ?? this.getNextAvailableSeat();
    if (assignedSeat === -1) {
      throw new Error('No available seats');
    }

    const player: RoomPlayer = {
      id: uuidv4(),
      userId,
      username,
      seat: assignedSeat,
      team: (assignedSeat % 2) as 0 | 1, // Default team based on seat
      isConnected: true,
      joinedAt: new Date().toISOString(),
      isBot: this.botIds.has(userId),
    };

    this.players.set(userId, player);
    return player;
  }

  /** Add an AI bot as a player. Returns the created player. */
  addBot(userId: string, username: string, seat?: number): RoomPlayer {
    this.botIds.add(userId);
    try {
      return this.addPlayer(userId, username, seat);
    } catch (err) {
      this.botIds.delete(userId);
      throw err;
    }
  }

  /** Whether a user id is an AI bot. */
  isBot(userId: string): boolean {
    return this.botIds.has(userId);
  }

  /** Remove a player. */
  removePlayer(userId: string): void {
    this.players.delete(userId);
    this.botIds.delete(userId);
  }

  /** Add a spectator. */
  addSpectator(userId: string, username: string): Spectator {
    if (!this.settings.allowSpectators) {
      throw new Error('Spectators are not allowed in this room');
    }

    const spectator: Spectator = {
      id: uuidv4(),
      userId,
      username,
      joinedAt: new Date().toISOString(),
    };

    this.spectators.set(userId, spectator);
    return spectator;
  }

  /** Remove a spectator. */
  removeSpectator(userId: string): void {
    this.spectators.delete(userId);
  }

  /** Change a player's team. Validates that the team isn't full (max 2 per team). */
  changeTeam(userId: string, team: 0 | 1): void {
    const player = this.players.get(userId);
    if (!player) throw new Error('Player not found in room');
    if (this.status !== 'waiting') throw new Error('Cannot change team after game starts');

    // Count players on the target team (excluding this player)
    const teamCount = Array.from(this.players.values()).filter(
      (p) => p.userId !== userId && p.team === team
    ).length;

    if (teamCount >= 2) throw new Error(`Team ${team === 0 ? 'A' : 'B'} is full`);

    player.team = team;
  }

  /** Change a player's seat. Validates seat availability. */
  changeSeat(userId: string, seat: number): void {
    const player = this.players.get(userId);
    if (!player) throw new Error('Player not found in room');
    if (this.status !== 'waiting') throw new Error('Cannot change seat after game starts');
    if (seat < 0 || seat > 3) throw new Error('Invalid seat number');

    // Check if seat is taken by another player
    const takenBy = Array.from(this.players.values()).find(
      (p) => p.userId !== userId && p.seat === seat
    );
    if (takenBy) throw new Error(`Seat ${seat + 1} is already taken`);

    player.seat = seat;
    // Also update team to match seat convention
    player.team = (seat % 2) as 0 | 1;
  }

  /** Get the next available seat number (0-3), or -1 if full. */
  private getNextAvailableSeat(): number {
    const taken = new Set(
      Array.from(this.players.values())
        .map((p) => p.seat)
        .filter((s): s is number => s !== null)
    );
    for (let i = 0; i < 4; i++) {
      if (!taken.has(i)) return i;
    }
    return -1;
  }

  /** Get all player ids in seat order. */
  getPlayerIdsInSeatOrder(): string[] {
    return Array.from(this.players.values())
      .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0))
      .map((p) => p.userId);
  }

  /** Check if all 4 seats are filled. */
  isFull(): boolean {
    return this.players.size === 4;
  }

  /** Check if a user is the host. */
  isHost(userId: string): boolean {
    return this.hostId === userId;
  }

  /** Transfer host to a new user. */
  transferHost(newHostId: string): void {
    (this as { hostId: string }).hostId = newHostId;
  }

  /** Check if a user is in the room (player or spectator). */
  hasUser(userId: string): boolean {
    return this.players.has(userId) || this.spectators.has(userId);
  }

  /** Get a user's role. */
  getUserRole(userId: string): 'player' | 'spectator' | null {
    if (this.players.has(userId)) return 'player';
    if (this.spectators.has(userId)) return 'spectator';
    return null;
  }

  /** Serialize for sending to clients. */
  toJSON() {
    return {
      id: this.id,
      code: this.code,
      gameType: this.gameType,
      status: this.status,
      hostId: this.hostId,
      players: Array.from(this.players.values()),
      spectators: Array.from(this.spectators.values()),
      settings: this.settings,
    };
  }
}
