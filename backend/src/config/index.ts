import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/amiai'
  },
  
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'auto'
  },
  
  game: {
    minPlayers: 2,           // 最少真人玩家数（不含AI）
    maxPlayers: 5,           // 最多真人玩家数（不含AI）
    maxRounds: 5,
    answerTimeLimit: 45000,  // 45 seconds
    votingTimeLimit: 30000,  // 30 seconds
    matchTimeout: 30000,     // 30 seconds
    aiPlayerCount: 1         // Number of AI players per room
  }
};
