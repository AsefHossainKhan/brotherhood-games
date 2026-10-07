import { Server, Socket } from 'socket.io';
import { GameRuntime } from '@brotherhood/game-engine';

/**
 * Handle connection-related socket events:
 * Reconnection, PING/PONG
 */
export function handleConnectionEvents(io: Server, socket: Socket, runtime: GameRuntime) {
  const guestId = socket.data.guestId as string;

  // RECONNECT_ROOM — SPEC: spec-95c801. The guestId is derived from the
  // handshake guestToken, never taken from the event; the roomCode comes from
  // the event and the runtime validates the reservation. A malformed payload
  // (no object, a roomCode that is not a string) is an unknown room.
  socket.on('RECONNECT_ROOM', (data: unknown) => {
    try {
      const raw = (data as { roomCode?: unknown } | null | undefined)?.roomCode;
      const roomCode = typeof raw === 'string' ? raw : '';
      const result = runtime.handleReconnect(guestId, roomCode, socket.id);
      if (!result.ok) {
        socket.emit('RECONNECT_FAILED', { roomCode, reason: result.reason });
        return;
      }

      // The old socket for this guest is dead weight now; drop it so it stops
      // receiving the room's events.
      if (result.supersededSocketId) {
        io.in(result.supersededSocketId).disconnectSockets(true);
      }

      const { room } = result;
      socket.join(room.id);

      // Restore the seat (room) and the hand (personalised game state)
      socket.emit('ROOM_UPDATED', { room: room.toJSON() });
      const visibleState = runtime.getVisibleState(guestId);
      if (visibleState) {
        socket.emit('GAME_STATE_UPDATED', visibleState);
      }

      // Everyone else sees the seat as connected again
      socket.to(room.id).emit('ROOM_UPDATED', { room: room.toJSON() });
    } catch (err: any) {
      socket.emit('ERROR', { code: 'RECONNECT_ROOM_FAILED', message: err.message });
    }
  });

  // PING/PONG
  socket.on('PING', () => {
    socket.emit('PONG', {});
  });
}
