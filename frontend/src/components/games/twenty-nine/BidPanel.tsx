"use client";

import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/common/Button";

const OPEN_BID = 16;
const MAX_BID = 28;

export function BidPanel() {
  const { bidding, placeBid, passBid, callBid, myPlayer, isMyTurn, players } =
    useGame();

  const isChallenger = bidding.currentChallenger === myPlayer?.id;
  const isHighestBidder = bidding.highestBidder === myPlayer?.id;
  const hasNoBidYet = !bidding.highestBidder;

  // Opening bid: the first bidder opens at the minimum.
  const canOpen = isMyTurn && hasNoBidYet;

  // Response actions: Call raises by +1, Raise raises by +2. Both take the lead.
  const callValue = (bidding.currentBid ?? 0) + 1;
  const raiseValue = (bidding.currentBid ?? 0) + 2;
  const canRespond =
    isMyTurn &&
    !hasNoBidYet &&
    bidding.currentBid !== null &&
    !isHighestBidder;
  const canCall = canRespond && callValue <= MAX_BID;
  const canRaise = canRespond && raiseValue <= MAX_BID;
  const canPass = isMyTurn && (isChallenger || isHighestBidder);

  // Work out who this player is bidding against, so the duel is legible.
  const nameOf = (id: string | null | undefined) =>
    id ? (players.find((p) => p.id === id)?.username ?? "Opponent") : null;
  const opponentName = isChallenger
    ? nameOf(bidding.highestBidder)
    : isHighestBidder
      ? nameOf(bidding.currentChallenger)
      : nameOf(bidding.highestBidder);

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
            Open the bidding (min: {OPEN_BID})
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

        {canOpen && (
          <Button
            onClick={() => placeBid(OPEN_BID)}
            data-testid="place-bid-btn"
            variant="yellow"
            className="flex-1"
          >
            Bid {OPEN_BID}
          </Button>
        )}

        {canRespond && (
          <Button
            onClick={callBid}
            data-testid="call-bid-btn"
            disabled={!canCall}
            variant="blue"
            className="flex-1"
          >
            Call ({callValue})
          </Button>
        )}

        {canRespond && (
          <Button
            onClick={() => placeBid(raiseValue)}
            data-testid="place-bid-btn"
            disabled={!canRaise}
            variant="yellow"
            className="flex-1"
          >
            Raise ({raiseValue})
          </Button>
        )}
      </div>
    </div>
  );
}
