'use client';

import { CardComponent } from '@brotherhood/shared/cards';
import { useGame } from '@/hooks/useGame';
import { motion, AnimatePresence } from 'framer-motion';

export function TableArea() {
  const { currentTrick, completedTricks, players, myPlayer } = useGame();

  const lastTrick = completedTricks.length > 0 ? completedTricks[completedTricks.length - 1] : null;

  const getPlayPosition = (playerId: string): string => {
    if (playerId === myPlayer?.id) return 'bottom';
    const player = players.find((p) => p.id === playerId);
    if (!player) return 'bottom';
    const mySeat = myPlayer?.seat ?? 0;
    const relSeat = (player.seat - mySeat + 4) % 4;
    if (relSeat === 2) return 'top';
    if (relSeat === 1) return 'right';
    return 'left';
  };

  const positionStyles: Record<string, string> = {
    top: 'top-2 left-1/2 -translate-x-1/2',
    bottom: 'bottom-2 left-1/2 -translate-x-1/2',
    left: 'left-2 top-1/2 -translate-y-1/2',
    right: 'right-2 top-1/2 -translate-y-1/2',
  };

  return (
    <div className="relative flex h-48 w-full max-w-lg items-center justify-center">
      <div className="relative flex items-center justify-center gap-2">
        <AnimatePresence mode="popLayout">
          {currentTrick.plays.map((play, i) => {
            const pos = getPlayPosition(play.playerId);
            return (
              <motion.div
                key={`${play.playerId}-${play.cardId}-${i}`}
                initial={{ opacity: 0, scale: 0.5, y: pos === 'top' ? -60 : pos === 'bottom' ? 60 : 0, x: pos === 'left' ? -60 : pos === 'right' ? 60 : 0 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`absolute ${positionStyles[pos]}`}
                style={{ zIndex: i + 10 }}
              >
                <CardComponent
                  card={{
                    suit: play.cardId.split('_')[0] as any,
                    rank: play.cardId.split('_')[1],
                  } as any}
                  width={52}
                  height={73}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {currentTrick.plays.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-20 w-32 items-center justify-center rounded-full border border-white/10 bg-black/20 text-sm text-white/40"
          >
            {completedTricks.length > 0
              ? `Trick ${completedTricks.length + 1}`
              : 'Waiting...'}
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-white/50">
        {completedTricks.length}/8 tricks
      </div>

      {lastTrick && lastTrick.winnerId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/40 px-2 py-0.5 text-[10px] text-yellow-400/80"
        >
          Won by: {players.find((p) => p.id === lastTrick.winnerId)?.username ?? '??'}
        </motion.div>
      )}
    </div>
  );
}
