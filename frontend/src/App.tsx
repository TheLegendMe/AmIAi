import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { socketService } from './services/socket';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import { GameMode, GameState } from './types/game';
import { API_URL } from './services/api';

function App() {
  const {
    connected,
    roomId,
    setConnected,
    setInQueue,
    setRoomId,
    setPlayers,
    setGameState,
    setCurrentRound,
    setCurrentQuestion,
    setCurrentTopic,
    setAnswers,
    setRoundResult,
    setGameStats,
    setWinner,
    setError,
    setNotification,
    resetRound,
    setGameMode,
    setSeriesType,
    setSelectedModel,
  } = useGameStore();

  const [onlineCount, setOnlineCount] = useState(0);

  // 轮询在线人数
  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        const response = await fetch(`${API_URL}/stats`);
        const data = await response.json();
        const count = data.onlinePlayers || 0;
        setOnlineCount(count);
        console.log('📊 在线人数:', count);
      } catch (error) {
        console.error('获取在线人数失败:', error);
      }
    };

    // 立即获取一次
    fetchOnlineCount();
    
    // 每2秒更新一次
    const interval = setInterval(fetchOnlineCount, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Connect to server
    socketService.connect();

    // Connection status
    socketService.on('connection_status', (data: { connected: boolean }) => {
      setConnected(data.connected);
    });

    // Queue events
    socketService.on('queue_joined', (data: { position: number; message: string }) => {
      setInQueue(true, data.position);
      setNotification(data.message);
    });

    socketService.on('queue_left', (data: { message: string }) => {
      setInQueue(false, 0);
      setNotification(data.message);
    });

    // Room events
    socketService.on('room_joined', (data: { roomId: string; message: string; provider?: string | null; mode?: GameMode; seriesType?: 'single' | 'best_of_five' }) => {
      setRoomId(data.roomId);
      setNotification(data.message);
      setSelectedModel(data.provider ?? 'auto');
      setGameMode(data.mode || GameMode.CLASSIC);
      setSeriesType(data.seriesType || 'best_of_five');
    });

    socketService.on('room_state', (data: any) => {
      setPlayers(data.players);
      setGameState(data.state);
      setCurrentRound(data.round, data.maxRounds);
      setSelectedModel(data.provider ?? 'auto');
      setGameMode(data.mode || GameMode.CLASSIC);
      setSeriesType(data.seriesType || 'best_of_five');
    });

    // Game events
    socketService.on('game_start', (data: any) => {
      setPlayers(data.players);
      setGameState(GameState.READY);
      if (data.mode) setGameMode(data.mode);
      if (data.seriesType) setSeriesType(data.seriesType);
      setNotification('Game starting!');
    });

    socketService.on('round_start', (data: any) => {
      resetRound();
      setGameState(GameState.ANSWERING);
      setCurrentRound(data.round, data.maxRounds);
      setCurrentQuestion(data.question);
      setCurrentTopic(data.topic || null);
      if (data.seriesType) setSeriesType(data.seriesType);
      setNotification(`Round ${data.round} started!`);
    });

    socketService.on('answer_submitted', (data: { totalSubmitted: number; totalPlayers: number }) => {
      setNotification(`${data.totalSubmitted}/${data.totalPlayers} players answered`);
    });

    socketService.on('voting_start', (data: { answers: any[]; timeLimit: number }) => {
      setGameState(GameState.VOTING);
      setAnswers(data.answers);
      setNotification('Voting phase started!');
    });

    socketService.on('vote_received', (data: { totalVotes: number }) => {
      setNotification(`${data.totalVotes} votes received`);
    });

    socketService.on('round_result', (data: any) => {
      setGameState(GameState.REVEAL);
      setRoundResult(data);
      if (data.revealDetails !== false && data.leaderboard?.length) {
        setPlayers(data.leaderboard);
      }
    });

    socketService.on('game_end', (data: any) => {
      setGameState(GameState.ENDED);
      setWinner(data.winner);
      setGameStats(data.stats);
      setPlayers(data.leaderboard);
    });

    // Error handling
    socketService.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    // Cleanup
    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  // Clear notifications after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotification(null);
      setError(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [useGameStore.getState().notification, useGameStore.getState().error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Connection and Online Count */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <div className={`badge ${connected ? 'badge-green' : 'badge-red'}`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
        
        {/* 在线人数 */}
        <div className="badge badge-blue">
          <span className="mr-2">👥</span>
          在线: {onlineCount} 人
        </div>
      </div>

      {/* Notifications */}
      {useGameStore.getState().notification && (
        <div className="fixed top-28 right-4 z-50 card bg-blue-900/90 border-blue-600 animate-bounce-slow">
          <p className="text-blue-200">{useGameStore.getState().notification}</p>
        </div>
      )}

      {/* Errors */}
      {useGameStore.getState().error && (
        <div className="fixed top-28 right-4 z-50 card bg-red-900/90 border-red-600">
          <p className="text-red-200">❌ {useGameStore.getState().error}</p>
        </div>
      )}

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {!roomId ? <Lobby /> : <GameRoom />}
      </div>
    </div>
  );
}

export default App;
