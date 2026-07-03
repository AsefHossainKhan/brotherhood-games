'use client';

import { useEffect, useRef } from 'react';
import { useSocketStore } from '@/stores/socketStore';
import { useRoomStore } from '@/stores/roomStore';
import { useGameStore } from '@/stores/gameStore';

/**
 * Hook to manage Socket.IO event listeners.
 * Connects store updates to socket events.
 */
export function useSocket() {
  const socket = useSocketStore((s) => s.socket);
  const setRoom = useRoomStore((s) => s.setRoom);
  const clearRoom = useRoomStore((s) => s.clearRoom);
  const setGameState = useGameStore((s) => s.setGameState);
  const clearGame = useGameStore((s) => s.clearGame);
  const listenersAttached = useRef(false);

  useEffect(() => {
    if (!socket || listenersAttached.current) return;

    // ---- Room Events ----
    socket.on('ROOM_UPDATED', (data) => {
      setRoom(data.room);
    });

    socket.on('PLAYER_JOINED', (data) => {
      console.log('Player joined:', data.player?.username);
    });

    socket.on('PLAYER_LEFT', (data) => {
      console.log('Player left:', data.playerId);
    });

    socket.on('SPECTATOR_JOINED', (data) => {
      console.log('Spectator joined:', data.spectator?.username);
    });

    socket.on('SPECTATOR_LEFT', (data) => {
      console.log('Spectator left:', data.spectatorId);
    });

    // ---- Game Lifecycle Events ----
    socket.on('GAME_STARTED', (data) => {
      console.log('Game started:', data.matchId);
    });

    socket.on('GAME_STATE_UPDATED', (state) => {
      setGameState(state);
    });

    socket.on('GAME_FINISHED', (data) => {
      console.log('Game finished:', data.winner, data.reason);
    });

    // ---- Granular Game Events (for future animations/sounds) ----
    socket.on('BID_UPDATED', (data) => {
      console.log('Bid:', data.playerId, data.bid ?? 'pass');
    });

    socket.on('BIDDING_FINISHED', (data) => {
      console.log('Bidding done. Declarer:', data.declarerId, 'Bid:', data.winningBid);
    });

    socket.on('TRUMP_SELECTED', (data) => {
      console.log('Trump selected:', data.type, data.suit ?? '');
    });

    socket.on('TRUMP_REVEALED', (data) => {
      console.log('Trump revealed:', data.suit, 'by', data.playerId, data.seventhCard ? `(7th card: ${data.seventhCard.rank} of ${data.seventhCard.suit})` : '');
    });

    socket.on('MARRIAGE_DECLARED', (data) => {
      console.log('Marriage:', data.suit, 'by', data.playerId, '→ effective bid:', data.effectiveBid);
    });

    socket.on('CARD_PLAYED', (data) => {
      console.log('Card played:', data.cardId, 'by', data.playerId);
    });

    socket.on('TRICK_COMPLETED', (data) => {
      console.log('Trick', data.trickNumber, 'won by', data.winnerId);
    });

    socket.on('SCORE_UPDATED', (data) => {
      console.log('Score:', data.team1Points, '-', data.team2Points, '|', data.bidResult);
    });

    // ---- Connection Events ----
    socket.on('PLAYER_DISCONNECTED', (data) => {
      console.log('Player disconnected:', data.playerId);
    });

    socket.on('PLAYER_RECONNECTED', (data) => {
      console.log('Player reconnected:', data.playerId);
    });

    // ---- Error Handling ----
    socket.on('ERROR', (data) => {
      console.error(`[${data.code}] ${data.message}`);
      // Update game store with error for UI display
      useGameStore.setState((state: any) => ({
        ...state,
        lastError: { code: data.code, message: data.message, timestamp: Date.now() },
      }));
    });

    listenersAttached.current = true;

    return () => {
      socket.off('ROOM_UPDATED');
      socket.off('PLAYER_JOINED');
      socket.off('PLAYER_LEFT');
      socket.off('SPECTATOR_JOINED');
      socket.off('SPECTATOR_LEFT');
      socket.off('GAME_STARTED');
      socket.off('GAME_STATE_UPDATED');
      socket.off('GAME_FINISHED');
      socket.off('BID_UPDATED');
      socket.off('BIDDING_FINISHED');
      socket.off('TRUMP_SELECTED');
      socket.off('TRUMP_REVEALED');
      socket.off('MARRIAGE_DECLARED');
      socket.off('CARD_PLAYED');
      socket.off('TRICK_COMPLETED');
      socket.off('SCORE_UPDATED');
      socket.off('PLAYER_DISCONNECTED');
      socket.off('PLAYER_RECONNECTED');
      socket.off('ERROR');
      listenersAttached.current = false;
    };
  }, [socket, setRoom, clearRoom, setGameState, clearGame]);

  return { socket };
}
