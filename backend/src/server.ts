import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { setupSocketManager } from './socket/SocketManager';
import { healthRouter } from './routes/health';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Routes
app.use('/health', healthRouter);

// Socket.IO
const io = setupSocketManager(httpServer);

// Start server
httpServer.listen(config.port, () => {
  console.log(`🎮 Brotherhood Games backend running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   CORS origin: ${config.corsOrigin}`);
});

export { app, httpServer, io };
