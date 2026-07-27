"use client";

import { useGameStore } from "@/stores/gameStore";
import { useSocketStore } from "@/stores/socketStore";
import { Button } from "@/components/common/Button";

export function TrumpRevealPanel() {
  const guestId = useSocketStore((s) => s.guestId);
  const socket = useSocketStore((s) => s.socket);
  const players = useGameStore((s) => s.players);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const phase = useGameStore((s) => s.phase);
  const trump = useGameStore((s) => s.trump);
  const leadSuit = useGameStore((s) => s.leadSuit);

  // Only show during playing phase, trump not yet revealed, and trump exists
  if (phase !== "PLAYING" || trump.isRevealed || !trump.type) {
    return null;
  }

  // Must have a led suit to reveal
  if (!leadSuit) return null;

  const myPlayer = players.find((p) => p.id === guestId);
  if (!myPlayer?.hand || myPlayer.hand.length === 0) return null;

  // Only show if I have NO cards of the led suit
  const hasLedSuit = myPlayer.hand.some((c: any) => c.suit === leadSuit);
  if (hasLedSuit) return null;

  const currentPlayer = players[currentTurn];
  const isMyTurn = currentPlayer?.id === guestId;

  const hasTrumpCards = myPlayer.hand.some((c: any) => c.suit === trump.suit);

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-purple-500/30 bg-black/70 p-3 backdrop-blur-md">
      <span className="text-sm text-purple-300">
        No {leadSuit} cards in hand
      </span>
      <Button
        onClick={() => socket?.emit("REQUEST_TRUMP_REVEAL")}
        disabled={!isMyTurn}
        variant="purple"
        className="text-sm font-medium"
      >
        {isMyTurn ? "Reveal Trump" : `Waiting for turn...`}
      </Button>
      <span className="text-[10px] text-white/40">
        {trump.type === "joker"
          ? "Reveals there is no trump this game"
          : hasTrumpCards
            ? "You have trump cards — must play one after revealing"
            : "Trump will be active in trick calculations"}
      </span>
    </div>
  );
}
