'use client';

import { useGame } from '@/hooks/useGame';

export function ScoreBoard() {
  const { score, double: doubleInfo, bidding, trump, marriage } = useGame();

  return (
    <div className="flex items-center gap-6">
      {/* Team scores */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-xs text-gray-500">Team A</div>
          <div className="text-lg font-bold text-blue-400">
            {score.matchPoints[0]}
          </div>
          <div className="text-xs text-gray-600">
            Sets: {score.sets[0]}
          </div>
        </div>
        <div className="text-gray-600">vs</div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Team B</div>
          <div className="text-lg font-bold text-red-400">
            {score.matchPoints[1]}
          </div>
          <div className="text-xs text-gray-600">
            Sets: {score.sets[1]}
          </div>
        </div>
      </div>

      {/* Bid info */}
      {bidding.currentBid && (
        <div className="text-center">
          <div className="text-xs text-gray-500">Bid</div>
          <div className="text-sm font-medium text-yellow-400">
            {bidding.currentBid}
          </div>
        </div>
      )}

      {/* Trump - hidden until revealed (declarer already knows) */}
      {trump.type === 'joker' && (
        <div className="text-center">
          <div className="text-xs text-gray-500">Trump</div>
          <div className="text-sm font-medium text-green-400">No Trump</div>
        </div>
      )}
      {trump.type && trump.type !== 'joker' && (
        <div className="text-center">
          <div className="text-xs text-gray-500">Trump</div>
          <div className="text-sm font-medium text-green-400">
            {trump.isRevealed
              ? trump.seventhCard
                ? `${trump.seventhCard.rank} of ${trump.suit}`
                : trump.suit
              : 'Hidden'}
          </div>
        </div>
      )}

      {/* Multiplier */}
      {doubleInfo.multiplier > 1 && (
        <div className="text-center">
          <div className="text-xs text-gray-500">Multiplier</div>
          <div className="text-sm font-bold text-orange-400">
            ×{doubleInfo.multiplier}
          </div>
        </div>
      )}

      {/* Marriage */}
      {marriage && (
        <div className="text-center">
          <div className="text-xs text-gray-500">Marriage</div>
          <div className="text-sm font-medium text-purple-400">
            {marriage.suit} → {marriage.effectiveBid}
          </div>
        </div>
      )}
    </div>
  );
}
