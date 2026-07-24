'use client';

import { useGame } from '@/hooks/useGame';
import { useSocketStore } from '@/stores/socketStore';

export function ScoringPanel() {
  const { score, bidding, double: doubleInfo, marriage, myPlayer, startNextHand } = useGame();
  const guestId = useSocketStore((s) => s.guestId);

  const bidSuccess = score.lastBidResult === 'success';
  const bidValue = bidding.currentBid ?? 0;
  const multiplier = doubleInfo.multiplier;
  const effectiveBid = marriage?.effectiveBid ?? bidValue;

  return (
    <div data-testid="scoring-panel" className="rounded-xl border border-yellow-500/30 bg-black/70 p-6 text-center backdrop-blur-md">
      <h2 className="mb-4 text-xl font-bold text-yellow-400">Hand Complete!</h2>

      <div className="mb-4">
        <div className="text-sm text-white/60">
          Bid: {bidValue} {multiplier > 1 ? `(×${multiplier})` : ''}
        </div>
        {marriage && (
          <div className="mt-1 text-xs text-purple-400">
            Marriage ({marriage.suit}) → Effective: {effectiveBid}
          </div>
        )}
        <div className={`mt-1 text-lg font-bold ${bidSuccess ? 'text-green-400' : 'text-red-400'}`}>
          {bidSuccess ? 'Bid Successful!' : 'Bid Failed!'}
        </div>
      </div>

      <div className="mb-4 flex justify-center gap-8">
        <div>
          <div className="text-xs text-blue-300/60">Team A Points</div>
          <div className="text-lg font-bold text-blue-400">{score.teamPoints[0]}</div>
        </div>
        <div>
          <div className="text-xs text-red-300/60">Team B Points</div>
          <div className="text-lg font-bold text-red-400">{score.teamPoints[1]}</div>
        </div>
      </div>

      <div className="mb-4 flex justify-center gap-8 border-t border-white/10 pt-4">
        <div>
          <div className="text-xs text-blue-300/60">Team A Match</div>
          <div className="text-lg font-bold text-blue-400">{score.matchPoints[0]}</div>
          <div className="text-[10px] text-white/30">Sets: {score.sets[0]}</div>
        </div>
        <div>
          <div className="text-xs text-red-300/60">Team B Match</div>
          <div className="text-lg font-bold text-red-400">{score.matchPoints[1]}</div>
          <div className="text-[10px] text-white/30">Sets: {score.sets[1]}</div>
        </div>
      </div>

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
