'use client';

import { useGame } from '@/hooks/useGame';
import { motion } from 'framer-motion';

export function ScoreBoard() {
  const { score, double: doubleInfo, bidding, trump, marriage } = useGame();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-[10px] text-blue-300/60">Team A</div>
          <motion.div
            key={score.matchPoints[0]}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-base font-bold text-blue-400"
          >
            {score.matchPoints[0]}
          </motion.div>
          <div className="text-[10px] text-white/30">Sets: {score.sets[0]}</div>
        </div>
        <div className="text-white/20">vs</div>
        <div className="text-center">
          <div className="text-[10px] text-red-300/60">Team B</div>
          <motion.div
            key={score.matchPoints[1]}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-base font-bold text-red-400"
          >
            {score.matchPoints[1]}
          </motion.div>
          <div className="text-[10px] text-white/30">Sets: {score.sets[1]}</div>
        </div>
      </div>

      <div className="h-8 w-px bg-white/10" />

      {bidding.currentBid && (
        <div className="text-center">
          <div className="text-[10px] text-white/40">Bid</div>
          <div className="text-sm font-medium text-yellow-400">
            {bidding.currentBid}
          </div>
        </div>
      )}

      {trump.type === 'joker' && (
        <div className="text-center">
          <div className="text-[10px] text-white/40">Trump</div>
          <div className="text-sm font-medium text-green-400">
            {trump.isRevealed ? 'No Trump' : 'Hidden'}
          </div>
        </div>
      )}
      {trump.type && trump.type !== 'joker' && (
        <div className="text-center">
          <div className="text-[10px] text-white/40">Trump</div>
          <div className="text-sm font-medium text-green-400">
            {trump.isRevealed
              ? trump.seventhCard
                ? `${trump.seventhCard.rank} of ${trump.suit}`
                : trump.suit
              : 'Hidden'}
          </div>
        </div>
      )}

      {doubleInfo.multiplier > 1 && (
        <>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <div className="text-[10px] text-white/40">Multiplier</div>
            <div className="text-sm font-bold text-orange-400">
              ×{doubleInfo.multiplier}
            </div>
          </div>
        </>
      )}

      {marriage && (
        <>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <div className="text-[10px] text-white/40">Marriage</div>
            <div className="text-sm font-medium text-purple-400">
              {marriage.suit} → {marriage.effectiveBid}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
