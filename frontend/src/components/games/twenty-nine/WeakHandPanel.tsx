'use client';

import { useGame } from '@/hooks/useGame';

export function WeakHandPanel() {
  const { weakHandPlayer, myPlayer, cancelWeakHand, keepWeakHand } = useGame();

  if (!weakHandPlayer || weakHandPlayer !== myPlayer?.id) {
    return null;
  }

  return (
    <div
      data-testid="weak-hand-panel"
      className="rounded-xl border border-yellow-500/30 bg-black/70 p-4 backdrop-blur-md"
    >
      <h3 className="mb-2 text-sm font-medium text-yellow-400">
        ⚠️ Weak Hand Detected
      </h3>
      <p className="mb-3 text-xs text-white/50">
        Your hand has 0 points. You can request a re-deal or keep it.
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
          className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white/70 hover:bg-white/10 transition-colors"
        >
          Keep Hand
        </button>
      </div>
    </div>
  );
}
