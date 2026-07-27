"use client";

import { useGame } from "@/hooks/useGame";
import { useSocket } from "@/hooks/useSocket";
import { PlayerSeat } from "./PlayerSeat";
import { HandArea } from "./HandArea";
import { TableArea } from "./TableArea";
import { ScoreBoard } from "./ScoreBoard";
import { TableBackground } from "./TableBackground";
import { AnimatedPanel } from "./AnimatedPanel";
import { BidPanel } from "@/components/games/twenty-nine/BidPanel";
import { TrumpSelector } from "@/components/games/twenty-nine/TrumpSelector";
import { DoublePanel } from "@/components/games/twenty-nine/DoublePanel";
import { WeakHandPanel } from "@/components/games/twenty-nine/WeakHandPanel";
import { GameStatus } from "@/components/games/twenty-nine/GameStatus";
import { TrumpRevealPanel } from "@/components/games/twenty-nine/TrumpRevealPanel";
import { ScoringPanel } from "@/components/games/twenty-nine/ScoringPanel";
import { MatchCompletePanel } from "@/components/games/twenty-nine/MatchCompletePanel";
import { MarriagePanel } from "@/components/games/twenty-nine/MarriagePanel";
import { DisconnectOverlay } from "./DisconnectOverlay";
import { AnimatePresence } from "framer-motion";

export function GameBoard() {
  const { phase, players, myPlayer, isMyTurn, score, weakHandPlayer } =
    useGame();

  useSocket();

  const showWeakHandPanel = weakHandPlayer === myPlayer?.id;
  const showBidPanel = phase === "BIDDING" && isMyTurn;
  const showTrumpSelector = phase === "TRUMP_SELECTION" && myPlayer?.isDeclarer;
  const showDoublePanel = phase === "DOUBLE_PHASE";
  const showScoringPanel = phase === "SCORING";
  const showMatchCompletePanel = phase === "MATCH_COMPLETE";

  const opponents = players.filter((p) => p.id !== myPlayer?.id);
  const mySeat = myPlayer?.seat ?? 0;

  const getPosition = (seat: number): "top" | "left" | "right" => {
    const rel = (seat - mySeat + 4) % 4;
    if (rel === 2) return "top";
    if (rel === 1) return "right";
    return "left";
  };

  const topOpponent = opponents.find((p) => getPosition(p.seat) === "top");
  const leftOpponent = opponents.find((p) => getPosition(p.seat) === "left");
  const rightOpponent = opponents.find((p) => getPosition(p.seat) === "right");

  return (
    <TableBackground>
      <div data-testid="game-board" className="relative flex h-dvh flex-col">
        <DisconnectOverlay />

        {/* Top bar: scores + status */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 py-2 shrink-0">
          <ScoreBoard />
          <GameStatus />
        </div>

        {/* Main game area - takes remaining space */}
        <div className="relative flex-1 min-h-0">
          {/* Opponent seats */}
          {leftOpponent && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <PlayerSeat player={leftOpponent} position="left" />
            </div>
          )}

          {rightOpponent && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
              <PlayerSeat player={rightOpponent} position="right" />
            </div>
          )}

          {topOpponent && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 z-10">
              <PlayerSeat player={topOpponent} position="top" />
            </div>
          )}

          {/* Center: table + panels */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative z-10">
              <TableArea />

              <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                <AnimatePresence mode="wait">
                  {showWeakHandPanel && (
                    <AnimatedPanel key="weak-hand">
                      <div data-testid="weak-hand-panel">
                        <WeakHandPanel />
                      </div>
                    </AnimatedPanel>
                  )}
                  {showBidPanel && (
                    <AnimatedPanel key="bid-panel">
                      <div data-testid="bid-panel">
                        <BidPanel />
                      </div>
                    </AnimatedPanel>
                  )}
                  {showTrumpSelector && (
                    <AnimatedPanel key="trump-selector">
                      <div data-testid="trump-selector">
                        <TrumpSelector />
                      </div>
                    </AnimatedPanel>
                  )}
                  {showDoublePanel && (
                    <AnimatedPanel key="double-panel">
                      <div data-testid="double-panel">
                        <DoublePanel />
                      </div>
                    </AnimatedPanel>
                  )}
                  {showScoringPanel && (
                    <AnimatedPanel key="scoring-panel">
                      <ScoringPanel />
                    </AnimatedPanel>
                  )}
                  {showMatchCompletePanel && (
                    <AnimatedPanel key="match-complete-panel">
                      <MatchCompletePanel />
                    </AnimatedPanel>
                  )}
                  {!showScoringPanel && !showMatchCompletePanel && (
                    <TrumpRevealPanel key="trump-reveal" />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: my hand */}
        {myPlayer?.hand && <HandArea cards={myPlayer.hand} />}

        <MarriagePanel />
      </div>
    </TableBackground>
  );
}
