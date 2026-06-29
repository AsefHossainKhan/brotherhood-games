import { Server, Socket } from 'socket.io';
import { GameRuntime } from '@brotherhood/game-engine';

/**
 * Handle connection-related socket events:
 * Reconnection, PING/PONG
 */
export function handleConnectionEvents(io: Server, socket: Socket, runtime: GameRuntime) {
  const guestId = socket.data.guestId as string;

  // Attempt reconnection on connect
  const room = runtime.handleReconnect(guestId, socket.id);
  if (room) {
    socket.join(room.id);
    socket.emit('PLAYER_RECONNECTED', { playerId: guestId });
    socket.to(room.id).emit('PLAYER_RECONNECTED', { playerId: guestId });

    // Send current state
    const visibleState = runtime.getVisibleState(guestId);
    if (visibleState) {
      socket.emit('GAME_STATE_UPDATED', visibleState);
    }
  }

  // PING/PONG
  socket.on('PING', () => {
    socket.emit('PONG', {});
  });
}
