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
import { ScoringPanel } from "@/components/games/twenty-nine/ScoringPanel";
import { MatchCompletePanel } from "@/components/games/twenty-nine/MatchCompletePanel";
import { MarriagePanel } from "@/components/games/twenty-nine/MarriagePanel";
import { DisconnectOverlay } from "./DisconnectOverlay";
import { AnimatePresence, motion } from "framer-motion";

export function GameBoard() {
  const {
    phase,
    players,
    myPlayer,
    isMyTurn,
    score,
    weakHandPlayer,
    currentTurn,
    biddingResult,
  } = useGame();

  useSocket();

  const showWeakHandPanel = weakHandPlayer === myPlayer?.id;
  const showBidPanel = phase === "BIDDING" && isMyTurn;
  const showTrumpSelector = phase === "TRUMP_SELECTION" && myPlayer?.isDeclarer;
  const showDoublePanel = phase === "DOUBLE_PHASE";
  const showScoringPanel = phase === "SCORING";
  const showMatchCompletePanel = phase === "MATCH_COMPLETE";

  const opponents = players.filter((p) => p.id !== myPlayer?.id);
  const mySeat = myPlayer?.seat ?? 0;
  const currentTurnId = players[currentTurn]?.id ?? null;

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
      <div
        data-testid="game-board"
        className="relative flex h-dvh flex-col overflow-hidden"
      >
        <DisconnectOverlay />

        {/* Top bar: scores + status. Single non-wrapping row so it stays
            compact (~40px) on short 720p viewports (~600px usable height). */}
        <div className="relative z-20 flex shrink-0 items-center justify-between gap-2 overflow-x-auto px-3 py-1">
          <ScoreBoard />
          <GameStatus />
        </div>

        {/* Transient banner announcing who won the auction. */}
        <AnimatePresence>
          {biddingResult && (
            <motion.div
              key="bidding-result-banner"
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="pointer-events-none absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-xl border border-yellow-400/50 bg-black/70 px-5 py-2.5 text-center shadow-lg backdrop-blur-sm"
            >
              <div className="text-[11px] uppercase tracking-wide text-yellow-300/70">
                Bidding won
              </div>
              <div className="text-sm font-bold text-yellow-300">
                {biddingResult.declarerId === myPlayer?.id
                  ? "You"
                  : (players.find((p) => p.id === biddingResult.declarerId)
                      ?.username ?? "Declarer")}{" "}
                {biddingResult.winningBid != null && (
                  <span className="text-white/80">
                    at {biddingResult.winningBid}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main game area - takes remaining space. */}
        <div className="relative flex-1 min-h-0">
          {/* Opponent seats */}
          {leftOpponent && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <PlayerSeat
                player={leftOpponent}
                position="left"
                isCurrentTurn={leftOpponent.id === currentTurnId}
              />
            </div>
          )}

          {rightOpponent && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
              <PlayerSeat
                player={rightOpponent}
                position="right"
                isCurrentTurn={rightOpponent.id === currentTurnId}
              />
            </div>
          )}

          {topOpponent && (
            <div className="absolute left-1/2 top-1 -translate-x-1/2 z-10">
              <PlayerSeat
                player={topOpponent}
                position="top"
                isCurrentTurn={topOpponent.id === currentTurnId}
              />
            </div>
          )}

          {/* Center: table + panels. Raised above the hand (z-30) so the
              interaction panels are never covered by hand cards, while the
              scaffolding stays pointer-transparent so it never blocks the hand;
              only the interactive panel wrapper re-enables pointer events. */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative z-30 -translate-y-2">
              <TableArea />

              <div className="pointer-events-auto absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
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
