import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socket';
import { GameMode } from '../types/game';

function AnswerPhase() {
  const {
    currentQuestion,
    currentTopic,
    myAnswer,
    hasAnswered,
    setMyAnswer,
    setHasAnswered,
    gameMode
  } = useGameStore();
  const [answer, setAnswer] = useState(myAnswer);

  const isCharMode = gameMode === GameMode.CHAR_DUEL;

  const handleSubmit = () => {
    if (answer.trim().length === 0) {
      alert('Please enter an answer');
      return;
    }

    const trimmed = answer.trim();

    if (isCharMode) {
      if (trimmed.length !== 1) {
        alert('只能输入一个汉字');
        return;
      }
    } else if (trimmed.length > 500) {
      alert('Answer too long (max 500 characters)');
      return;
    }

    setMyAnswer(trimmed);
    setHasAnswered(true);
    socketService.submitAnswer(trimmed);
  };

  return (
    <div className="card">
      {/* Question */}
      <div className="mb-6">
        {isCharMode ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-400 uppercase tracking-[0.3em]">一字识AI</div>
            <div className="p-4 rounded-xl bg-black/30 border border-gray-700/60">
              <p className="text-xs text-gray-400">主题</p>
              <h3 className="text-2xl font-semibold text-white">
                {currentTopic ? `${currentTopic.category === 'person' ? '人物' : '游戏'} · ${currentTopic.title}` : currentQuestion}
              </h3>
              {currentTopic && (
                <>
                  <p className="text-gray-300 mt-2">{currentTopic.description}</p>
                  <p className="text-xs text-gray-500 mt-1">提示：{currentTopic.clue}</p>
                  <p className="text-xs text-primary-300 mt-2">⚠️ 所有玩家（含AI）都只能输入一个汉字</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-400 mb-2">Question</div>
            <h3 className="text-2xl font-semibold text-white mb-4">
              {currentQuestion}
            </h3>
          </>
        )}
      </div>

      {/* Answer input */}
      {!hasAnswered ? (
        <div className="space-y-4">
          {isCharMode ? (
            <div>
              <input
                className="input text-3xl text-center tracking-widest"
                placeholder="如：光"
                value={answer}
                maxLength={1}
                onChange={(e) => setAnswer(e.target.value.slice(0, 1))}
                autoFocus
              />
              <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                <span>只能输入1个汉字</span>
                <span>提示词：{currentTopic?.clue || '发挥想象'}</span>
              </div>
            </div>
          ) : (
            <div>
              <textarea
                className="input min-h-[150px] resize-none"
                placeholder="Type your answer here... Be human! Or be AI?"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={500}
                autoFocus
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">
                  {answer.length}/500 characters
                </p>
                <p className="text-xs text-gray-400">
                  💡 Tip: Try to sound like a human!
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="btn-primary w-full"
            disabled={answer.trim().length === 0}
          >
            ✅ Submit Answer
          </button>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4 animate-pulse-slow">✓</div>
          <h4 className="text-xl font-semibold text-green-400 mb-2">
            Answer Submitted!
          </h4>
          <p className="text-gray-400 mb-4">
            Waiting for other players...
          </p>
          
          {/* Show submitted answer */}
          <div className="max-w-2xl mx-auto mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="text-sm text-gray-400 mb-2">Your answer:</div>
            <p className="text-white">{myAnswer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnswerPhase;
