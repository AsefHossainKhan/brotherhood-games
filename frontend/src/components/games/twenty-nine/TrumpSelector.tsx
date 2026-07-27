"use client";

import { useGame } from "@/hooks/useGame";

const SUITS = [
  { name: "hearts", symbol: "♥", color: "text-red-500" },
  { name: "diamonds", symbol: "♦", color: "text-red-500" },
  { name: "clubs", symbol: "♣", color: "text-gray-300" },
  { name: "spades", symbol: "♠", color: "text-gray-300" },
];

export function TrumpSelector() {
  const { selectTrump, selectSeventhCardTrump, selectJoker } = useGame();

  return (
    <div className="rounded-xl border border-white/20 bg-black/60 p-4 backdrop-blur-md">
      <h3 className="mb-3 text-sm font-medium text-white/60">Select Trump</h3>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {SUITS.map((suit) => (
          <button
            key={suit.name}
            onClick={() => selectTrump(suit.name)}
            data-testid={`trump-${suit.name}`}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <span className={`text-2xl ${suit.color}`}>{suit.symbol}</span>
            <span className="text-sm capitalize text-white/90">
              {suit.name}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={selectSeventhCardTrump}
          data-testid="trump-seventh-card"
          className="flex-1 cursor-pointer rounded-lg border border-purple-500/30 bg-purple-900/20 px-4 py-2 text-sm text-purple-400 hover:bg-purple-900/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          🂠 7th Card
        </button>
        <button
          onClick={selectJoker}
          data-testid="trump-joker"
          className="flex-1 cursor-pointer rounded-lg border border-orange-500/30 bg-orange-900/20 px-4 py-2 text-sm text-orange-400 hover:bg-orange-900/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          🃏 Joker
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] text-white/30">
        7th Card: shown on reveal. Joker: no trump.
      </p>
    </div>
  );
}
