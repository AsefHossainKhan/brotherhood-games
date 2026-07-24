'use client';

import { useGame } from '@/hooks/useGame';

export function DoublePanel() {
  const { double: doubleInfo, declareDouble, declareRedouble, declareFullset, passDouble, isMyTurn } = useGame();

  if (!isMyTurn) {
    return (
      <div className="rounded-xl border border-white/20 bg-black/60 p-4 backdrop-blur-md">
        <h3 className="mb-3 text-sm font-medium text-white/60">Double Phase</h3>
        <div className="mb-3 text-center">
          <span className="text-xs text-white/40">Current: </span>
          <span className="font-bold text-orange-400 capitalize">
            {doubleInfo.level} (×{doubleInfo.multiplier})
          </span>
        </div>
        <p className="text-center text-sm text-white/40">Waiting for other players...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/20 bg-black/60 p-4 backdrop-blur-md">
      <h3 className="mb-3 text-sm font-medium text-white/60">Double Phase</h3>

      <div className="mb-3 text-center">
        <span className="text-xs text-white/40">Current: </span>
        <span className="font-bold text-orange-400 capitalize">
          {doubleInfo.level} (×{doubleInfo.multiplier})
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {doubleInfo.level === 'normal' && (
          <button
            onClick={declareDouble}
            data-testid="double-btn"
            className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 transition-colors"
          >
            🔥 Double (×2)
          </button>
        )}
        {doubleInfo.level === 'double' && (
          <button
            onClick={declareRedouble}
            data-testid="redouble-btn"
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 transition-colors"
          >
            🔥🔥 Re-Double (×4)
          </button>
        )}
        {doubleInfo.level === 'redouble' && (
          <button
            onClick={declareFullset}
            data-testid="fullset-btn"
            className="rounded-lg bg-red-800 px-4 py-2 font-semibold text-white hover:bg-red-900 transition-colors"
          >
            💀 Full Set (×6)
          </button>
        )}

        <button
          onClick={passDouble}
          data-testid="pass-double-btn"
          className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white/70 hover:bg-white/10 transition-colors"
        >
          Pass
        </button>
      </div>
    </div>
  );
}
