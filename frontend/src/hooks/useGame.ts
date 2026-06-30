'use client';

import { useSocketStore } from '@/stores/socketStore';
import { useGameStore } from '@/stores/gameStore';

/**
 * Hook for game actions (29-specific).
 */
export function useGame() {
  const socket = useSocketStore((s) => s.socket);
  const game = useGameStore();
  const guestId =
    typeof window !== 'undefined'
      ? localStorage.getItem('brotherhood_guest_id') ?? ''
      : '';

  // Find my player state
  const myPlayer = game.players.find((p) => p.id === guestId);
  const isMyTurn = game.players[game.currentTurn]?.id === guestId;

  // Bidding
  const placeBid = (bid: number) => {
    socket?.emit('PLACE_BID', { bid });
  };

  const passBid = () => {
    socket?.emit('PASS_BID');
  };

  // Trump selection
  const selectTrump = (suit: string) => {
    socket?.emit('SELECT_TRUMP', { suit });
  };

  const selectSeventhCardTrump = () => {
    socket?.emit('SELECT_SEVENTH_CARD_TRUMP');
  };

  const selectJoker = () => {
    socket?.emit('SELECT_JOKER');
  };

  // Double phase
  const declareDouble = () => {
    socket?.emit('DECLARE_DOUBLE');
  };

  const declareRedouble = () => {
    socket?.emit('DECLARE_REDOUBLE');
  };

  const declareFullset = () => {
    socket?.emit('DECLARE_FULLSET');
  };

  const passDouble = () => {
    socket?.emit('PASS_DOUBLE');
  };

  // Playing
  const playCard = (cardIndex: number) => {
    socket?.emit('PLAY_CARD', { cardIndex });
  };

  // Trump reveal
  const requestTrumpReveal = () => {
    socket?.emit('REQUEST_TRUMP_REVEAL');
  };

  // Weak hand
  const cancelWeakHand = () => {
    socket?.emit('CANCEL_WEAK_HAND');
  };

  const keepWeakHand = () => {
    socket?.emit('KEEP_WEAK_HAND');
  };

  return {
    ...game,
    myPlayer,
    isMyTurn,
    placeBid,
    passBid,
    selectTrump,
    selectSeventhCardTrump,
    selectJoker,
    declareDouble,
    declareRedouble,
    declareFullset,
    passDouble,
    playCard,
    requestTrumpReveal,
    cancelWeakHand,
    keepWeakHand,
  };
}
