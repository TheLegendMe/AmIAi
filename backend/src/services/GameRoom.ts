import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, Question, RoundResult, GameStats, RoomOptions, GameMode, CharacterTopic, SeriesType } from '../models/types';
import AIClient from './AIClient';
import QuestionService from './QuestionService';
import { config } from '../config';

export class GameRoom {
  public id: string;
  public players: Map<string, Player> = new Map();
  public state: GameState = GameState.WAITING;
  public currentRound: number = 0;
  public maxRounds: number = config.game.maxRounds;
  public currentQuestion: Question | null = null;
  public answers: Map<string, string> = new Map();
  public votes: Map<string, string> = new Map(); // voterId -> suspectId
  
  private io: Server;
  private aiClient: AIClient;
  private questionService: QuestionService;
  private timer?: NodeJS.Timeout;
  private roundHistory: RoundResult[] = [];
  private usedQuestionIds: string[] = [];
  private currentTopic: CharacterTopic | null = null;

  private selectedProvider?: string;
  private mode: GameMode;
  private seriesType: SeriesType;

  constructor(io: Server, aiClient: AIClient, questionService: QuestionService, options: RoomOptions) {
    this.id = uuidv4();
    this.io = io;
    this.aiClient = aiClient;
    this.questionService = questionService;
    this.selectedProvider = options.provider;
    this.mode = options.mode;
    this.seriesType = options.seriesType;
    this.maxRounds = this.seriesType === 'single' ? 1 : config.game.maxRounds;
  }

  // Add a player to the room
  addPlayer(socket: Socket, username: string): void {
    // 生成匿名名字
    const anonymousName = this.generateAnonymousName();
    
    const player: Player = {
      id: socket.id,
      username: anonymousName,  // 使用匿名名字
      socket,
      isAI: false,
      score: 0,
      answers: [],
      votes: [],
      isConnected: true
    };

    this.players.set(socket.id, player);
    console.log(`✅ Player ${anonymousName} (${socket.id}) joined room ${this.id}`);

    this.broadcastRoomState();

    // Auto-start if we have enough players
    if (this.players.size >= config.game.minPlayers && this.state === GameState.WAITING) {
      setTimeout(() => this.start(), 3000);
    }
  }

  // Remove a player from the room
  removePlayer(socketId: string): void {
    const player = this.players.get(socketId);
    if (player) {
      console.log(`👋 Player ${player.username} left room ${this.id}`);
      this.players.delete(socketId);

      // If no players left, mark for cleanup
      if (this.players.size === 0) {
        this.cleanup();
      } else {
        this.broadcastRoomState();
      }
    }
  }

  // 生成匿名名字
  private generateAnonymousName(): string {
    const adjectives = [
      '神秘', '沉默', '冷静', '活跃', '睿智', '敏锐', 
      '谨慎', '大胆', '幽默', '严肃', '温和', '直率'
    ];
    const nouns = [
      '侦探', '观察者', '思考者', '玩家', '挑战者', '猎人',
      '分析师', '策略家', '参与者', '竞技者', '探索者', '判官'
    ];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    
    return `${adj}的${noun}${num}`;
  }

  // Add AI player
  private addAIPlayer(): void {
    const aiId = `ai_${uuidv4()}`;
    const aiName = this.generateAnonymousName();  // AI也用匿名名字

    const aiPlayer: Player = {
      id: aiId,
      username: aiName,
      socket: null,
      isAI: true,
      score: 0,
      answers: [],
      votes: [],
      isConnected: true
    };

    this.players.set(aiId, aiPlayer);
    console.log(`🤖 AI player ${aiName} added to room ${this.id}`);
  }

  // Start the game
  async start(): Promise<void> {
    if (this.state !== GameState.WAITING) return;

    // Add AI players if needed
    const aiCount = Array.from(this.players.values()).filter(p => p.isAI).length;
    for (let i = aiCount; i < config.game.aiPlayerCount; i++) {
      this.addAIPlayer();
    }

    this.state = GameState.READY;
    
    const playerList = Array.from(this.players.values()).map(p => ({
      id: p.id,
      username: p.username,
      isAI: false // Don't reveal who is AI!
    }));

    this.broadcastToRoom('game_start', {
      players: playerList,
      totalRounds: this.maxRounds,
      roomId: this.id,
      mode: this.mode,
      seriesType: this.seriesType
    });

    console.log(`🎮 Game started in room ${this.id}`);

    // Start first round after countdown
    await this.delay(3000);
    this.nextRound();
  }

