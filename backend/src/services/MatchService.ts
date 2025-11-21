import { Server, Socket } from 'socket.io';
import GameRoom from './GameRoom';
import AIClient from './AIClient';
import QuestionService from './QuestionService';
import { config } from '../config/index';
import { GameMode, RoomOptions, SeriesType } from '../models/types';

interface WaitingPlayer {
  socket: Socket;
  username: string;
  preferences: {
    roomSize: number;
    provider?: string;
    mode: GameMode;
    seriesType: SeriesType;
  };
}

export class MatchService {
  private io: Server;
  private rooms: Map<string, GameRoom> = new Map();
  private waitingPlayers: WaitingPlayer[] = [];
  private aiClient: AIClient;
  private questionService: QuestionService;
  private matchTimer?: NodeJS.Timeout;
  private connectedClients: Set<string> = new Set(); // 所有连接的客户端

  constructor(io: Server) {
    this.io = io;
    this.aiClient = new AIClient();
    this.questionService = new QuestionService();
    
    this.startMatchmaking();
  }

  // 客户端连接
  addConnection(socketId: string): void {
    this.connectedClients.add(socketId);
    console.log(`👤 Client connected: ${socketId} (总在线: ${this.connectedClients.size})`);
  }

  // 客户端断开
  removeConnection(socketId: string): void {
    this.connectedClients.delete(socketId);
    console.log(`👋 Client disconnected: ${socketId} (总在线: ${this.connectedClients.size})`);
  }

  // Start matchmaking loop
  private startMatchmaking(): void {
    this.matchTimer = setInterval(() => {
      this.processMatchmaking();
    }, 2000); // Check every 2 seconds
  }

  // Process matchmaking queue
  private processMatchmaking(): void {
    if (this.waitingPlayers.length === 0) return;

    const playersByKey = new Map<string, WaitingPlayer[]>();
    
    for (const player of this.waitingPlayers) {
      const providerKey = player.preferences.provider || 'auto';
      const key = `${player.preferences.mode}|${player.preferences.seriesType}|${player.preferences.roomSize}|${providerKey}`;
      if (!playersByKey.has(key)) {
        playersByKey.set(key, []);
      }
      playersByKey.get(key)!.push(player);
    }

    for (const [key, players] of playersByKey.entries()) {
      const [modeStr, seriesType, roomSizeStr, provider] = key.split('|');
      const roomSize = parseInt(roomSizeStr, 10);
      const mode = modeStr === GameMode.CHAR_DUEL ? GameMode.CHAR_DUEL : GameMode.CLASSIC;
      const requiredPlayers = roomSize - 1;
      
      if (players.length >= requiredPlayers) {
        const targetRoom = this.createRoom({
          mode,
          provider: provider === 'auto' ? undefined : provider,
          seriesType: (seriesType as SeriesType) || 'best_of_five'
        });
        
        for (let i = 0; i < requiredPlayers && i < players.length; i++) {
          const playerData = players[i];
          this.addPlayerToRoom(targetRoom, playerData.socket, playerData.username);
          
          const index = this.waitingPlayers.findIndex(p => p.socket.id === playerData.socket.id);
          if (index !== -1) {
            this.waitingPlayers.splice(index, 1);
          }
        }
        
        console.log(`🏠 Created ${roomSize}人房 (${mode}) with ${requiredPlayers} players (model: ${provider || 'auto'})`);
      }
    }
  }

  // Create a new game room
  private createRoom(options: RoomOptions): GameRoom {
    const room = new GameRoom(this.io, this.aiClient, this.questionService, options);
    this.rooms.set(room.id, room);
    
    console.log(`🏠 Created new room: ${room.id}`);
    
    return room;
  }

  // Add player to specific room
  private addPlayerToRoom(room: GameRoom, socket: Socket, username: string): void {
    room.addPlayer(socket, username);

    // Store room reference in socket
    (socket as any).roomId = room.id;

    // Notify player they joined a room
    socket.emit('room_joined', {
      roomId: room.id,
      message: 'You have joined a game room!',
      provider: room.getProvider() || null,
      mode: room.getMode(),
      seriesType: room.getSeriesType()
    });
  }

