import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { GameRuntime, RuntimeEmitter } from '@brotherhood/game-engine';
import { GameRegistry } from '@brotherhood/game-engine';
import { TwentyNineEngine } from '@brotherhood/twenty-nine';
import { handleRoomEvents } from './handlers/roomHandlers';
import { handleGameEvents } from './handlers/gameHandlers';
import { handleConnectionEvents } from './handlers/connectionHandlers';

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
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
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

  // Socket.IO middleware: extract guest identity
  io.use((socket, next) => {
    const guestId = socket.handshake.auth.guestId as string | undefined;
    const username = socket.handshake.auth.username as string | undefined;

    if (!guestId) {
      return next(new Error('Missing guestId'));
    }

    // Attach identity to socket data
    socket.data.guestId = guestId;
    socket.data.username = username ?? `Guest_${guestId.slice(0, 6)}`;
    next();
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id} (guest: ${socket.data.guestId})`);

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
