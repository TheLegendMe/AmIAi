import { useGameStore } from '../store/gameStore';

function ResultPhase() {
  const { roundResult, seriesType, currentRound, maxRounds } = useGameStore();

  if (!roundResult) return null;
  const hideDetails = roundResult.revealDetails === false;

  return (
    <div className="space-y-6">
      {roundResult.topic && (
        <div className="card border-primary-500/40 bg-primary-900/10">
          <p className="text-xs uppercase tracking-[0.3em] text-primary-300">本轮主题</p>
          <h3 className="text-2xl font-semibold text-white mt-2">
            {roundResult.topic.category === 'person' ? '人物' : '游戏'} · {roundResult.topic.title}
          </h3>
          <p className="text-gray-300 mt-1">{roundResult.topic.description}</p>
          <p className="text-xs text-gray-400 mt-1">提示：{roundResult.topic.clue}</p>
        </div>
      )}

      {hideDetails ? (
        <div className="card bg-amber-900/30 border-amber-500 text-center py-8">
          <div className="text-5xl mb-3">🤫</div>
          <h3 className="text-2xl font-semibold text-amber-200 mb-2">
            系列赛未结束，答案暂不公开
          </h3>
          <p className="text-amber-100">
            {seriesType === 'best_of_five'
              ? `第 ${currentRound}/${maxRounds} 局已记录，最终结果将在第 ${maxRounds} 局揭晓。`
              : '请等待最终公布。'}
          </p>
        </div>
      ) : (
        <>
          {/* AI Reveal */}
          <div className="card bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-600">
            <div className="text-center py-6">
              <div className="text-6xl mb-4 animate-bounce-slow">🤖</div>
              <h3 className="text-3xl font-bold text-white mb-2">
                The AI was...
              </h3>
              <p className="text-4xl font-bold text-primary-400">
                {roundResult.aiPlayer.username}
              </p>
            </div>
          </div>

          {/* Vote Results */}
          <div className="card">
            <h4 className="text-xl font-semibold mb-4 text-white">📊 Vote Results</h4>
            <div className="space-y-3">
              {roundResult.voteResults.map((result) => {
                const isAI = result.playerId === roundResult.aiPlayer.id;
                
                return (
                  <div
                    key={result.playerId}
                    className={`p-4 rounded-lg ${
                      isAI ? 'bg-red-900/30 border-2 border-red-600' : 'bg-gray-700/30 border border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{isAI ? '🤖' : '👤'}</span>
                        <div>
                          <div className="font-semibold text-white">
                            {result.username || 'Unknown'}
                          </div>
                          {isAI && (
                            <span className="text-xs text-red-400">
                              This was the AI!
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {result.votes}
                        </div>
                        <div className="text-xs text-gray-400">
                          {result.votes === 1 ? 'vote' : 'votes'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All Answers Revealed */}
          <div className="card">
            <h4 className="text-xl font-semibold mb-4 text-white">💬 All Answers</h4>
            <div className="space-y-4">
              {roundResult.answers.map((answer) => (
                <div
                  key={answer.playerId}
                  className={`p-4 rounded-lg border-2 ${
                    answer.isAI
                      ? 'border-red-600 bg-red-900/20'
                      : 'border-gray-600 bg-gray-700/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">
                        {answer.isAI ? '🤖' : '👤'}
                      </span>
                      <span className="font-semibold text-white">
                        {answer.username}
                      </span>
                      {answer.isAI && (
                        <span className="badge-red text-xs">AI</span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-200">{answer.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="card">
            <h4 className="text-xl font-semibold mb-4 text-white">🏆 Current Scores</h4>
            <div className="space-y-2">
              {roundResult.leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-lg flex justify-between items-center ${
                    index === 0
                      ? 'bg-yellow-900/30 border-2 border-yellow-600'
                      : 'bg-gray-700/30 border border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-gray-400 w-8">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white">
                        {player.username}
                      </div>
                      {player.isAI && (
                        <span className="text-xs text-gray-400">(AI)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {player.score} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Next round indicator */}
      <div className="card bg-blue-900/30 border-blue-600 text-center">
        <p className="text-blue-300">
          ⏱️ Next round starting soon...
        </p>
      </div>
    </div>
  );
}

export default ResultPhase;
