"use client";

import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/common/Button";

export function WeakHandPanel() {
  const { weakHandPlayer, myPlayer, cancelWeakHand, keepWeakHand } = useGame();

  if (!weakHandPlayer || weakHandPlayer !== myPlayer?.id) {
    return null;
  }

  return (
    <div
      data-testid="weak-hand-panel"
      className="w-72 max-w-[85vw] rounded-xl border border-yellow-500/30 bg-black/70 p-4 backdrop-blur-md"
    >
      <h3 className="mb-2 text-sm font-medium text-yellow-400">
        ⚠️ Weak Hand Detected
      </h3>
      <p className="mb-3 text-xs text-white/50">
        Your hand has 0 points. You can request a re-deal or keep it.
      </p>
      <div className="flex gap-2">
        <Button
          onClick={cancelWeakHand}
          data-testid="cancel-weak-hand-btn"
          variant="yellow"
          className="flex-1"
        >
          Re-deal
        </Button>
        <Button
          onClick={keepWeakHand}
          data-testid="keep-weak-hand-btn"
          variant="secondary"
          className="flex-1"
        >
          Keep Hand
        </Button>
      </div>
    </div>
  );
}
