import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { setupSocketManager } from './socket/SocketManager';
import { healthRouter } from './routes/health';

const app = express();
const httpServer = createServer(app);
const allowedOrigins = config.corsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS'));
  },
}));
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
