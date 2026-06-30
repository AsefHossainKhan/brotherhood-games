'use client';

import { useState } from 'react';
import { useGame } from '@/hooks/useGame';

export function BidPanel() {
  const { bidding, placeBid, passBid } = useGame();
  const [bidValue, setBidValue] = useState(bidding.highestBid ? bidding.highestBid + 1 : 16);

  const minBid = bidding.highestBid ? bidding.highestBid + 1 : 16;
  const maxBid = 28;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-400">Your Bid</h3>

      {/* Current high bid */}
      {bidding.highestBid && (
        <div className="mb-3 text-center">
          <span className="text-xs text-gray-500">Current high: </span>
          <span className="font-bold text-yellow-400">{bidding.highestBid}</span>
        </div>
      )}

      {/* Bid slider */}
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

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={passBid}
          data-testid="pass-bid-btn"
          className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Pass
        </button>
        <button
          onClick={() => placeBid(bidValue)}
          data-testid="place-bid-btn"
          className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 font-semibold text-white hover:bg-yellow-700 transition-colors"
        >
          Bid {bidValue}
        </button>
      </div>
    </div>
  );
}
