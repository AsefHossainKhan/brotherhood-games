'use client';

import { useRouter } from 'next/navigation';
import { useSocketStore } from '@/stores/socketStore';
import { useRoomStore } from '@/stores/roomStore';

/**
 * Hook for room management actions.
 */
export function useRoom() {
  const socket = useSocketStore((s) => s.socket);
  const updateUsername = useSocketStore((s) => s.updateUsername);
  const room = useRoomStore();
  const router = useRouter();

  const createRoom = (gameType: string = 'twenty-nine', settings?: Record<string, unknown>) => {
    const currentUsername = useSocketStore.getState().username;
    socket?.emit('CREATE_ROOM', { gameType, settings, username: currentUsername });
  };

  const joinRoom = (roomCode: string) => {
    const currentUsername = useSocketStore.getState().username;
    socket?.emit('JOIN_ROOM', { roomCode, username: currentUsername });
  };

  const leaveRoom = () => {
    socket?.emit('LEAVE_ROOM');
    room.clearRoom();
    router.push('/');
  };

  const becomeSpectator = (roomCode: string) => {
    socket?.emit('BECOME_SPECTATOR', { roomCode });
  };

  const startGame = () => {
    socket?.emit('START_GAME');
  };

  const changeTeam = (team: 0 | 1) => {
    socket?.emit('CHANGE_TEAM', { team });
  };

  const changeSeat = (seat: number) => {
    socket?.emit('CHANGE_SEAT', { seat });
  };

  return {
    ...room,
    createRoom,
    joinRoom,
    leaveRoom,
    becomeSpectator,
    startGame,
    changeTeam,
    changeSeat,
    updateUsername,
  };
}
