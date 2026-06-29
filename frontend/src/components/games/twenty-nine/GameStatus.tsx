'use client';

import { useGame } from '@/hooks/useGame';

const PHASE_LABELS: Record<string, string> = {
  WAITING_FOR_PLAYERS: 'Waiting for players...',
  FIRST_DEAL: 'Dealing cards...',
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

  const currentPlayer = players[currentTurn];
  const isMyTurn = currentPlayer?.id ===
    (typeof window !== 'undefined' ? localStorage.getItem('brotherhood_guest_id') : '');

  return (
    <div className="flex items-center gap-4">
      {/* Phase */}
      <div className="rounded-lg bg-gray-800 px-3 py-1.5">
        <span className="text-xs text-gray-500">Phase: </span>
        <span className="text-sm font-medium text-white">
          {PHASE_LABELS[phase] ?? phase}
        </span>
      </div>

      {/* Current turn */}
      {currentPlayer && (
        <div
          className={`rounded-lg px-3 py-1.5 ${
            isMyTurn
              ? 'border border-green-500 bg-green-900/30'
              : 'bg-gray-800'
          }`}
        >
          <span className="text-xs text-gray-500">Turn: </span>
          <span
            className={`text-sm font-medium ${
              isMyTurn ? 'text-green-400' : 'text-white'
            }`}
          >
            {isMyTurn ? '🎯 Your turn' : `Seat ${currentTurn + 1}`}
          </span>
        </div>
      )}

      {/* Weak hand notification */}
      {weakHandPlayer && (
        <div className="rounded-lg border border-yellow-600 bg-yellow-900/30 px-3 py-1.5">
          <span className="text-sm text-yellow-400">
            ⚠️ Weak hand detected
          </span>
        </div>
      )}
    </div>
  );
}
