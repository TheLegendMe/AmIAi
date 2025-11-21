import { create } from 'zustand';
import { GameState, Player, Answer, RoundResult, GameStats, GameMode, CharacterTopic } from '../types/game';

interface GameStore {
  // Connection state
  connected: boolean;
  username: string;
  
  // Queue state
  inQueue: boolean;
  queuePosition: number;
  
  // Room state
  roomId: string | null;
  players: Player[];
  gameState: GameState;
  gameMode: GameMode;
  seriesType: 'single' | 'best_of_five';
  currentRound: number;
  maxRounds: number;
  
  // Round state
  currentQuestion: string | null;
  currentTopic: CharacterTopic | null;
  answers: Answer[];
  myAnswer: string;
  hasAnswered: boolean;
  hasVoted: boolean;
  votedFor: string | null;
  timeRemaining: number;
  
  // Results
  roundResult: RoundResult | null;
  gameStats: GameStats | null;
  winner: Player | null;
  selectedModel: string | null;
  
  // UI state
  error: string | null;
  notification: string | null;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setUsername: (username: string) => void;
  setInQueue: (inQueue: boolean, position?: number) => void;
  setRoomId: (roomId: string | null) => void;
  setPlayers: (players: Player[]) => void;
  setGameState: (gameState: GameState) => void;
  setCurrentRound: (round: number, maxRounds: number) => void;
  setCurrentQuestion: (question: string) => void;
  setCurrentTopic: (topic: CharacterTopic | null) => void;
  setAnswers: (answers: Answer[]) => void;
  setMyAnswer: (answer: string) => void;
  setHasAnswered: (hasAnswered: boolean) => void;
  setHasVoted: (hasVoted: boolean) => void;
  setVotedFor: (playerId: string | null) => void;
  setTimeRemaining: (time: number) => void;
  setRoundResult: (result: RoundResult) => void;
  setGameStats: (stats: GameStats) => void;
  setWinner: (winner: Player) => void;
  setGameMode: (mode: GameMode) => void;
  setSeriesType: (type: 'single' | 'best_of_five') => void;
  setSelectedModel: (provider: string | null) => void;
  setError: (error: string | null) => void;
  setNotification: (notification: string | null) => void;
  reset: () => void;
  resetRound: () => void;
}

type GameStoreState = Omit<GameStore,
  | 'setConnected'
  | 'setUsername'
  | 'setInQueue'
  | 'setRoomId'
  | 'setPlayers'
  | 'setGameState'
  | 'setCurrentRound'
  | 'setCurrentQuestion'
  | 'setCurrentTopic'
  | 'setAnswers'
  | 'setMyAnswer'
  | 'setHasAnswered'
  | 'setHasVoted'
  | 'setVotedFor'
  | 'setTimeRemaining'
  | 'setRoundResult'
  | 'setGameStats'
  | 'setWinner'
  | 'setGameMode'
  | 'setSeriesType'
  | 'setSelectedModel'
  | 'setError'
  | 'setNotification'
  | 'reset'
  | 'resetRound'
>;

const initialState: GameStoreState = {
  connected: false,
  username: '',
  inQueue: false,
  queuePosition: 0,
  roomId: null,
  players: [],
  gameState: GameState.WAITING,
  gameMode: GameMode.CLASSIC,
  seriesType: 'best_of_five',
  currentRound: 0,
  maxRounds: 5,
  currentQuestion: null,
  currentTopic: null,
  answers: [],
  myAnswer: '',
  hasAnswered: false,
  hasVoted: false,
  votedFor: null,
  timeRemaining: 0,
  roundResult: null,
  gameStats: null,
  winner: null,
  selectedModel: 'auto',
  error: null,
  notification: null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),
  
  setUsername: (username) => set({ username }),
  
  setInQueue: (inQueue, position = 0) => set({ inQueue, queuePosition: position }),
  
  setRoomId: (roomId) => set({ roomId }),
  
  setPlayers: (players) => set({ players }),
  
  setGameState: (gameState) => set({ gameState }),
  
  setGameMode: (gameMode) => set({ gameMode }),
  
  setSeriesType: (seriesType) => set({ seriesType }),
  
  setCurrentRound: (currentRound, maxRounds) => set({ currentRound, maxRounds }),
  
  setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
  
  setCurrentTopic: (currentTopic) => set({ currentTopic }),
  
  setAnswers: (answers) => set({ answers }),
  
  setMyAnswer: (myAnswer) => set({ myAnswer }),
  
  setHasAnswered: (hasAnswered) => set({ hasAnswered }),
  
  setHasVoted: (hasVoted) => set({ hasVoted }),
  
  setVotedFor: (votedFor) => set({ votedFor }),
  
  setTimeRemaining: (timeRemaining) => set({ timeRemaining }),
  
  setRoundResult: (roundResult) => set({ roundResult }),
  
  setGameStats: (gameStats) => set({ gameStats }),
  
  setWinner: (winner) => set({ winner }),
  
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  
  setError: (error) => set({ error }),
  
  setNotification: (notification) => set({ notification }),
  
  reset: () => set((state) => ({
    ...initialState,
    selectedModel: state.selectedModel
  })),
  
  resetRound: () => set({
    currentQuestion: null,
    currentTopic: null,
    answers: [],
    myAnswer: '',
    hasAnswered: false,
    hasVoted: false,
    votedFor: null,
    timeRemaining: 0,
    roundResult: null,
  }),
}));

export default useGameStore;
