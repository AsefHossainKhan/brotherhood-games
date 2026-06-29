'use client';

import { CardComponent } from '@brotherhood/shared/cards';
import { useGame } from '@/hooks/useGame';
import { useState } from 'react';

interface Card {
  suit: string;
  rank: string;
}

interface HandAreaProps {
  cards: Card[];
}

export function HandArea({ cards }: HandAreaProps) {
  const { playCard, isMyTurn, phase } = useGame();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const canPlay = isMyTurn && phase === 'PLAYING';

  const handleCardClick = (index: number) => {
    if (!canPlay) return;

    if (selectedIndex === index) {
      // Double-click to play
      playCard(index);
      setSelectedIndex(null);
    } else {
      setSelectedIndex(index);
    }
  };

  return (
    <div className="border-t border-gray-800 bg-gray-900/80 px-4 py-4">
      <div className="flex items-center justify-center gap-2">
        {cards.map((card, index) => (
          <div
            key={`${card.suit}_${card.rank}_${index}`}
            className={`transition-transform ${
              selectedIndex === index ? '-translate-y-3' : ''
            } ${canPlay ? 'cursor-pointer hover:-translate-y-1' : ''}`}
            onClick={() => handleCardClick(index)}
          >
            <CardComponent
              card={card as any}
              width={70}
              height={98}
              selected={selectedIndex === index}
              disabled={!canPlay}
            />
          </div>
        ))}
      </div>
      {canPlay && (
        <p className="mt-2 text-center text-sm text-gray-500">
          Click a card to select, click again to play
        </p>
      )}
    </div>
  );
}
