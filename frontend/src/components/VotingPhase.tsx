import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socket';

function VotingPhase() {
  const { answers, hasVoted, votedFor, setHasVoted, setVotedFor } = useGameStore();

  const handleVote = (playerId: string) => {
    if (hasVoted) return;

    setVotedFor(playerId);
    setHasVoted(true);
    socketService.vote(playerId);
  };

  return (
    <div className="card">
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-white mb-2">
          🗳️ Who is the AI?
        </h3>
        <p className="text-gray-400">
          {hasVoted ? 'Vote submitted! Waiting for others...' : 'Read the answers and vote for who you think is AI'}
        </p>
      </div>

      <div className="grid gap-4">
        {answers.map((answer, index) => (
          <div
            key={answer.playerId}
            className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${
              votedFor === answer.playerId
                ? 'border-primary-500 bg-primary-900/30'
                : hasVoted
                ? 'border-gray-700 bg-gray-800/50 opacity-50'
                : 'border-gray-600 bg-gray-700/30 hover:border-primary-400 hover:bg-primary-900/20'
            }`}
            onClick={() => !hasVoted && handleVote(answer.playerId)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="font-semibold text-white">
                  {answer.username}
                </span>
              </div>
              
              {votedFor === answer.playerId && (
                <span className="badge-blue">
                  ✓ Your Vote
                </span>
              )}
            </div>

            <p className="text-gray-200 leading-relaxed">
              {answer.answer}
            </p>

            {!hasVoted && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <button
                  onClick={() => handleVote(answer.playerId)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  🎯 Vote for this player
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasVoted && (
        <div className="mt-6 p-4 bg-green-900/30 border border-green-700 rounded-lg text-center">
          <p className="text-green-300">
            ✓ Vote recorded! Results coming soon...
          </p>
        </div>
      )}
    </div>
  );
}

export default VotingPhase;

