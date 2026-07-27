"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/common/Button";

export function BidPanel() {
  const { bidding, placeBid, passBid, callBid, myPlayer, isMyTurn, players } =
    useGame();
  const [bidValue, setBidValue] = useState(
    bidding.currentBid ? bidding.currentBid + 1 : 16,
  );

  const minBid = bidding.currentBid ? bidding.currentBid + 1 : 16;
  const maxBid = 28;

  const isChallenger = bidding.currentChallenger === myPlayer?.id;
  const isHighestBidder = bidding.highestBidder === myPlayer?.id;
  const hasNoBidYet = !bidding.highestBidder;

  // This player's own most recent numeric bid, used to block calling the same
  // value repeatedly (you may only call a bid higher than one you already made).
  const myLastBid =
    [...bidding.bids]
      .reverse()
      .find((b) => b.playerId === myPlayer?.id && b.bid != null)?.bid ?? null;

  const canBid = isMyTurn && (isChallenger || hasNoBidYet);
  const canCall =
    isMyTurn &&
    !hasNoBidYet &&
    !isHighestBidder &&
    bidding.currentBid !== null &&
    (myLastBid === null || myLastBid < bidding.currentBid);
  const canPass = isMyTurn && (isChallenger || isHighestBidder);

  // Work out who this player is bidding against, so the duel is legible.
  const nameOf = (id: string | null | undefined) =>
    id ? (players.find((p) => p.id === id)?.username ?? "Opponent") : null;
  const opponentName = isChallenger
    ? nameOf(bidding.highestBidder)
    : isHighestBidder
      ? nameOf(bidding.currentChallenger)
      : nameOf(bidding.highestBidder);

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
      className="w-72 max-w-[85vw] rounded-xl border border-white/20 bg-black/60 p-4 backdrop-blur-md"
    >
      <h3 className="mb-3 text-sm font-medium text-white/60">Bidding Duel</h3>

      {bidding.currentBid && (
        <div className="mb-3 text-center">
          <span className="text-xs text-white/40">Current bid: </span>
          <span className="font-bold text-yellow-400">
            {bidding.currentBid}
          </span>
          {bidding.highestBidder && (
            <span className="text-xs text-white/40">
              {" "}
              held by{" "}
              <span className="font-medium text-yellow-300/90">
                {bidding.highestBidder === myPlayer?.id
                  ? "you"
                  : nameOf(bidding.highestBidder)}
              </span>
            </span>
          )}
        </div>
      )}

      {opponentName && !hasNoBidYet && (
        <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-orange-400/30 bg-orange-500/10 px-2 py-1.5 text-center">
          <span className="text-xs text-white/50">Bidding against</span>
          <span className="text-sm font-semibold text-orange-300">
            {opponentName}
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
