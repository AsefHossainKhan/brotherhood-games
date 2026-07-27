"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/common/Button";

export function BidPanel() {
  const { bidding, placeBid, passBid, callBid, myPlayer, isMyTurn } = useGame();
  const [bidValue, setBidValue] = useState(
    bidding.currentBid ? bidding.currentBid + 1 : 16,
  );

  const minBid = bidding.currentBid ? bidding.currentBid + 1 : 16;
  const maxBid = 28;

  const isChallenger = bidding.currentChallenger === myPlayer?.id;
  const isHighestBidder = bidding.highestBidder === myPlayer?.id;
  const hasNoBidYet = !bidding.highestBidder;

  const canBid = isMyTurn && (isChallenger || hasNoBidYet);
  const canCall = isMyTurn && isHighestBidder && bidding.currentBid !== null;
  const canPass = isMyTurn && (isChallenger || isHighestBidder);

  // Keep the selected bid at or above the current minimum when the bid changes.
  useEffect(() => {
    setBidValue((v) =>
      bidding.currentBid && v <= bidding.currentBid
        ? bidding.currentBid + 1
        : v,
    );
  }, [bidding.currentBid]);

  return (
    <div
      data-testid="bid-panel"
      className="rounded-xl border border-white/20 bg-black/60 p-4 backdrop-blur-md"
    >
      <h3 className="mb-3 text-sm font-medium text-white/60">Bidding Duel</h3>

      {bidding.currentBid && (
        <div className="mb-3 text-center">
          <span className="text-xs text-white/40">Current bid: </span>
          <span className="font-bold text-yellow-400">
            {bidding.currentBid}
          </span>
        </div>
      )}

      <div className="mb-3 text-center">
        {hasNoBidYet ? (
          <span className="text-xs text-white/40">
            Open the bidding (min: {minBid})
          </span>
        ) : isChallenger && isMyTurn ? (
          <span className="text-xs text-green-400">Your turn to respond</span>
        ) : isChallenger ? (
          <span className="text-xs text-white/40">
            Waiting for your turn...
          </span>
        ) : isHighestBidder && isMyTurn ? (
          <span className="text-xs text-blue-400">Your turn to respond</span>
        ) : isHighestBidder ? (
          <span className="text-xs text-blue-400">You hold the bid</span>
        ) : (
          <span className="text-xs text-white/40">Waiting for others...</span>
        )}
      </div>

      {canBid && (
        <div className="mb-4">
          <input
            type="range"
            min={minBid}
            max={maxBid}
            value={bidValue}
            onChange={(e) => setBidValue(parseInt(e.target.value))}
            className="w-full accent-yellow-500"
          />
          <div className="mt-1 flex justify-between text-xs text-white/40">
            <span>{minBid}</span>
            <span className="text-lg font-bold text-white">{bidValue}</span>
            <span>{maxBid}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={passBid}
          data-testid="pass-bid-btn"
          disabled={!canPass}
          variant="secondary"
          className="flex-1"
        >
          Pass
        </Button>

        {canCall && (
          <Button
            onClick={callBid}
            data-testid="call-bid-btn"
            variant="blue"
            className="flex-1"
          >
            Call ({bidding.currentBid})
          </Button>
        )}

        {canBid && (
          <Button
            onClick={() => placeBid(bidValue)}
            data-testid="place-bid-btn"
            variant="yellow"
            className="flex-1"
          >
            {hasNoBidYet ? `Bid ${bidValue}` : `Raise to ${bidValue}`}
          </Button>
        )}
      </div>
    </div>
  );
}
