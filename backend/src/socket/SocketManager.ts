import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config.js';
import { GameRuntime, RuntimeEmitter } from '@brotherhood/game-engine';
import { GameRegistry } from '@brotherhood/game-engine';
import { TwentyNineEngine } from '@brotherhood/twenty-nine';
import { handleRoomEvents } from './handlers/roomHandlers.js';
import { handleGameEvents } from './handlers/gameHandlers.js';
import { handleConnectionEvents } from './handlers/connectionHandlers.js';
import { derivePlayerId, isValidGuestToken } from './guestIdentity.js';

/** Socket.IO emitter adapter for the GameRuntime */
const createEmitter = (io: Server): RuntimeEmitter => ({
  emitToSocket(socketId: string, event: string, payload: unknown) {
    io.to(socketId).emit(event, payload);
  },
  emitToRoom(roomId: string, event: string, payload: unknown) {
    io.to(roomId).emit(event, payload);
  },
  emitToRoomExcept(roomId: string, excludeSocketId: string, event: string, payload: unknown) {
    io.to(roomId).except(excludeSocketId).emit(event, payload);
  },
  emitToSockets(socketIds: string[], event: string, payload: unknown) {
    for (const socketId of socketIds) {
      io.to(socketId).emit(event, payload);
    }
  },
});

export function setupSocketManager(httpServer: HttpServer): Server {
  const allowedOrigins = config.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  // Register game engines
  const twentyNineEngine = new TwentyNineEngine();
  GameRegistry.register(twentyNineEngine);

  // Create runtime with emitter
  const emitter = createEmitter(io);
  const runtime = new GameRuntime(emitter);

  // Socket.IO middleware: prove the guest's identity. SPEC: spec-b5759c —
  // every handler reads socket.data.guestId, the public player id derived
  // from the secret guestToken; the token itself goes no further than here.
  io.use((socket, next) => {
    const guestToken = socket.handshake.auth.guestToken as unknown;
    const username = socket.handshake.auth.username as string | undefined;

    if (!isValidGuestToken(guestToken)) {
      return next(new Error('Missing guestToken'));
    }

    const guestId = derivePlayerId(guestToken);
    socket.data.guestId = guestId;
    socket.data.username = username ?? `Guest_${guestId.slice(0, 6)}`;
    next();
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id} (guest: ${socket.data.guestId})`);

    // Tell the client which public id is its own
    socket.emit('SESSION_READY', { playerId: socket.data.guestId });

    // Advertise server capabilities so the client can gate features (e.g. bots)
    socket.emit('SERVER_CONFIG', { allowBots: config.allowBots });

    handleRoomEvents(io, socket, runtime);
    handleGameEvents(io, socket, runtime);
    handleConnectionEvents(io, socket, runtime);

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id} (reason: ${reason})`);
      runtime.handleDisconnect(socket.id);
    });
  });

  return io;
}
