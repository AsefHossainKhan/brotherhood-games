'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';

export function DisconnectOverlay() {
  const disconnectedPlayer = useGameStore((s) => s.disconnectedPlayer);
  const updateDisconnectedCountdown = useGameStore((s) => s.updateDisconnectedCountdown);

  useEffect(() => {
    if (!disconnectedPlayer) return;
    const interval = setInterval(updateDisconnectedCountdown, 1000);
    return () => clearInterval(interval);
  }, [disconnectedPlayer, updateDisconnectedCountdown]);

  if (!disconnectedPlayer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center shadow-xl">
        <div className="mb-4 text-4xl">🔌</div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          {disconnectedPlayer.username} disconnected
        </h2>
        <p className="mb-4 text-gray-400">
          Waiting for reconnection...
        </p>
        <div className="mb-4 text-3xl font-bold text-yellow-400">
          {disconnectedPlayer.remainingSeconds}s
        </div>
        <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-gray-700">
          <div
            className="h-full bg-yellow-400 transition-all duration-1000"
            style={{
              width: `${(disconnectedPlayer.remainingSeconds / (disconnectedPlayer.remainingSeconds + 1)) * 100}%`,
            }}
          />
        </div>
        <p className="mt-4 text-sm text-gray-500">
          If they don&apos;t reconnect in time, the game will end.
        </p>
      </div>
    </div>
  );
}
