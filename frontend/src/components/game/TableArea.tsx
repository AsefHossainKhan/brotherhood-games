'use client';

import { CardComponent } from '@brotherhood/shared/cards';
import { useGame } from '@/hooks/useGame';

export function TableArea() {
  const { currentTrick, completedTricks, players } = useGame();

  // Helper to get player name/label
  const getPlayerLabel = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? player.username : '??';
  };

  // Get the last completed trick for display
  const lastTrick = completedTricks.length > 0 ? completedTricks[completedTricks.length - 1] : null;

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
                {getPlayerLabel(play.playerId)}
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

      {/* Last trick winner */}
      {lastTrick && lastTrick.winnerId && (
        <div className="rounded-lg bg-gray-800 px-3 py-1.5">
          <span className="text-xs text-gray-500">Last trick won by: </span>
          <span className="text-sm font-medium text-yellow-400">
            {getPlayerLabel(lastTrick.winnerId)}
          </span>
        </div>
      )}

      {/* Trick count */}
      <span className="text-sm text-gray-500">
        {completedTricks.length}/8 tricks completed
      </span>
    </div>
  );
}
