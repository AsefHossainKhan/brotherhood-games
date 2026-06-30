'use client';

import { useGame } from '@/hooks/useGame';

const SUITS = [
  { name: 'hearts', symbol: '♥', color: 'text-red-500' },
  { name: 'diamonds', symbol: '♦', color: 'text-red-500' },
  { name: 'clubs', symbol: '♣', color: 'text-gray-300' },
  { name: 'spades', symbol: '♠', color: 'text-gray-300' },
];

export function TrumpSelector() {
  const { selectTrump, selectSeventhCardTrump, selectJoker } = useGame();

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-400">Select Trump</h3>

      {/* Suit options */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {SUITS.map((suit) => (
          <button
            key={suit.name}
            onClick={() => selectTrump(suit.name)}
            data-testid={`trump-${suit.name}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-600 px-4 py-3 hover:bg-gray-700 transition-colors"
          >
            <span className={`text-2xl ${suit.color}`}>{suit.symbol}</span>
            <span className="text-sm capitalize text-white">{suit.name}</span>
          </button>
        ))}
      </div>

      {/* Special options */}
      <div className="flex gap-2">
        <button
          onClick={selectSeventhCardTrump}
          data-testid="trump-seventh-card"
          className="flex-1 rounded-lg border border-purple-600 px-4 py-2 text-sm text-purple-400 hover:bg-purple-900/30 transition-colors"
        >
          🂠 7th Card
        </button>
        <button
          onClick={selectJoker}
          data-testid="trump-joker"
          className="flex-1 rounded-lg border border-orange-600 px-4 py-2 text-sm text-orange-400 hover:bg-orange-900/30 transition-colors"
        >
          🃏 Joker
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-gray-600">
        7th Card: trump hidden until reveal. Joker: no trump.
      </p>
    </div>
  );
}
