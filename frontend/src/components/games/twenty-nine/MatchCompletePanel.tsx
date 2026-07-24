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
    <div data-testid="match-complete-panel" className="rounded-xl border border-green-500/30 bg-black/70 p-8 text-center backdrop-blur-md">
      <h2 className="mb-2 text-2xl font-bold text-green-400">Match Complete!</h2>

      {winner && (
        <div className="mb-6 text-3xl font-bold text-white">
          {winner} Wins!
        </div>
      )}

      <div className="mb-6 flex justify-center gap-12">
        <div>
          <div className="text-sm text-blue-300/60">Team A</div>
          <div className="text-3xl font-bold text-blue-400">{score.sets[0]}</div>
          <div className="text-xs text-white/30">sets won</div>
        </div>
        <div className="text-2xl text-white/20">vs</div>
        <div>
          <div className="text-sm text-red-300/60">Team B</div>
          <div className="text-3xl font-bold text-red-400">{score.sets[1]}</div>
          <div className="text-xs text-white/30">sets won</div>
        </div>
      </div>

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