  // Move to next round
  async nextRound(): Promise<void> {
    if (this.currentRound >= this.maxRounds) {
      this.endGame();
      return;
    }

    this.currentRound++;
    this.answers.clear();
    this.votes.clear();
    this.currentTopic = null;
    this.state = GameState.ANSWERING;

    await this.prepareRoundContent();

    if (!this.currentQuestion) {
      console.error('⚠️ Failed to prepare question for round, aborting room');
      this.endGame();
      return;
    }

    let intro = this.currentQuestion.content;
    if (this.mode === GameMode.CHAR_DUEL && this.currentTopic) {
      const topic = this.currentTopic as CharacterTopic;
      intro = `${this.currentQuestion.content} | 提示: ${topic.clue}`;
    }

    console.log(`📝 Round ${this.currentRound} started in room ${this.id}: ${intro}`);

    this.broadcastToRoom('round_start', {
      round: this.currentRound,
      maxRounds: this.maxRounds,
      question: this.currentQuestion.content,
      topic: this.currentTopic,
      seriesType: this.seriesType,
      timeLimit: config.game.answerTimeLimit / 1000 // Convert to seconds
    });

    // AI players answer automatically with delay
    this.scheduleAIAnswers();

    // Set timeout for answering phase
    this.timer = setTimeout(() => {
      this.startVoting();
    }, config.game.answerTimeLimit);
  }

  private async prepareRoundContent(): Promise<void> {
    if (this.mode === GameMode.CHAR_DUEL) {
      try {
        this.currentTopic = await this.aiClient.generateCharacterTopic();
      } catch (error) {
        console.error('Failed to generate char duel topic:', error);
        this.currentTopic = {
          category: 'person',
          title: '李白',
          description: '盛唐诗人，以豪放著称',
          clue: '酒'
        };
      }

      this.currentQuestion = {
        id: `char-${this.currentRound}-${Date.now()}`,
        content: `【一字识AI】${this.currentTopic.category === 'person' ? '人物' : '游戏'} · ${this.currentTopic.title}`,
        category: 'char_duel',
        difficulty: 'medium'
      };
    } else {
      this.currentQuestion = this.questionService.getRandomQuestion(this.usedQuestionIds);
      this.usedQuestionIds.push(this.currentQuestion.id);
    }
  }

  // Schedule AI answers with realistic delays
  private async scheduleAIAnswers(): Promise<void> {
    const aiPlayers = Array.from(this.players.values()).filter(p => p.isAI);
    
    for (const ai of aiPlayers) {
      // Random delay between 2-8 seconds to simulate thinking
      const delay = 2000 + Math.random() * 6000;
      
      setTimeout(async () => {
        if (this.state !== GameState.ANSWERING || !this.currentQuestion) return;
        
        try {
          let answer: string;
          if (this.mode === GameMode.CHAR_DUEL && this.currentTopic) {
            answer = await this.aiClient.generateCharacterAnswer(this.currentTopic, this.selectedProvider);
          } else {
            answer = await this.aiClient.generateAnswer(
              this.currentQuestion.content,
              'deceptive',
              this.selectedProvider
            );
          }
          this.submitAnswer(ai.id, answer);
        } catch (error) {
          console.error(`AI answer generation failed for ${ai.username}:`, error);
        }
      }, delay);
    }
  }

  // Submit an answer
  submitAnswer(playerId: string, answer: string): void {
    if (this.state !== GameState.ANSWERING) {
      console.log(`⚠️  Answer rejected: game not in answering state`);
      return;
    }

    const player = this.players.get(playerId);
    if (!player) {
      console.log(`⚠️  Answer rejected: player ${playerId} not found`);
      return;
    }

    if (this.answers.has(playerId)) {
      console.log(`⚠️  Answer rejected: ${player.username} already answered`);
      return;
    }

    // Trim and validate answer
    answer = answer.trim();
    if (this.mode === GameMode.CHAR_DUEL) {
      if (answer.length !== 1 || !/^[\u4e00-\u9fa5]$/.test(answer)) {
        console.log(`⚠️  Answer rejected: invalid char duel answer`);
        return;
      }
    } else if (answer.length === 0 || answer.length > 500) {
      console.log(`⚠️  Answer rejected: invalid length`);
      return;
    }

    this.answers.set(playerId, answer);
    player.answers.push(answer);

    console.log(`💬 ${player.username} submitted answer (${this.answers.size}/${this.players.size})`);

    // Notify room (without revealing who answered)
    this.broadcastToRoom('answer_submitted', {
      totalSubmitted: this.answers.size,
      totalPlayers: this.players.size
    });

    // If everyone answered, move to voting early
    if (this.answers.size === this.players.size) {
      clearTimeout(this.timer);
      setTimeout(() => this.startVoting(), 1000);
    }
  }

