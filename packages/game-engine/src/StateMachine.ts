/**
 * A generic finite state machine.
 *
 * States are strings, transitions are defined as a map of
 * state -> allowed next states.
 */
export class StateMachine {
  private currentState: string;
  private transitions: Map<string, Set<string>>;
  private onTransition?: (from: string, to: string) => void;

  constructor(
    initialState: string,
    transitions: Record<string, string[]>,
    onTransition?: (from: string, to: string) => void
  ) {
    this.currentState = initialState;
    this.transitions = new Map();
    this.onTransition = onTransition;

    for (const [state, targets] of Object.entries(transitions)) {
      this.transitions.set(state, new Set(targets));
    }
  }

  /** Get the current state. */
  getState(): string {
    return this.currentState;
  }

  /**
   * Attempt to transition to a new state.
   * Throws if the transition is not allowed.
   */
  transition(to: string): void {
    const allowed = this.transitions.get(this.currentState);
    if (!allowed?.has(to)) {
      throw new Error(
        `Invalid transition: ${this.currentState} -> ${to}. ` +
        `Allowed: [${Array.from(allowed ?? []).join(', ')}]`
      );
    }
    const from = this.currentState;
    this.currentState = to;
    this.onTransition?.(from, to);
  }

  /**
   * Check if a transition is valid without performing it.
   */
  canTransition(to: string): boolean {
    const allowed = this.transitions.get(this.currentState);
    return allowed?.has(to) ?? false;
  }

  /**
   * Get all valid next states from the current state.
   */
  getValidTransitions(): string[] {
    return Array.from(this.transitions.get(this.currentState) ?? []);
  }
}
