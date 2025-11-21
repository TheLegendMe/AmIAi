import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import MatchService from './services/MatchService';
import { ConnectionTracker } from './routes/stats';
import { GameMode } from './models/types';
import CharacterDuelService from './services/CharacterDuelService';
import AIClient from './services/AIClient';

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Initialize services
const matchService = new MatchService(io);
const aiClient = new AIClient();
const charDuelService = new CharacterDuelService(aiClient);

// REST API Routes
app.get('/', (req, res) => {
  res.json({
    name: 'AmIAI Game Server',
    version: '0.1.0',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/ai/providers', async (req, res) => {
  try {
    const providers = await aiClient.listProviders();
    res.json({ providers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load providers' });
  }
});

app.get('/ai/char-topic', async (_req, res) => {
  try {
    const topic = await charDuelService.generateTopic();
    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate topic' });
  }
});

app.post('/ai/char-duel', async (req, res) => {
  const { userChar, userGuess, provider, topic } = req.body || {};
  if (!userChar || !userGuess || !topic) {
    return res.status(400).json({ error: 'Missing userChar, userGuess or topic' });
  }

  try {
    const result = await charDuelService.playRound({
      userChar,
      userGuess,
      provider,
      topic
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to play round' });
  }
});

// Stats endpoint
app.get('/stats', (req, res) => {
  // 使用ConnectionTracker获取在线人数，确保数据一致性
  const onlinePlayers = ConnectionTracker.getCount();
  res.json({ onlinePlayers });
});

// Socket.io event handlers
io.on('connection', (socket: Socket) => {
  // 记录客户端连接 - 使用ConnectionTracker
  ConnectionTracker.addConnection(socket.id);
  matchService.addConnection(socket.id); // 也通知MatchService

  // Player joins matchmaking queue
  socket.on('join_queue', (data: { username: string; roomSize?: number; modelProvider?: string; mode?: GameMode; seriesType?: 'single' | 'best_of_five' }) => {
    try {
      matchService.joinQueue(socket, data.username, data.roomSize, data.modelProvider, data.mode, data.seriesType);
    } catch (error) {
      console.error('Error joining queue:', error);
      socket.emit('error', { message: 'Failed to join queue' });
    }
  });

  // Player leaves queue
  socket.on('leave_queue', () => {
    try {
      matchService.leaveQueue(socket);
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  });

  // Player submits answer
  socket.on('submit_answer', (data: { answer: string }) => {
    try {
      matchService.handleAnswer(socket, data.answer);
    } catch (error) {
      console.error('Error submitting answer:', error);
      socket.emit('error', { message: 'Failed to submit answer' });
    }
  });

  // Player submits vote
  socket.on('vote', (data: { suspectId: string }) => {
    try {
      matchService.handleVote(socket, data.suspectId);
    } catch (error) {
      console.error('Error voting:', error);
      socket.emit('error', { message: 'Failed to vote' });
    }
  });

  // Player disconnects
  socket.on('disconnect', () => {
    try {
      ConnectionTracker.removeConnection(socket.id);
      matchService.handleDisconnect(socket);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(config.port, async () => {
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║         🎮 AmIAI Game Server          ║
║                                       ║
╚═══════════════════════════════════════╝

✅ Server running on port ${config.port}
🌐 Environment: ${config.nodeEnv}
🔗 CORS Origin: ${config.corsOrigin}
🤖 AI Service: ${config.aiService.url}
  `);

  // 获取并显示AI模型信息
  try {
    const axios = require('axios');
    const response = await axios.get(`${config.aiService.url}/`);
    console.log(`🧠 AI Provider: ${response.data.current_provider}`);
    console.log(`📦 Model: ${response.data.model}`);
    console.log(`✨ Available: ${response.data.available_providers.join(', ')}`);
  } catch (error) {
    console.log(`⚠️  AI Service not responding (will use fallback)`);
  }

  console.log(`\nReady to accept connections!\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    matchService.cleanup();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    matchService.cleanup();
    process.exit(0);
  });
});

export default app;
