'use client';

import { CardComponent } from '@brotherhood/shared/cards';
import { useGame } from '@/hooks/useGame';

export function TableArea() {
  const { currentTrick, completedTricks } = useGame();

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Current trick */}
      <div className="flex items-center gap-3">
        {currentTrick.plays.length > 0 ? (
          currentTrick.plays.map((play, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <CardComponent
                card={{
                  suit: play.cardId.split('_')[0] as any,
                  rank: play.cardId.split('_')[1],
                } as any}
                width={60}
                height={84}
              />
              <span className="text-xs text-gray-500">
                Seat {i + 1}
              </span>
            </div>
          ))
        ) : (
          <div className="flex h-24 w-48 items-center justify-center rounded-lg border border-dashed border-gray-700 text-gray-600">
            {completedTricks.length > 0
              ? `Trick ${completedTricks.length + 1}`
              : 'Waiting for play...'}
          </div>
        )}
      </div>

      {/* Trick count */}
      <span className="text-sm text-gray-500">
        {completedTricks.length}/8 tricks completed
      </span>
    </div>
  );
}