  // Start voting phase
  startVoting(): void {
    if (this.state !== GameState.ANSWERING) return;

    this.state = GameState.VOTING;

    // Shuffle answers to make them anonymous
    const shuffledAnswers = this.shuffleAnswers();

    console.log(`🗳️  Voting started in room ${this.id}`);

    this.broadcastToRoom('voting_start', {
      answers: shuffledAnswers,
      timeLimit: config.game.votingTimeLimit / 1000
    });

    // Set timeout for voting phase
    this.timer = setTimeout(() => {
      this.revealResults();
    }, config.game.votingTimeLimit);
  }

  // Shuffle answers for anonymity
  private shuffleAnswers(): Array<{ playerId: string; username: string; answer: string }> {
    const answersArray = Array.from(this.answers.entries()).map(([playerId, answer]) => {
      const player = this.players.get(playerId);
      return {
        playerId,
        username: player?.username || 'Unknown',
        answer
      };
    });

    // Fisher-Yates shuffle
    for (let i = answersArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answersArray[i], answersArray[j]] = [answersArray[j], answersArray[i]];
    }

    return answersArray;
  }

  // Submit a vote
  vote(voterId: string, suspectId: string): void {
    if (this.state !== GameState.VOTING) {
      console.log(`⚠️  Vote rejected: not in voting phase`);
      return;
    }

    const voter = this.players.get(voterId);
    if (!voter || voter.isAI) {
      console.log(`⚠️  Vote rejected: invalid voter`);
      return;
    }

    // Can't vote for yourself
    if (voterId === suspectId) {
      console.log(`⚠️  Vote rejected: can't vote for self`);
      return;
    }

    // Can't vote if you didn't answer
    if (!this.answers.has(voterId)) {
      console.log(`⚠️  Vote rejected: voter didn't answer`);
      return;
    }

    this.votes.set(voterId, suspectId);
    voter.votes.push(suspectId);

    console.log(`✅ ${voter.username} voted`);

    this.broadcastToRoom('vote_received', {
      voterId: 'hidden',
      totalVotes: this.votes.size
    });

    // If all real players voted, reveal early
    const realPlayersWhoAnswered = Array.from(this.players.values())
      .filter(p => !p.isAI && this.answers.has(p.id));
    
    if (this.votes.size === realPlayersWhoAnswered.length) {
      clearTimeout(this.timer);
      setTimeout(() => this.revealResults(), 1000);
    }
  }

  // Reveal round results
  revealResults(): void {
    if (this.state !== GameState.VOTING && this.state !== GameState.ANSWERING) return;

    this.state = GameState.REVEAL;

    // Find AI player
    const aiPlayer = Array.from(this.players.values()).find(p => p.isAI);
    const aiId = aiPlayer?.id || '';

    // Count votes
    const voteCount = new Map<string, number>();
    for (const suspectId of this.votes.values()) {
      voteCount.set(suspectId, (voteCount.get(suspectId) || 0) + 1);
    }

    // Calculate scores
    const correctVoters: string[] = [];
    
    for (const [voterId, suspectId] of this.votes.entries()) {
      const voter = this.players.get(voterId);
      if (!voter) continue;

      // Voted correctly for AI: +10 points
      if (suspectId === aiId) {
        voter.score += 10;
        correctVoters.push(voterId);
      }
    }

    // Players wrongly accused: -3 points per vote
    for (const [suspectId, votes] of voteCount.entries()) {
      const suspect = this.players.get(suspectId);
      if (suspect && !suspect.isAI) {
        suspect.score -= 3 * votes;
      }
    }

    // AI survived: +5 points
    if (aiPlayer) {
      const aiVotes = voteCount.get(aiId) || 0;
      const totalVotes = this.votes.size;
      
      if (aiVotes < totalVotes / 2) {
        aiPlayer.score += 5;
      }
    }

    const voteResults = Array.from(voteCount.entries()).map(([playerId, votes]) => ({
      playerId,
      username: this.players.get(playerId)?.username,
      votes
    }));

    const revealDetails = this.seriesType !== 'best_of_five' || this.currentRound >= this.maxRounds;

    console.log(`🎭 Results revealed in room ${this.id} (details: ${revealDetails})`);

    this.broadcastToRoom('round_result', {
      aiPlayer: revealDetails
        ? {
            id: aiId,
            username: aiPlayer?.username || 'Unknown'
          }
        : {
            id: 'hidden',
            username: '暂不揭晓'
          },
      voteResults: revealDetails ? voteResults : [],
      leaderboard: revealDetails ? this.getLeaderboard() : [],
      answers: revealDetails
        ? Array.from(this.answers.entries()).map(([playerId, answer]) => ({
            playerId,
            username: this.players.get(playerId)?.username,
            answer,
            isAI: this.players.get(playerId)?.isAI
          }))
        : [],
      correctVoters: revealDetails ? correctVoters : [],
      topic: this.currentTopic,
      revealDetails
    });

    // Move to next round after delay
    this.timer = setTimeout(() => {
      this.nextRound();
    }, 8000);
  }

  // End the game
  endGame(): void {
    this.state = GameState.ENDED;

    const leaderboard = this.getLeaderboard();
    const winner = leaderboard[0];
    const stats = this.calculateStats();

    console.log(`🏁 Game ended in room ${this.id}. Winner: ${winner?.username}`);

    this.broadcastToRoom('game_end', {
      winner,
      leaderboard,
      stats
    });

    // Cleanup after delay
    this.timer = setTimeout(() => {
      this.cleanup();
    }, 30000);
  }

  // Get leaderboard
  private getLeaderboard() {
    return Array.from(this.players.values())
      .map(p => ({
        id: p.id,
        username: p.username,
        score: p.score,
        isAI: p.isAI
      }))
      .sort((a, b) => b.score - a.score);
  }

  // Calculate game statistics
  private calculateStats(): GameStats {
    const totalAnswers = Array.from(this.answers.values());
    const avgLength = totalAnswers.length > 0
      ? totalAnswers.reduce((sum, a) => sum + a.length, 0) / totalAnswers.length
      : 0;

    const aiPlayer = Array.from(this.players.values()).find(p => p.isAI);
    const aiId = aiPlayer?.id;
    
    let correctVotes = 0;
    let totalVotesAgainstAI = 0;

    for (const suspectId of this.votes.values()) {
      if (suspectId === aiId) {
        correctVotes++;
      }
    }

    totalVotesAgainstAI = correctVotes;
    const totalVotes = this.votes.size;
    const detectionRate = totalVotes > 0 ? correctVotes / totalVotes : 0;

    // Most voted players
    const voteCount = new Map<string, number>();
    for (const suspectId of this.votes.values()) {
      voteCount.set(suspectId, (voteCount.get(suspectId) || 0) + 1);
    }

    const mostVoted = Array.from(voteCount.entries())
      .map(([playerId, votes]) => ({ playerId, votes }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 3);

    return {
      totalRounds: this.currentRound,
      averageAnswerLength: Math.round(avgLength),
      aiDetectionRate: Math.round(detectionRate * 100) / 100,
      mostVotedPlayers: mostVoted
    };
  }

  // Broadcast to all players in room
  private broadcastToRoom(event: string, data: any): void {
    for (const player of this.players.values()) {
      if (player.socket) {
        player.socket.emit(event, data);
      }
    }
  }

  // Broadcast room state
  private broadcastRoomState(): void {
    const playerList = Array.from(this.players.values()).map(p => ({
      id: p.id,
      username: p.username,
      score: p.score,
      isConnected: p.isConnected,
      isAI: false // Never reveal who is AI during the game
    }));

    this.broadcastToRoom('room_state', {
      roomId: this.id,
      players: playerList,
      state: this.state,
      round: this.currentRound,
      maxRounds: this.maxRounds,
      provider: this.selectedProvider,
      mode: this.mode,
      seriesType: this.seriesType
    });
  }

  // Utility: delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup room
  private cleanup(): void {
    clearTimeout(this.timer);
    this.players.clear();
    console.log(`🧹 Room ${this.id} cleaned up`);
  }

  // Get player count
  getPlayerCount(): number {
    return this.players.size;
  }

  // Check if room is full
  isFull(): boolean {
    return this.players.size >= config.game.maxPlayers;
  }

  // Check if room is waiting
  isWaiting(): boolean {
    return this.state === GameState.WAITING;
  }

  getProvider(): string | undefined {
    return this.selectedProvider;
  }

  getMode(): GameMode {
    return this.mode;
  }

  getSeriesType(): SeriesType {
    return this.seriesType;
  }
}

export default GameRoom;
