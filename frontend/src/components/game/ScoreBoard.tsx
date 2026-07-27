"use client";

import { useGame } from "@/hooks/useGame";
import { motion } from "framer-motion";

export function ScoreBoard() {
  const { score, double: doubleInfo, bidding, trump, marriage } = useGame();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 backdrop-blur-sm"
    >
      <div className="flex items-baseline gap-1">
        <span className="text-[10px] uppercase tracking-wide text-blue-300/60">
          A
        </span>
        <motion.span
          key={score.matchPoints[0]}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="text-sm font-bold text-blue-400"
        >
          {score.matchPoints[0]}
        </motion.span>
        <span className="text-[9px] text-white/25">({score.sets[0]})</span>
      </div>
      <span className="text-white/20">·</span>
      <div className="flex items-baseline gap-1">
        <span className="text-[10px] uppercase tracking-wide text-red-300/60">
          B
        </span>
        <motion.span
          key={score.matchPoints[1]}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="text-sm font-bold text-red-400"
        >
          {score.matchPoints[1]}
        </motion.span>
        <span className="text-[9px] text-white/25">({score.sets[1]})</span>
      </div>

      {bidding.currentBid && (
        <>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-[10px] text-white/40">Bid</span>
          <span className="text-sm font-semibold text-yellow-400">
            {bidding.currentBid}
          </span>
        </>
      )}

      {trump.type === "joker" && (
        <>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-[10px] text-white/40">Trump</span>
          <span className="text-sm font-semibold text-green-400">
            {trump.isRevealed ? "No Trump" : "Hidden"}
          </span>
        </>
      )}
      {trump.type && trump.type !== "joker" && (
        <>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-[10px] text-white/40">Trump</span>
          <span className="text-sm font-semibold text-green-400">
            {trump.isRevealed
              ? trump.seventhCard
                ? `${trump.seventhCard.rank} of ${trump.suit}`
                : trump.suit
              : trump.type === "seventh-card" && trump.seventhCard
                ? `${trump.seventhCard.rank} of ${trump.suit} · set aside`
                : "Hidden"}
          </span>
        </>
      )}

      {doubleInfo.multiplier > 1 && (
        <>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-sm font-bold text-orange-400">
            ×{doubleInfo.multiplier}
          </span>
        </>
      )}

      {marriage && (
        <>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-sm font-medium text-purple-400">
            💍 {marriage.suit} → {marriage.effectiveBid}
          </span>
        </>
      )}
    </motion.div>
  );
}
