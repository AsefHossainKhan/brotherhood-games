'use client';

import { useRouter } from 'next/navigation';
import { useGame } from '@/hooks/useGame';

export function MatchCompletePanel() {
  const { score } = useGame();
  const router = useRouter();

  const team0Wins = score.sets[0] > score.sets[1];
  const team1Wins = score.sets[1] > score.sets[0];
  const winner = team0Wins ? 'Team A' : team1Wins ? 'Team B' : null;

  return (
    <div data-testid="match-complete-panel" className="rounded-lg border border-green-500 bg-gray-800 p-8 text-center">
      <h2 className="mb-2 text-2xl font-bold text-green-400">Match Complete!</h2>

      {winner && (
        <div className="mb-6 text-3xl font-bold text-white">
          {winner} Wins!
        </div>
      )}

      {/* Final scores */}
      <div className="mb-6 flex justify-center gap-12">
        <div>
          <div className="text-sm text-gray-400">Team A</div>
          <div className="text-3xl font-bold text-blue-400">{score.sets[0]}</div>
          <div className="text-xs text-gray-500">sets won</div>
        </div>
        <div className="text-2xl text-gray-600">vs</div>
        <div>
          <div className="text-sm text-gray-400">Team B</div>
          <div className="text-3xl font-bold text-red-400">{score.sets[1]}</div>
          <div className="text-xs text-gray-500">sets won</div>
        </div>
      </div>

      {/* Back to lobby */}
      <button
        onClick={() => router.push('/')}
        data-testid="back-to-lobby-btn"
        className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Back to Lobby
      </button>
    </div>
  );
}
