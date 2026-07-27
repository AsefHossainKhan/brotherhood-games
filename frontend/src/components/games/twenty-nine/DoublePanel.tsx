"use client";

import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/common/Button";

export function DoublePanel() {
  const {
    double: doubleInfo,
    declareDouble,
    declareRedouble,
    declareFullset,
    passDouble,
    isMyTurn,
  } = useGame();

  if (!isMyTurn) {
    return (
      <div className="w-72 max-w-[85vw] rounded-xl border border-white/20 bg-black/60 p-4 backdrop-blur-md">
        <h3 className="mb-3 text-sm font-medium text-white/60">Double Phase</h3>
        <div className="mb-3 text-center">
          <span className="text-xs text-white/40">Current: </span>
          <span className="font-bold text-orange-400 capitalize">
            {doubleInfo.level} (×{doubleInfo.multiplier})
          </span>
        </div>
        <p className="text-center text-sm text-white/40">
          Waiting for other players...
        </p>
      </div>
    );
  }

  return (
    <div className="w-72 max-w-[85vw] rounded-xl border border-white/20 bg-black/60 p-4 backdrop-blur-md">
      <h3 className="mb-3 text-sm font-medium text-white/60">Double Phase</h3>

      <div className="mb-3 text-center">
        <span className="text-xs text-white/40">Current: </span>
        <span className="font-bold text-orange-400 capitalize">
          {doubleInfo.level} (×{doubleInfo.multiplier})
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {doubleInfo.level === "normal" && (
          <Button
            onClick={declareDouble}
            data-testid="double-btn"
            variant="orange"
          >
            🔥 Double (×2)
          </Button>
        )}
        {doubleInfo.level === "double" && (
          <Button
            onClick={declareRedouble}
            data-testid="redouble-btn"
            variant="red"
          >
            🔥🔥 Re-Double (×4)
          </Button>
        )}
        {doubleInfo.level === "redouble" && (
          <Button
            onClick={declareFullset}
            data-testid="fullset-btn"
            variant="red"
            className="bg-red-800 hover:bg-red-900"
          >
            💀 Full Set (×6)
          </Button>
        )}

        <Button
          onClick={passDouble}
          data-testid="pass-double-btn"
          variant="secondary"
        >
          Pass
        </Button>
      </div>
    </div>
  );
}
