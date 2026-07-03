'use client';

import { useState } from 'react';
import { useGame } from '@/hooks/useGame';

export function BidPanel() {
  const { bidding, placeBid, passBid, callBid, myPlayer, isMyTurn } = useGame();
  const [bidValue, setBidValue] = useState(bidding.currentBid ? bidding.currentBid + 1 : 16);

  const minBid = bidding.currentBid ? bidding.currentBid + 1 : 16;
  const maxBid = 28;

  const isChallenger = bidding.currentChallenger === myPlayer?.id;
  const isHighestBidder = bidding.highestBidder === myPlayer?.id;
  const hasNoBidYet = !bidding.highestBidder;

  // Only show action buttons when it's actually this player's turn
  const canBid = isMyTurn && (isChallenger || hasNoBidYet);
  const canCall = isMyTurn && isHighestBidder && bidding.currentBid !== null;
  const canPass = isMyTurn && (isChallenger || isHighestBidder);

  // Update bid value when current bid changes
  if (bidding.currentBid && bidValue <= bidding.currentBid) {
    setBidValue(bidding.currentBid + 1);
  }

  return (
    <div data-testid="bid-panel" className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-400">Bidding Duel</h3>

      {/* Current high bid */}
      {bidding.currentBid && (
        <div className="mb-3 text-center">
          <span className="text-xs text-gray-500">Current bid: </span>
          <span className="font-bold text-yellow-400">{bidding.currentBid}</span>
        </div>
      )}

      {/* Priority indicator */}
      <div className="mb-3 text-center">
        {hasNoBidYet ? (
          <span className="text-xs text-gray-500">Open the bidding (min: {minBid})</span>
        ) : isChallenger && isMyTurn ? (
          <span className="text-xs text-green-400">Your turn to respond</span>
        ) : isChallenger ? (
          <span className="text-xs text-gray-500">Waiting for your turn...</span>
        ) : isHighestBidder && isMyTurn ? (
          <span className="text-xs text-blue-400">Your turn to respond</span>
        ) : isHighestBidder ? (
          <span className="text-xs text-blue-400">You hold the bid</span>
        ) : (
          <span className="text-xs text-gray-500">Waiting for others...</span>
        )}
      </div>

      {/* Bid slider - only show when can bid */}
      {canBid && (
        <div className="mb-4">
          <input
            type="range"
            min={minBid}
            max={maxBid}
            value={bidValue}
            onChange={(e) => setBidValue(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>{minBid}</span>
            <span className="text-lg font-bold text-white">{bidValue}</span>
            <span>{maxBid}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={passBid}
          data-testid="pass-bid-btn"
          disabled={!canPass}
          className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pass
        </button>

        {canCall && (
          <button
            onClick={callBid}
            data-testid="call-bid-btn"
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Call ({bidding.currentBid})
          </button>
        )}

        {canBid && (
          <button
            onClick={() => placeBid(bidValue)}
            data-testid="place-bid-btn"
            className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 font-semibold text-white hover:bg-yellow-700 transition-colors"
          >
            {hasNoBidYet ? `Bid ${bidValue}` : `Raise to ${bidValue}`}
          </button>
        )}
      </div>
    </div>
  );
}
