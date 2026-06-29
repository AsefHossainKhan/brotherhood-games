import { Server, Socket } from 'socket.io';
import { GameRuntime } from '@brotherhood/game-engine';

/**
 * Handle room-related socket events:
 * CREATE_ROOM, JOIN_ROOM, LEAVE_ROOM, BECOME_SPECTATOR
 */
export function handleRoomEvents(io: Server, socket: Socket, runtime: GameRuntime) {
  const guestId = socket.data.guestId as string;
  const username = socket.data.username as string;

  // CREATE_ROOM
  socket.on('CREATE_ROOM', (data: { gameType?: string; settings?: Record<string, unknown>; username?: string }) => {
    try {
      // Use username from event payload (user may have changed it after connecting)
      const currentUsername = data.username || username;
      socket.data.username = currentUsername;

      const gameType = (data.gameType ?? 'twenty-nine') as 'twenty-nine' | 'poker';
      const room = runtime.createRoom(gameType, guestId, currentUsername, socket.id, data.settings as any);

      // Join the socket.io room
      socket.join(room.id);

      socket.emit('ROOM_CREATED', {
        roomId: room.id,
        roomCode: room.code,
      });

      socket.emit('ROOM_UPDATED', { room: room.toJSON() });
    } catch (err: any) {
      socket.emit('ERROR', { code: 'CREATE_ROOM_FAILED', message: err.message });
    }
  });

  // JOIN_ROOM
  socket.on('JOIN_ROOM', (data: { roomCode: string; username?: string }) => {
    try {
      const currentUsername = data.username || username;
      socket.data.username = currentUsername;

      const { room, seat } = runtime.joinRoom(data.roomCode, guestId, currentUsername, socket.id);

      // Join the socket.io room
      socket.join(room.id);

      socket.emit('ROOM_UPDATED', { room: room.toJSON() });

      // Notify others
      socket.to(room.id).emit('PLAYER_JOINED', {
        player: room.players.get(guestId),
      });
    } catch (err: any) {
      socket.emit('ERROR', { code: 'JOIN_ROOM_FAILED', message: err.message });
    }
  });

  // LEAVE_ROOM
  socket.on('LEAVE_ROOM', () => {
    try {
      const result = runtime.leaveRoom(guestId);
      if (!result) return;

      socket.leave(result.room.id);

      socket.to(result.room.id).emit('PLAYER_LEFT', { playerId: guestId });
      socket.to(result.room.id).emit('ROOM_UPDATED', { room: result.room.toJSON() });
    } catch (err: any) {
      socket.emit('ERROR', { code: 'LEAVE_ROOM_FAILED', message: err.message });
    }
  });

  // BECOME_SPECTATOR
  socket.on('BECOME_SPECTATOR', (data: { roomCode: string; username?: string }) => {
    try {
      const currentUsername = data.username || username;
      socket.data.username = currentUsername;

      const room = runtime.joinAsSpectator(data.roomCode, guestId, currentUsername, socket.id);

      socket.join(room.id);

      socket.emit('ROOM_UPDATED', { room: room.toJSON() });

      socket.to(room.id).emit('SPECTATOR_JOINED', {
        spectator: room.spectators.get(guestId),
      });
    } catch (err: any) {
      socket.emit('ERROR', { code: 'BECOME_SPECTATOR_FAILED', message: err.message });
    }
  });

  // CHANGE_TEAM
  socket.on('CHANGE_TEAM', (data: { team: 0 | 1 }) => {
    try {
      const room = runtime.getUserRoom(guestId);
      if (!room) {
        socket.emit('ERROR', { code: 'NOT_IN_ROOM', message: 'Not in any room' });
        return;
      }

      room.changeTeam(guestId, data.team);

      // Broadcast updated room to everyone
      io.to(room.id).emit('ROOM_UPDATED', { room: room.toJSON() });
    } catch (err: any) {
      socket.emit('ERROR', { code: 'CHANGE_TEAM_FAILED', message: err.message });
    }
  });

  // CHANGE_SEAT
  socket.on('CHANGE_SEAT', (data: { seat: number }) => {
    try {
      const room = runtime.getUserRoom(guestId);
      if (!room) {
        socket.emit('ERROR', { code: 'NOT_IN_ROOM', message: 'Not in any room' });
        return;
      }

      room.changeSeat(guestId, data.seat);

      // Broadcast updated room to everyone
      io.to(room.id).emit('ROOM_UPDATED', { room: room.toJSON() });
    } catch (err: any) {
      socket.emit('ERROR', { code: 'CHANGE_SEAT_FAILED', message: err.message });
    }
  });
}
