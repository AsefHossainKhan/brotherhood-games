'use client';

import { useGame } from '@/hooks/useGame';
import { useSocketStore } from '@/stores/socketStore';

export function ScoringPanel() {
  const { score, bidding, double: doubleInfo, myPlayer, startNextHand } = useGame();
  const guestId = useSocketStore((s) => s.guestId);

  const isHost = myPlayer?.isDealer; // simplified: dealer is first player, often host
  const bidSuccess = score.lastBidResult === 'success';
  const bidValue = bidding.currentBid ?? 0;
  const multiplier = doubleInfo.multiplier;

  return (
    <div data-testid="scoring-panel" className="rounded-lg border border-yellow-600 bg-gray-800 p-6 text-center">
      <h2 className="mb-4 text-xl font-bold text-yellow-400">Hand Complete!</h2>

      {/* Bid result */}
      <div className="mb-4">
        <div className="text-sm text-gray-400">Bid: {bidValue} {multiplier > 1 ? `(×${multiplier})` : ''}</div>
        <div className={`mt-1 text-lg font-bold ${bidSuccess ? 'text-green-400' : 'text-red-400'}`}>
          {bidSuccess ? 'Bid Successful!' : 'Bid Failed!'}
        </div>
      </div>

      {/* Team points this hand */}
      <div className="mb-4 flex justify-center gap-8">
        <div>
          <div className="text-xs text-gray-500">Team A Points</div>
          <div className="text-lg font-bold text-blue-400">{score.teamPoints[0]}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Team B Points</div>
          <div className="text-lg font-bold text-red-400">{score.teamPoints[1]}</div>
        </div>
      </div>

      {/* Overall scores */}
      <div className="mb-4 flex justify-center gap-8 border-t border-gray-700 pt-4">
        <div>
          <div className="text-xs text-gray-500">Team A Match</div>
          <div className="text-lg font-bold text-blue-400">{score.matchPoints[0]}</div>
          <div className="text-xs text-gray-600">Sets: {score.sets[0]}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Team B Match</div>
          <div className="text-lg font-bold text-red-400">{score.matchPoints[1]}</div>
          <div className="text-xs text-gray-600">Sets: {score.sets[1]}</div>
        </div>
      </div>

      {/* Next hand button */}
      <button
        onClick={startNextHand}
        data-testid="next-hand-btn"
        className="rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white hover:bg-green-700 transition-colors"
      >
        Next Hand
      </button>
    </div>
  );
}
