'use client';

import { useGame } from '@/hooks/useGame';

/**
 * Panel shown when a weak hand is detected (0 points: no J, 9, A, 10).
 * The player can choose to cancel (re-deal) or keep the hand.
 */
export function WeakHandPanel() {
  const { weakHandPlayer, myPlayer, cancelWeakHand, keepWeakHand } = useGame();

  // Only show for the player with the weak hand
  if (!weakHandPlayer || weakHandPlayer !== myPlayer?.id) {
    return null;
  }

  return (
    <div
      data-testid="weak-hand-panel"
      className="rounded-lg border border-yellow-600 bg-yellow-900/30 p-4"
    >
      <h3 className="mb-2 text-sm font-medium text-yellow-400">
        ⚠️ Weak Hand Detected
      </h3>
      <p className="mb-3 text-xs text-gray-400">
        Your hand has 0 points (no J, 9, A, or 10).
        You can request a re-deal or keep this hand.
      </p>
      <div className="flex gap-2">
        <button
          onClick={cancelWeakHand}
          data-testid="cancel-weak-hand-btn"
          className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 font-semibold text-white hover:bg-yellow-700 transition-colors"
        >
          Re-deal
        </button>
        <button
          onClick={keepWeakHand}
          data-testid="keep-weak-hand-btn"
          className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Keep Hand
        </button>
      </div>
    </div>
  );
}
