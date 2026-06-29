import type { GameType } from '@brotherhood/shared';
import type { GameEngine } from './GameEngine';

/**
 * Registry of all available game engines.
 * Games register themselves here so the runtime can look them up by type.
 */
class GameRegistryClass {
  private engines = new Map<string, GameEngine>();

  /**
   * Register a game engine.
   */
  register(engine: GameEngine): void {
    if (this.engines.has(engine.gameType)) {
      console.warn(`Game engine "${engine.gameType}" is already registered. Overwriting.`);
    }
    this.engines.set(engine.gameType, engine);
    console.log(`Game engine registered: ${engine.gameType}`);
  }

  /**
   * Get a game engine by type.
   */
  get(gameType: GameType): GameEngine | undefined {
    return this.engines.get(gameType);
  }

  /**
   * Get a game engine by type, throwing if not found.
   */
  getOrThrow(gameType: GameType): GameEngine {
    const engine = this.engines.get(gameType);
    if (!engine) {
      throw new Error(`No game engine registered for type: ${gameType}`);
    }
    return engine;
  }

  /**
   * Check if a game type is registered.
   */
  has(gameType: GameType): boolean {
    return this.engines.has(gameType);
  }

  /**
   * List all registered game types.
   */
  list(): GameType[] {
    return Array.from(this.engines.keys()) as GameType[];
  }
}

/** Singleton instance */
export const GameRegistry = new GameRegistryClass();
