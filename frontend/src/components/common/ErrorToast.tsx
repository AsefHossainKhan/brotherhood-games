"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

interface ErrorInfo {
  code: string;
  message: string;
  timestamp: number;
}

export function ErrorToast() {
  const lastError = useGameStore((s: any) => s.lastError as ErrorInfo | null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    if (lastError && lastError.timestamp !== error?.timestamp) {
      setError(lastError);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastError]);

  if (!visible || !error) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-black/80 px-4 py-3 shadow-lg backdrop-blur-md"
      >
        <span className="text-red-400">⚠️</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-red-300">{error.code}</div>
          <div className="mt-1 text-sm text-red-400/80">{error.message}</div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="cursor-pointer text-red-500 transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
        >
          ✕
        </button>
      </motion.div>
    </div>
  );
}
