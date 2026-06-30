import type { RoomSettings, GameType } from '@brotherhood/shared';

/**
 * An action submitted by a player. The engine interprets this based on
 * the current state (e.g., PLACE_BID, PLAY_CARD, SELECT_TRUMP).
 */
export interface GameAction {
  type: string;
  playerId: string;
  payload: Record<string, unknown>;
}

/**
 * A broadcast to emit to the room (or specific players).
 */
export interface Broadcast {
  event: string;
  payload: Record<string, unknown>;
  /** If set, only send to these player ids. Otherwise broadcast to whole room. */
  targetPlayerIds?: string[];
  /** If set, exclude these player ids from the broadcast. */
  excludePlayerIds?: string[];
}

/**
 * Result of handling an action.
 */
export interface ActionResult<TState> {
  newState: TState;
  broadcasts: Broadcast[];
  errors?: { code: string; message: string }[];
}

/**
 * A player role for visibility filtering.
 */
export type VisibilityRole = 'player' | 'spectator';

/**
 * The core interface every game must implement.
 *
 * TState = the full game state type (engine-specific)
 * The engine is responsible for ALL game logic. The runtime only manages
 * rooms, connections, and delegates actions to the engine.
 */
export interface GameEngine<TState = unknown> {
  /** Unique game type identifier (e.g., "twenty-nine", "poker") */
  readonly gameType: GameType;

  /**
   * Create the initial game state for a new match.
   * Called when the host starts the game.
   * @param playerIds Player IDs in seat order
   * @param settings Room settings
   * @param teams Team assignments for each player (same order as playerIds)
   * @param usernames Player usernames (same order as playerIds)
   */
  createInitialState(
    playerIds: string[],
    settings: RoomSettings,
    teams?: (0 | 1)[],
    usernames?: string[]
  ): TState;

  /**
   * Handle a player action and return the new state + broadcasts.
   * This is the main entry point for all game logic.
   */
  handleAction(
    state: TState,
    action: GameAction
  ): ActionResult<TState>;

  /**
   * Validate whether an action is legal in the current state.
   * Used for pre-validation before handleAction (optional optimization).
   */
  validateAction(
    state: TState,
    action: GameAction
  ): { valid: boolean; error?: string };

  /**
   * Get the state visible to a specific player/spectator.
   * Hides secret information (opponent hands, hidden trump, etc.)
   */
  getVisibleState(
    state: TState,
    playerId: string,
    role: VisibilityRole
  ): Record<string, unknown>;

  /**
   * Get the current game phase/step.
   * Used by the runtime for logging and status display.
   */
  getPhase(state: TState): string;

  /**
   * Check if the game is over.
   */
  isComplete(state: TState): boolean;

  /**
   * Get the current player whose turn it is.
   * Returns null if no specific player should act (e.g., between phases).
   */
  getCurrentPlayer(state: TState): string | null;

  /**
   * Handle a player disconnection.
   * The engine decides what happens (e.g., pause, forfeit, AI takeover).
   */
  handleDisconnect(state: TState, playerId: string): ActionResult<TState>;

  /**
   * Handle a player reconnection.
   */
  handleReconnect(state: TState, playerId: string): ActionResult<TState>;
}
