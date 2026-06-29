'use client';

import { useGame } from '@/hooks/useGame';

export function DoublePanel() {
  const { double: doubleInfo, declareDouble, declareRedouble, declareFullset } = useGame();

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-400">Double Phase</h3>

      <div className="mb-3 text-center">
        <span className="text-xs text-gray-500">Current: </span>
        <span className="font-bold text-orange-400 capitalize">
          {doubleInfo.level} (×{doubleInfo.multiplier})
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {doubleInfo.level === 'normal' && (
          <button
            onClick={declareDouble}
            className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 transition-colors"
          >
            🔥 Double (×2)
          </button>
        )}
        {doubleInfo.level === 'double' && (
          <button
            onClick={declareRedouble}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 transition-colors"
          >
            🔥🔥 Re-Double (×4)
          </button>
        )}
        {doubleInfo.level === 'redouble' && (
          <button
            onClick={declareFullset}
            className="rounded-lg bg-red-800 px-4 py-2 font-semibold text-white hover:bg-red-900 transition-colors"
          >
            💀 Full Set (×6)
          </button>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-gray-600">
        Or click "Pass" on your turn to skip
      </p>
    </div>
  );
}
