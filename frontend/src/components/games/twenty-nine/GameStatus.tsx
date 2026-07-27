'use client';

import { useGame } from '@/hooks/useGame';
import { useSocketStore } from '@/stores/socketStore';
import { motion } from 'framer-motion';

const PHASE_LABELS: Record<string, string> = {
  WAITING_FOR_PLAYERS: 'Waiting...',
  FIRST_DEAL: 'Dealing...',
  BIDDING: 'Bidding',
  TRUMP_SELECTION: 'Trump Selection',
  SECOND_DEAL: 'Second deal...',
  DOUBLE_PHASE: 'Double Phase',
  PLAYING: 'Playing',
  TRUMP_REVEAL: 'Trump Reveal',
  MARRIAGE_RESOLUTION: 'Marriage!',
  SCORING: 'Scoring...',
  MATCH_COMPLETE: 'Match Complete',
};

export function GameStatus() {
  const { phase, players, currentTurn, weakHandPlayer, completedTricks } =
    useGame();
  const guestId = useSocketStore((s) => s.guestId);

  const currentPlayer = players[currentTurn];
  const isMyTurn = currentPlayer?.id === guestId;

  return (
    <div data-testid="game-status" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      {phase === 'PLAYING' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 backdrop-blur-sm"
        >
          <span className="text-[10px] text-white/40">Trick </span>
          <span className="text-sm font-semibold text-white/90">
            {Math.min((completedTricks?.length ?? 0) + 1, 8)}/8
          </span>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 backdrop-blur-sm"
      >
        <span className="text-sm font-medium text-white/90">
          {PHASE_LABELS[phase] ?? phase}
        </span>
      </motion.div>

      {currentPlayer && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 backdrop-blur-sm ${
            isMyTurn
              ? 'border-green-500/60 bg-green-900/40'
              : 'border-amber-400/40 bg-amber-900/20'
          }`}
        >
          {isMyTurn ? (
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="text-sm font-semibold text-green-400"
            >
              🎯 Your turn
            </motion.span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-white/85">
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block h-2 w-2 rounded-full bg-amber-400"
              />
              {currentPlayer.username}&apos;s turn
            </span>
          )}
        </motion.div>
      )}

      {weakHandPlayer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg border border-yellow-600/50 bg-yellow-900/40 px-2.5 py-1 backdrop-blur-sm"
        >
          <span className="text-sm text-yellow-400">⚠️ Weak hand</span>
        </motion.div>
      )}
    </div>
  );
}
