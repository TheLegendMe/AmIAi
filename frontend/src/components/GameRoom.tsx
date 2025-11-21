import { useGameStore } from '../store/gameStore';
import { GameMode, GameState } from '../types/game';
import AnswerPhase from './AnswerPhase';
import VotingPhase from './VotingPhase';
import ResultPhase from './ResultPhase';
import GameEndPhase from './GameEndPhase';
import { socketService } from '../services/socket';

function GameRoom() {
  const { roomId, players, gameState, currentRound, maxRounds, reset, selectedModel, gameMode, seriesType } = useGameStore();

  const handleLeaveGame = () => {
    if (confirm('确定要退出游戏吗？')) {
      socketService.disconnect();
      reset();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-wrap justify-between gap-4 items-center">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-primary-400">🎮 Game Room</h2>
              <p className="text-sm text-gray-400">Room ID: {roomId?.slice(0, 8)}</p>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-blue">
                模型：{selectedModel ? selectedModel.toUpperCase() : 'AUTO'}
              </span>
              <span className="badge badge-green">
                模式：{gameMode === GameMode.CLASSIC ? '多人推理' : '字战对决'}
              </span>
              <span className="badge badge-yellow">
                回合：{seriesType === 'single' ? '单局定胜负' : '五局系列赛'}
              </span>
            </div>
            <button
              onClick={handleLeaveGame}
              className="btn-secondary text-sm px-4 py-2"
            >
              🚪 退出游戏
            </button>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-400">Round</div>
            <div className="text-3xl font-bold text-white">
              {currentRound}/{maxRounds}
            </div>
          </div>
        </div>
      </div>

      {/* Players sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 text-primary-400">👥 Players ({players.length})</h3>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white truncate max-w-[150px]">
                        {player.username}
                      </div>
                      <div className="text-xs text-gray-400">
                        {player.score} pts
                      </div>
                    </div>
                    {player.isConnected && (
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main game area */}
        <div className="lg:col-span-3">
          {(gameState === GameState.WAITING || gameState === GameState.READY) && (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4 animate-bounce-slow">⏳</div>
              <h3 className="text-2xl font-semibold mb-2 text-primary-400">
                {gameState === GameState.WAITING ? 'Waiting for players...' : 'Game starting soon!'}
              </h3>
              <p className="text-gray-400">Get ready to play!</p>
            </div>
          )}

          {gameState === GameState.ANSWERING && <AnswerPhase />}
          
          {gameState === GameState.VOTING && <VotingPhase />}
          
          {gameState === GameState.REVEAL && <ResultPhase />}
          
          {gameState === GameState.ENDED && <GameEndPhase />}
        </div>
      </div>
    </div>
  );
}

export default GameRoom;
