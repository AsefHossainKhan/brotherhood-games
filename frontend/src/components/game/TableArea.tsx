"use client";

import {
  CardComponent,
  SuitSVG,
  RANK_ORDER_29,
} from "@brotherhood/shared/cards";
import { useGame } from "@/hooks/useGame";
import { useUiScale } from "@/hooks/useUiScale";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Pos = "top" | "bottom" | "left" | "right";

export function TableArea() {
  const {
    currentTrick,
    players,
    myPlayer,
    currentTurn,
    heldTrick,
    leadSuit,
    trump,
    phase,
  } = useGame();

  const currentTurnId = players[currentTurn]?.id ?? null;
  const isMyTurn = myPlayer?.id === currentTurnId;

  // I cannot follow suit when a suit is led and I hold none of it. Flag it with
  // a red border so I understand why any card is now playable.
  const iAmVoidInLead =
    !!leadSuit &&
    !(myPlayer?.hand ?? []).some((c: { suit: string }) => c.suit === leadSuit);
  const showVoidBorder = phase === "PLAYING" && isMyTurn && iAmVoidInLead;

  // The led suit currently in play — shown prominently so it is always obvious
  // which suit everyone must follow.
  const showLeadSuit = phase === "PLAYING" && !!leadSuit && !heldTrick;

  const scale = useUiScale();
  const matW = Math.round(232 * scale);
  const matH = Math.round(188 * scale);
  const cardW = Math.round(54 * scale);
  const cardH = Math.round(76 * scale);

  // While a completed trick is being reviewed, show its four cards (the engine
  // has already reset the live trick). Otherwise show the in-progress trick.
  const plays = heldTrick ? heldTrick.cards : currentTrick.plays;
  const holdWinnerId = heldTrick?.winnerId ?? null;
  const lastPlay = plays.length > 0 ? plays[plays.length - 1] : null;

  // Which card is currently beating the others in the in-progress trick, so the
  // player can see who is winning before the trick is decided.
  const liveWinnerId = useMemo(() => {
    if (heldTrick || currentTrick.plays.length < 2) return null;
    const parsed = currentTrick.plays.map((p) => {
      const [suit, rank] = p.cardId.split("_");
      return { playerId: p.playerId, suit, rank };
    });
    const leadSuitLocal = parsed[0].suit;
    const trumpActive = trump.isRevealed && !!trump.suit;
    let winner = parsed[0];
    let winIsTrump = trumpActive && parsed[0].suit === trump.suit;
    let winRank = RANK_ORDER_29[parsed[0].rank] ?? 0;
    for (let i = 1; i < parsed.length; i++) {
      const c = parsed[i];
      const cIsTrump = trumpActive && c.suit === trump.suit;
      const cRank = RANK_ORDER_29[c.rank] ?? 0;
      if (winIsTrump) {
        if (cIsTrump && cRank > winRank) {
          winner = c;
          winRank = cRank;
        }
      } else if (cIsTrump) {
        winner = c;
        winIsTrump = true;
        winRank = cRank;
      } else if (c.suit === leadSuitLocal && cRank > winRank) {
        winner = c;
        winRank = cRank;
      }
    }
    return winner.playerId;
  }, [heldTrick, currentTrick.plays, trump.isRevealed, trump.suit]);

  const positionOf = (seat: number): Pos => {
    const mySeat = myPlayer?.seat ?? 0;
    const rel = (seat - mySeat + 4) % 4;
    if (rel === 2) return "top";
    if (rel === 1) return "right";
    if (rel === 3) return "left";
    return "bottom";
  };

  // Assign every player to a fixed slot around the table.
  const slots: Record<Pos, (typeof players)[number] | undefined> = {
    top: undefined,
    bottom: undefined,
    left: undefined,
    right: undefined,
  };
  for (const p of players) {
    slots[positionOf(p.seat)] = p;
  }

  const playFor = (playerId?: string) =>
    playerId ? (plays.find((pl) => pl.playerId === playerId) ?? null) : null;

  const enterOffset: Record<Pos, { x: number; y: number }> = {
    top: { x: 0, y: -40 },
    bottom: { x: 0, y: 40 },
    left: { x: -40, y: 0 },
    right: { x: 40, y: 0 },
  };

  // Cross / diamond formation: each played card sits just off the mat centre,
  // toward the seat that played it, with a slight natural tilt.
  const offX = Math.round(cardW * 1.18);
  const offY = Math.round(cardH * 0.6);
  const layout: Record<Pos, { x: number; y: number; rot: number }> = {
    top: { x: 0, y: -offY, rot: 3 },
    bottom: { x: 0, y: offY, rot: -3 },
    left: { x: -offX, y: 0, rot: -4 },
    right: { x: offX, y: 0, rot: 4 },
  };

  // When a trick is won, every card sweeps off the table toward the winner's
  // seat (pure eye-candy). Work out that direction once.
  const winnerSeat =
    holdWinnerId != null
      ? (players.find((p) => p.id === holdWinnerId)?.seat ?? null)
      : null;
  const winnerPos = winnerSeat != null ? positionOf(winnerSeat) : null;
  const flyTo: Record<Pos, { x: number; y: number }> = {
    top: { x: 0, y: -Math.round(matH * 0.95) },
    bottom: { x: 0, y: Math.round(matH * 0.95) },
    left: { x: -Math.round(matW * 0.95), y: 0 },
    right: { x: Math.round(matW * 0.95), y: 0 },
  };
  const flyTarget = heldTrick && winnerPos ? flyTo[winnerPos] : null;

  // Two-phase trick reveal: hold every card at rest on the table so the last
  // card is clearly visible for ~2s, THEN sweep them all to the winner. Using a
  // delayed fly target instead would leave the freshly-mounted last card hidden
  // (at its 0-opacity mount state) during the wait.
  const [flying, setFlying] = useState(false);
  useEffect(() => {
    if (!heldTrick || !winnerPos) {
      setFlying(false);
      return;
    }
    setFlying(false);
    const t = setTimeout(() => setFlying(true), 2200);
    return () => clearTimeout(t);
  }, [heldTrick?.trickNumber, holdWinnerId, winnerPos, heldTrick]);

  return (
    <div
      className="pointer-events-none relative flex max-w-full items-center justify-center"
      style={{ width: matW, height: matH }}
    >
      {/* Felt play surface */}
      <div
        className="absolute inset-0 rounded-[26px] border border-black/40 shadow-[inset_0_1px_22px_rgba(0,0,0,0.5),0_12px_34px_-10px_rgba(0,0,0,0.6)]"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 38%, #1d8257 0%, #13643f 55%, #0b4027 100%)",
        }}
      />
      {/* Void-in-lead warning: a pulsing red ring around the whole table. */}
      {showVoidBorder && (
        <motion.div
          className="pointer-events-none absolute -inset-1 z-20 rounded-[30px] border-2 border-red-500"
          animate={{
            opacity: [0.45, 1, 0.45],
            boxShadow: [
              "0 0 0 0 rgba(239,68,68,0)",
              "0 0 22px 4px rgba(239,68,68,0.6)",
              "0 0 0 0 rgba(239,68,68,0)",
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {/* Large translucent watermark of the led suit, centred on the felt. */}
      {showLeadSuit && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.1]">
          <SuitSVG
            suit={leadSuit as any}
            size={Math.round(matH * 0.46)}
            color="#ffffff"
          />
        </div>
      )}
      {/* Subtle centre ring */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/6"
        style={{
          width: Math.round(matH * 0.5),
          height: Math.round(matH * 0.5),
        }}
      />

      {(["top", "left", "right", "bottom"] as Pos[]).map((pos) => {
        const player = slots[pos];
        if (!player) return null;
        const play = playFor(player.id);
        const isTurn = !heldTrick && player.id === currentTurnId;
        const isWinner = !!heldTrick && player.id === holdWinnerId;
        const isLiveWinner = !heldTrick && player.id === liveWinnerId;
        const justPlayed = !heldTrick && lastPlay?.playerId === player.id;
        const l = layout[pos];

        return (
          <div
            key={pos}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(-50%, -50%) translate(${l.x}px, ${l.y}px)`,
            }}
          >
            <AnimatePresence mode="wait">
              {play ? (
                <motion.div
                  key={play.cardId}
                  initial={{
                    opacity: 0,
                    scale: 0.55,
                    x: enterOffset[pos].x,
                    y: enterOffset[pos].y,
                    rotate: 0,
                  }}
                  animate={
                    flyTarget && flying
                      ? {
                          opacity: 0,
                          scale: 0.5,
                          x: flyTarget.x,
                          y: flyTarget.y,
                          rotate: l.rot,
                        }
                      : { opacity: 1, scale: 1, x: 0, y: 0, rotate: l.rot }
                  }
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={
                    flyTarget && flying
                      ? { duration: 0.55, ease: "easeIn" }
                      : {
                          type: "spring",
                          stiffness: 200,
                          damping: 22,
                          mass: 0.8,
                        }
                  }
                  className="relative"
                  style={{
                    filter: isWinner
                      ? "drop-shadow(0 0 12px rgba(250,204,21,0.75))"
                      : isLiveWinner
                        ? "drop-shadow(0 0 9px rgba(250,204,21,0.6))"
                        : "drop-shadow(0 5px 7px rgba(0,0,0,0.5))",
                  }}
                >
                  <CardComponent
                    card={
                      {
                        suit: play.cardId.split("_")[0] as any,
                        rank: play.cardId.split("_")[1],
                      } as any
                    }
                    width={cardW}
                    height={cardH}
                  />
                  {justPlayed && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-yellow-400 px-1 text-[9px] font-bold text-black shadow"
                    >
                      ✓
                    </motion.span>
                  )}
                  {isLiveWinner && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.4, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-400/50 bg-black/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-yellow-300 shadow"
                    >
                      ♛ Winning
                    </motion.span>
                  )}
                  {isWinner && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.4, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute -right-2 -top-3 text-base"
                    >
                      👑
                    </motion.span>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  animate={
                    isTurn
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(74,222,128,0)",
                            "0 0 16px 3px rgba(74,222,128,0.5)",
                            "0 0 0 0 rgba(74,222,128,0)",
                          ],
                        }
                      : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
                  }
                  transition={
                    isTurn
                      ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.3 }
                  }
                  style={{ width: cardW, height: cardH }}
                  className={`rounded-lg border ${
                    isTurn
                      ? "border-green-400/60 bg-green-400/5"
                      : "border-dashed border-white/10 bg-black/5"
                  }`}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {heldTrick && heldTrick.winnerId && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-yellow-400/40 bg-black/70 px-3 py-1 text-xs font-semibold text-yellow-300 shadow-lg backdrop-blur-sm"
        >
          🏆 Trick won by{" "}
          {heldTrick.winnerId === myPlayer?.id
            ? "You"
            : (players.find((p) => p.id === heldTrick.winnerId)?.username ??
              "??")}
        </motion.div>
      )}

      {/* Prominent "which suit is being played" badge at the top of the felt. */}
      {showLeadSuit && (
        <motion.div
          key={`lead-${leadSuit}`}
          initial={{ opacity: 0, y: -6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute -top-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-black/75 px-3 py-1 shadow-lg backdrop-blur-sm"
        >
          <span className="text-[10px] uppercase tracking-wide text-white/50">
            Leading
          </span>
          <SuitSVG suit={leadSuit as any} size={15} />
          <span className="text-xs font-semibold capitalize text-white/90">
            {leadSuit}
          </span>
          {trump.isRevealed && trump.suit && (
            <>
              <span className="mx-0.5 text-white/25">·</span>
              <span className="text-[10px] uppercase tracking-wide text-yellow-300/60">
                Trump
              </span>
              <SuitSVG suit={trump.suit as any} size={15} />
            </>
          )}
        </motion.div>
      )}

      {/* Void-in-lead caption so the red border is self-explanatory. */}
      {showVoidBorder && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute -bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-red-500/50 bg-black/75 px-3 py-1 text-xs font-semibold text-red-300 shadow-lg backdrop-blur-sm"
        >
          <span>No</span>
          <SuitSVG suit={leadSuit as any} size={14} />
          <span>in hand — play any card</span>
        </motion.div>
      )}
    </div>
  );
}
