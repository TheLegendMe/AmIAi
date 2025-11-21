export enum GameState {
  WAITING = 'WAITING',
  READY = 'READY',
  ANSWERING = 'ANSWERING',
  VOTING = 'VOTING',
  REVEAL = 'REVEAL',
  ENDED = 'ENDED'
}

export enum GameMode {
  CLASSIC = 'classic',
  CHAR_DUEL = 'char_duel'
}

export interface Player {
  id: string;
  username: string;
  score: number;
  isConnected: boolean;
  isAI?: boolean;
}

export interface Answer {
  playerId: string;
  username: string;
  answer: string;
}

export interface VoteResult {
  playerId: string;
  username?: string;
  votes: number;
}

export interface RoundResult {
  aiPlayer: {
    id: string;
    username: string;
  };
  voteResults: VoteResult[];
  leaderboard: Player[];
  answers: Array<{
    playerId: string;
    username: string;
    answer: string;
    isAI: boolean;
  }>;
  correctVoters: string[];
  revealDetails?: boolean;
  topic?: CharacterTopic;
}

export interface GameStats {
  totalRounds: number;
  averageAnswerLength: number;
  aiDetectionRate: number;
  mostVotedPlayers: Array<{ playerId: string; votes: number }>;
}

export interface RoomState {
  roomId: string;
  players: Player[];
  state: GameState;
  round: number;
  maxRounds: number;
  provider?: string | null;
  mode?: GameMode;
  seriesType?: 'single' | 'best_of_five';
}

export interface ModelProvider {
  name: string;
  model: string;
  enabled: boolean;
  current: boolean;
}

export interface CharacterDuelResult {
  userChar: string;
  userGuess: 'human' | 'ai';
  userGuessCorrect: boolean;
  aiChar: string;
  aiGuess: 'human' | 'ai';
  aiGuessCorrect: boolean;
  aiReason: string;
  aiConfidence: number;
  providerUsed?: string;
  topic: CharacterTopic;
}

export interface CharacterTopic {
  category: 'person' | 'game';
  title: string;
  description: string;
  clue: string;
}
