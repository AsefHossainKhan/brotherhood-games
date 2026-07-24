'use client';

import { useEffect, useState } from 'react';
import { useGame } from '@/hooks/useGame';
import { useSocketStore } from '@/stores/socketStore';
import { motion, AnimatePresence } from 'framer-motion';

export function MarriagePanel() {
  const { marriage, players } = useGame();
  const guestId = useSocketStore((s) => s.guestId);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (marriage) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [marriage]);

  if (!marriage) return null;

  const marriagePlayer = players.find((p) => p.id === marriage.playerId);
  const teamName = marriage.team === 0 ? 'Team A' : 'Team B';

  const declarer = players.find((p) => p.isDeclarer);
  const isBiddingTeam = declarer && marriage.team === declarer.team;
  const adjustment = isBiddingTeam ? '−4' : '+4';
  const adjustmentDesc = isBiddingTeam
    ? `Bid lowered by ${adjustment}`
    : `Bid raised by ${adjustment}`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="marriage-panel"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl border border-purple-500/50 bg-black/80 p-4 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex gap-1"
            >
              <span className="text-2xl">👑</span>
              <span className="text-2xl">💎</span>
            </motion.div>

            <div>
              <div className="text-sm font-bold text-purple-300">
                Marriage Declared!
              </div>
              <div className="text-xs text-purple-400/80">
                {teamName} • {marriage.suit} (K + Q)
              </div>
              <div className="text-xs text-yellow-400/80">
                {adjustmentDesc} → Effective bid: {marriage.effectiveBid}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
