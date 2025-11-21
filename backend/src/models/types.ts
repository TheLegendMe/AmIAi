import { Socket } from 'socket.io';

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

export type SeriesType = 'single' | 'best_of_five';

export interface RoomOptions {
  provider?: string;
  mode: GameMode;
  seriesType: SeriesType;
}

export interface Player {
  id: string;
  username: string;
  socket: Socket | null;
  isAI: boolean;
  score: number;
  answers: string[];
  votes: string[];
  isConnected: boolean;
}

export interface Question {
  id: string;
  content: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Answer {
  playerId: string;
  answer: string;
  timestamp: number;
}

export interface VoteResult {
  suspectId: string;
  votes: number;
  voters: string[];
}

export interface RoundResult {
  round: number;
  question: string;
  answers: Map<string, string>;
  votes: Map<string, string[]>;
  aiPlayerId: string;
  correctVoters: string[];
  scores: Map<string, number>;
  topic?: CharacterTopic;
  revealDetails?: boolean;
}

export interface GameStats {
  totalRounds: number;
  averageAnswerLength: number;
  aiDetectionRate: number;
  mostVotedPlayers: { playerId: string; votes: number }[];
}

export interface AIPersonality {
  type: 'obvious' | 'normal' | 'deceptive';
  temperature: number;
  traits: string[];
}

export interface CharacterTopic {
  category: 'person' | 'game';
  title: string;
  description: string;
  clue: string;
}
