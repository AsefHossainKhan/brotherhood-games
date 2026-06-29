'use client';

import { useGame } from '@/hooks/useGame';
import { useSocket } from '@/hooks/useSocket';
import { PlayerSeat } from './PlayerSeat';
import { HandArea } from './HandArea';
import { TableArea } from './TableArea';
import { ScoreBoard } from './ScoreBoard';
import { BidPanel } from '@/components/games/twenty-nine/BidPanel';
import { TrumpSelector } from '@/components/games/twenty-nine/TrumpSelector';
import { DoublePanel } from '@/components/games/twenty-nine/DoublePanel';
import { GameStatus } from '@/components/games/twenty-nine/GameStatus';

export function GameBoard() {
  const { phase, players, myPlayer, isMyTurn, score } = useGame();

  useSocket();

  // Determine which action panel to show
  const showBidPanel = phase === 'BIDDING' && isMyTurn;
  const showTrumpSelector = phase === 'TRUMP_SELECTION' && myPlayer?.isDeclarer;
  const showDoublePanel = phase === 'DOUBLE_PHASE';

  return (
    <div data-testid="game-board" className="flex min-h-screen flex-col">
      {/* Top bar: scores + status */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <ScoreBoard />
        <GameStatus />
      </div>

      {/* Main game area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {/* Opponent seats (top) */}
        <div className="flex gap-8">
          {players
            .filter((p) => p.id !== myPlayer?.id)
            .slice(0, 3)
            .map((player) => (
              <PlayerSeat key={player.id} player={player} />
            ))}
        </div>

        {/* Table center */}
        <TableArea />

        {/* Action panels */}
        <div className="flex gap-4">
          {showBidPanel && <BidPanel />}
          {showTrumpSelector && <TrumpSelector />}
          {showDoublePanel && <DoublePanel />}
        </div>
      </div>

      {/* Bottom: my hand */}
      {myPlayer?.hand && (
        <HandArea cards={myPlayer.hand} />
      )}
    </div>
  );
}
