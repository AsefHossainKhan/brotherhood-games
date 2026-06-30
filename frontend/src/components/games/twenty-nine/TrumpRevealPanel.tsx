'use client';

import { useGameStore } from '@/stores/gameStore';
import { useSocketStore } from '@/stores/socketStore';

export function TrumpRevealPanel() {
  const guestId = useSocketStore((s) => s.guestId);
  const socket = useSocketStore((s) => s.socket);
  const players = useGameStore((s) => s.players);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const phase = useGameStore((s) => s.phase);
  const trump = useGameStore((s) => s.trump);
  const leadSuit = useGameStore((s) => s.leadSuit);

  const currentPlayer = players[currentTurn];
  const isMyTurn = currentPlayer?.id === guestId;

  if (phase !== 'PLAYING' || trump.isRevealed || !trump.type || trump.type === 'joker' || !isMyTurn) {
    return null;
  }

  if (!leadSuit) return null;

  const myPlayer = players.find((p) => p.id === guestId);
  if (!myPlayer?.hand || myPlayer.hand.length === 0) return null;

  const hasLedSuit = myPlayer.hand.some((c: any) => c.suit === leadSuit);
  if (hasLedSuit) return null;

  // Check if I have trump cards — if so, I'll be forced to play one after revealing
  const hasTrumpCards = myPlayer.hand.some((c: any) => c.suit === trump.suit);

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-purple-600 bg-purple-900/30 p-3">
      <span className="text-sm text-purple-300">
        No {leadSuit} cards in hand
      </span>
      <button
        onClick={() => socket?.emit('REQUEST_TRUMP_REVEAL')}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
      >
        Reveal Trump
      </button>
      <span className="text-xs text-gray-500">
        {hasTrumpCards
          ? 'You have trump cards — you must play one after revealing'
          : 'Trump will be active in trick calculations'}
      </span>
    </div>
  );
}
