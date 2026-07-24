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
  const { phase, players, currentTurn, weakHandPlayer } = useGame();
  const guestId = useSocketStore((s) => s.guestId);

  const currentPlayer = players[currentTurn];
  const isMyTurn = currentPlayer?.id === guestId;

  return (
    <div data-testid="game-status" className="flex items-center gap-2">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-sm"
      >
        <span className="text-[10px] text-white/40">Phase: </span>
        <span className="text-sm font-medium text-white/90">
          {PHASE_LABELS[phase] ?? phase}
        </span>
      </motion.div>

      {currentPlayer && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-lg border px-3 py-1.5 backdrop-blur-sm ${
            isMyTurn
              ? 'border-green-500/50 bg-green-900/40'
              : 'border-white/10 bg-black/30'
          }`}
        >
          <span className="text-[10px] text-white/40">Turn: </span>
          {isMyTurn ? (
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-sm font-medium text-green-400"
            >
              🎯 Your turn
            </motion.span>
          ) : (
            <span className="text-sm font-medium text-white/80">
              {currentPlayer.username}&apos;s turn
            </span>
          )}
        </motion.div>
      )}

      {weakHandPlayer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg border border-yellow-600/50 bg-yellow-900/40 px-3 py-1.5 backdrop-blur-sm"
        >
          <span className="text-sm text-yellow-400">⚠️ Weak hand</span>
        </motion.div>
      )}
    </div>
  );
}