  // Player requests to join queue
  joinQueue(
    socket: Socket,
    username: string,
    preferredRoomSize?: number,
    provider?: string,
    mode: GameMode = GameMode.CLASSIC,
    seriesType: SeriesType = 'best_of_five'
  ): void {
    // Check if already in queue
    const alreadyInQueue = this.waitingPlayers.some(p => p.socket.id === socket.id);
    if (alreadyInQueue) {
      socket.emit('error', { message: 'Already in queue' });
      return;
    }

    // Check if already in a room
    if ((socket as any).roomId) {
      socket.emit('error', { message: 'Already in a game' });
      return;
    }

    // Validate username
    if (!username || username.trim().length === 0 || username.length > 20) {
      socket.emit('error', { message: 'Invalid username' });
      return;
    }

    // 验证房间人数（3-5人）
    const roomSize = preferredRoomSize && preferredRoomSize >= 3 && preferredRoomSize <= 5 
      ? preferredRoomSize 
      : 4; // 默认4人
    
    const sanitizedProvider = provider && provider !== 'auto'
      ? provider.toLowerCase()
      : undefined;

    this.waitingPlayers.push({
      socket,
      username: username.trim(),
      preferences: {
        roomSize,
        provider: sanitizedProvider,
        mode,
        seriesType
      }
    });
    
    (socket as any).preferredRoomSize = roomSize;
    (socket as any).preferredProvider = sanitizedProvider;
    (socket as any).seriesType = seriesType;
    
    console.log(`👤 ${username} joined queue (${this.waitingPlayers.length} waiting, ${mode}/${seriesType}, prefer ${roomSize}人房, model: ${sanitizedProvider || 'auto'})`);

    socket.emit('queue_joined', {
      position: this.waitingPlayers.length,
      message: 'Looking for players...'
    });

    // Try immediate match
    this.processMatchmaking();
  }

  // Player leaves queue
  leaveQueue(socket: Socket): void {
    const index = this.waitingPlayers.findIndex(p => p.socket.id === socket.id);
    
    if (index !== -1) {
      const playerData = this.waitingPlayers.splice(index, 1)[0];
      console.log(`👋 ${playerData.username} left queue`);
      
      socket.emit('queue_left', {
        message: 'You left the queue'
      });
    }
  }

  // Handle player disconnect
  handleDisconnect(socket: Socket): void {
    // Remove from connected clients
    this.removeConnection(socket.id);

    // Remove from queue
    this.leaveQueue(socket);

    // Remove from room
    const roomId = (socket as any).roomId;
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        room.removePlayer(socket.id);

        // Clean up empty rooms
        if (room.getPlayerCount() === 0) {
          this.rooms.delete(roomId);
          console.log(`🗑️  Deleted empty room: ${roomId}`);
        }
      }
    }
  }

  // Handle answer submission
  handleAnswer(socket: Socket, answer: string): void {
    const roomId = (socket as any).roomId;
    if (!roomId) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    room.submitAnswer(socket.id, answer);
  }

  // Handle vote submission
  handleVote(socket: Socket, suspectId: string): void {
    const roomId = (socket as any).roomId;
    if (!roomId) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    room.vote(socket.id, suspectId);
  }

  // Get statistics
  getStats() {
    try {
      // 直接使用连接数作为在线人数
      const onlinePlayers = this.connectedClients.size;
      
      return {
        onlinePlayers,  // 实时在线人数（所有连接的客户端）
        totalRooms: this.rooms.size,
        waitingPlayers: this.waitingPlayers.length,
        activeGames: Array.from(this.rooms.values()).filter(r => !r.isWaiting()).length
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        onlinePlayers: 0,
        totalRooms: 0,
        waitingPlayers: 0,
        activeGames: 0
      };
    }
  }

  // Cleanup
  cleanup(): void {
    clearInterval(this.matchTimer);
    this.rooms.clear();
    this.waitingPlayers = [];
  }
}

export default MatchService;
