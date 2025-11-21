import { useGameStore } from '../store/gameStore';

function GameEndPhase() {
  const { winner, players, gameStats, reset } = useGameStore();

  const handlePlayAgain = () => {
    reset();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Winner announcement */}
      <div className="card bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-yellow-600">
        <div className="text-center py-8">
          <div className="text-8xl mb-4 animate-bounce">🏆</div>
          <h2 className="text-4xl font-bold text-white mb-2">
            Game Over!
          </h2>
          {winner && (
            <>
              <p className="text-2xl text-gray-300 mb-2">Winner:</p>
              <p className="text-5xl font-bold text-yellow-400">
                {winner.username}
              </p>
              <p className="text-3xl text-yellow-200 mt-2">
                {winner.score} points
              </p>
            </>
          )}
        </div>
      </div>

      {/* Final Leaderboard */}
      <div className="card">
        <h3 className="text-2xl font-semibold mb-6 text-white">📊 Final Standings</h3>
        <div className="space-y-3">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg flex justify-between items-center ${
                index === 0
                  ? 'bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-600'
                  : index === 1
                  ? 'bg-gray-700/50 border-2 border-gray-500'
                  : index === 2
                  ? 'bg-orange-900/30 border-2 border-orange-700'
                  : 'bg-gray-700/30 border border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </span>
                <div>
                  <div className="font-semibold text-xl text-white">
                    {player.username}
                  </div>
                  {player.isAI && (
                    <span className="text-sm text-gray-400">(AI Player)</span>
                  )}
                </div>
              </div>
              <div className="text-3xl font-bold text-white">
                {player.score}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Statistics */}
      {gameStats && (
        <div className="card">
          <h3 className="text-2xl font-semibold mb-6 text-white">📈 Game Statistics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-700/50 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary-400">
                {gameStats.totalRounds}
              </div>
              <div className="text-sm text-gray-400 mt-1">Total Rounds</div>
            </div>
            
            <div className="p-4 bg-gray-700/50 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary-400">
                {(gameStats.aiDetectionRate * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-400 mt-1">AI Detection Rate</div>
            </div>
            
            <div className="p-4 bg-gray-700/50 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary-400">
                {gameStats.averageAnswerLength}
              </div>
              <div className="text-sm text-gray-400 mt-1">Avg Answer Length</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card text-center">
        <button
          onClick={handlePlayAgain}
          className="btn-primary text-xl px-12 py-4"
        >
          🎮 Play Again
        </button>
      </div>

      {/* Fun facts */}
      <div className="card bg-blue-900/30 border-blue-700">
        <h4 className="text-lg font-semibold mb-3 text-blue-300">💡 Did you know?</h4>
        <p className="text-gray-300">
          The Turing Test, proposed by Alan Turing in 1950, evaluates a machine's ability 
          to exhibit intelligent behavior indistinguishable from that of a human. 
          This game is inspired by that concept!
        </p>
      </div>
    </div>
  );
}

export default GameEndPhase;

