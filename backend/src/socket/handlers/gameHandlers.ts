import { Server, Socket } from 'socket.io';
import { GameRuntime } from '@brotherhood/game-engine';

/**
 * Handle game-related socket events:
 * START_GAME, PLACE_BID, PASS_BID, SELECT_TRUMP, etc.
 */
export function handleGameEvents(io: Server, socket: Socket, runtime: GameRuntime) {
  const guestId = socket.data.guestId as string;

  /**
   * Send personalized game state to each connected player and spectator.
   * Each player sees only what they should (hidden trump, own hand, etc.)
   */
  function broadcastVisibleState(room: { id: string; players: Map<string, any>; spectators: Map<string, any> }) {
    for (const player of room.players.values()) {
      const visibleState = runtime.getVisibleState(player.userId);
      if (visibleState) {
        const socketId = runtime.getSocketIdForUser(player.userId);
        if (socketId) {
          io.to(socketId).emit('GAME_STATE_UPDATED', visibleState);
        }
      }
    }
    for (const spectator of room.spectators.values()) {
      const visibleState = runtime.getVisibleState(spectator.userId);
      if (visibleState) {
        const socketId = runtime.getSocketIdForUser(spectator.userId);
        if (socketId) {
          io.to(socketId).emit('GAME_STATE_UPDATED', visibleState);
        }
      }
    }
  }

  /** Generic game action handler — delegates to runtime, then broadcasts state */
  function handleAction(actionType: string, payload: Record<string, unknown> = {}) {
    try {
      const { room } = runtime.handleGameAction(guestId, actionType, payload);
      broadcastVisibleState(room);
    } catch (err: any) {
      socket.emit('ERROR', { code: 'ACTION_FAILED', message: err.message });
    }
  }

  // START_GAME
  socket.on('START_GAME', () => {
    try {
      const room = runtime.getUserRoom(guestId);
      if (!room) {
        socket.emit('ERROR', { code: 'NOT_IN_ROOM', message: 'Not in any room' });
        return;
      }

      const { room: updatedRoom } = runtime.startGame(room.id, guestId);

      // Notify all players game has started + updated room state
      io.to(room.id).emit('ROOM_UPDATED', { room: updatedRoom.toJSON() });
      io.to(room.id).emit('GAME_STARTED', { matchId: updatedRoom.matchId });

      // Send personalized state to each player (hands are private)
      broadcastVisibleState(updatedRoom);
    } catch (err: any) {
      socket.emit('ERROR', { code: 'START_GAME_FAILED', message: err.message });
    }
  });

  // Bidding
  socket.on('PLACE_BID', (data: { bid: number }) => handleAction('PLACE_BID', { bid: data.bid }));
  socket.on('PASS_BID', () => handleAction('PASS_BID'));

  // Trump selection
  socket.on('SELECT_TRUMP', (data: { suit: string }) => handleAction('SELECT_TRUMP', { suit: data.suit }));
  socket.on('SELECT_SEVENTH_CARD_TRUMP', () => handleAction('SELECT_SEVENTH_CARD_TRUMP'));
  socket.on('SELECT_JOKER', () => handleAction('SELECT_JOKER'));

  // Double phase
  socket.on('DECLARE_DOUBLE', () => handleAction('DECLARE_DOUBLE'));
  socket.on('DECLARE_REDOUBLE', () => handleAction('DECLARE_REDOUBLE'));
  socket.on('DECLARE_FULLSET', () => handleAction('DECLARE_FULLSET'));
  socket.on('PASS_DOUBLE', () => handleAction('PASS_DOUBLE'));

  // Playing
  socket.on('PLAY_CARD', (data: { cardIndex: number }) => handleAction('PLAY_CARD', { cardIndex: data.cardIndex }));

  // Trump reveal
  socket.on('REQUEST_TRUMP_REVEAL', () => handleAction('REQUEST_TRUMP_REVEAL'));

  // Weak hand
  socket.on('CANCEL_WEAK_HAND', () => handleAction('CANCEL_WEAK_HAND'));
  socket.on('KEEP_WEAK_HAND', () => handleAction('KEEP_WEAK_HAND'));

  // Bidding - call
  socket.on('CALL_BID', () => handleAction('CALL_BID'));

  // Game continuation
  socket.on('START_NEXT_HAND', () => handleAction('START_NEXT_HAND'));
}
