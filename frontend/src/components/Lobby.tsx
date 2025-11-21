import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socket';
import { fetchProviders } from '../services/api';
import { GameMode, ModelProvider } from '../types/game';

function Lobby() {
  const {
    inQueue,
    queuePosition,
    username,
    setUsername,
    selectedModel,
    setSelectedModel
  } = useGameStore();
  const [inputUsername, setInputUsername] = useState(username || '');
  const [selectedRoomSize, setSelectedRoomSize] = useState(3);
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.CLASSIC);
  const [selectedSeries, setSelectedSeries] = useState<'single' | 'best_of_five'>('best_of_five');

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const list = await fetchProviders();
        setProviders(list);
        if (!selectedModel && list.length > 0) {
          setSelectedModel('auto');
        }
      } catch (error: any) {
        setProviderError(error.message || '无法获取模型');
      } finally {
        setLoadingProviders(false);
      }
    };

    loadProviders();
  }, [selectedModel, setSelectedModel]);

  useEffect(() => {
    if (!selectedModel) {
      setSelectedModel('auto');
    }
  }, [selectedModel, setSelectedModel]);

  const modelOptions = useMemo(() => {
    const displayLabels: Record<string, string> = {
      auto: 'AI 智能混合',
      openai: 'OpenAI',
      deepseek: 'DeepSeek',
      doubao: 'Doubao（豆包）',
      qwen: 'Qwen（通义千问）',
      glm: 'GLM（智谱）',
      moonshot: 'Moonshot'
    };
    const preferredOrder = ['auto', 'deepseek', 'doubao', 'qwen', 'openai', 'glm', 'moonshot'];

    const providerMap = new Map(providers.map((p) => [p.name, p]));

    const normalized = preferredOrder.map((name) => {
      if (name === 'auto') {
        return {
          name: 'auto',
          label: displayLabels.auto,
          model: '自动匹配最合适的模型',
          enabled: true,
          current: selectedModel === 'auto'
        };
      }

      const info = providerMap.get(name);
      return {
        name,
        label: displayLabels[name] || name.toUpperCase(),
        model: info?.model || '未配置',
        enabled: Boolean(info?.enabled),
        current: selectedModel === name
      };
    });

    const remaining = providers
      .filter((p) => !preferredOrder.includes(p.name))
      .map((p) => ({
        name: p.name,
        label: p.name.toUpperCase(),
        model: p.model,
        enabled: p.enabled,
        current: selectedModel === p.name
      }));

    return [...normalized, ...remaining];
  }, [providers, selectedModel]);

  const handleJoinQueue = () => {
    if (inputUsername.trim().length === 0) {
      alert('Please enter a username');
      return;
    }
    
    if (inputUsername.trim().length > 20) {
      alert('Username too long (max 20 characters)');
      return;
    }

    setUsername(inputUsername.trim());
    socketService.joinQueue(
      inputUsername.trim(),
      selectedRoomSize,
      selectedModel || 'auto',
      selectedMode,
      selectedSeries
    );
  };

  const handleLeaveQueue = () => {
    socketService.leaveQueue();
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card bg-gradient-to-br from-slate-900 via-gray-900 to-gray-800 border-gray-700/80 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_55%)]" />
          <div className="relative">
            <p className="uppercase text-xs tracking-[0.4em] text-primary-200 mb-3">社交推理体验</p>
            <h1 className="text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
              <span className="text-primary-400">AmIAI</span> 多人对局
            </h1>
            <p className="text-lg text-gray-300 mb-6">
              实时匹配其他玩家和隐身的AI，回答同一问题并投票，谁能识破伪装？现在你还可以指定想要挑战的模型。
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: '回合', value: selectedSeries === 'single' ? '1局' : '5局' },
                { label: '玩家', value: '2-4 人类 + AI' },
                { label: '匹配', value: '实时' },
                { label: 'AI 模型', value: selectedModel?.toUpperCase() || 'AUTO' }
              ].map((item) => (
                <div key={item.label} className="bg-black/30 rounded-xl p-4 border border-white/5 text-center">
                  <p className="text-xs uppercase text-gray-400 tracking-widest">{item.label}</p>
                  <p className="text-xl font-semibold text-white mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                选择本局使用的 AI 模型
              </label>
              <div className="flex flex-wrap gap-3">
                <select
                  className="input w-full max-w-sm sm:w-64"
                  value={selectedModel || 'auto'}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {modelOptions.map((option) => (
                    <option
                      key={option.name}
                      value={option.name}
                      disabled={!option.enabled && option.name !== 'auto'}
                    >
                      {option.label} · {option.model}
                      {!option.enabled && option.name !== 'auto' ? '（未配置）' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 leading-6">
                  可以实时切换，匹配时将使用你当前所选的模型。
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-gray-700/80 bg-gray-900/80">
          <h2 className="text-2xl font-semibold text-white mb-4">怎么玩？</h2>
          <div className="space-y-4">
              {[
                '经典模式：根据开放问题作答，再投票找出 AI',
                '一字识AI：AI 抛出主题，所有人仅能用一个汉字作答',
                '命中 +10 分，被误会的玩家会扣分，AI 被识破则失分',
                '多轮博弈后分出胜负，排行榜实时刷新'
              ].map((text, index) => (
                <div key={text} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/40 text-primary-300 flex items-center justify-center font-semibold">
                    {index + 1}
                </div>
                <p className="text-gray-300 flex-1">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex flex-col gap-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  你的昵称
                </label>
                <input
                  id="username"
                  type="text"
                  className="input"
                  placeholder="Enter your nickname..."
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinQueue()}
                  maxLength={20}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {inputUsername.length}/20 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  玩法模式
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    {
                      label: '经典模式',
                      value: GameMode.CLASSIC,
                      desc: '开放问题+投票'
                    },
                    {
                      label: '一字识AI',
                      value: GameMode.CHAR_DUEL,
                      desc: '主题提示，只能答一个字'
                    }
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setSelectedMode(mode.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedMode === mode.value
                          ? 'border-primary-400 bg-primary-500/10 text-white shadow-lg shadow-primary-500/20'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <p className="text-lg font-semibold">{mode.label}</p>
                      <p className="text-sm text-gray-400">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  回合规则
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { label: '单局定胜负', value: 'single', desc: '一轮立判输赢' },
                    { label: '五局积分制', value: 'best_of_five', desc: '5 round series' }
                  ].map((series) => (
                    <button
                      key={series.value}
                      onClick={() => setSelectedSeries(series.value as 'single' | 'best_of_five')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedSeries === series.value
                          ? 'border-primary-400 bg-primary-500/10 text-white shadow-lg shadow-primary-500/20'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <p className="text-lg font-semibold">{series.label}</p>
                      <p className="text-sm text-gray-400">{series.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  单局会立即揭晓身份；五局模式则在最后一场才公布答案和分数。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  房间人数（真人）
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[3, 4, 5].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedRoomSize(size)}
                      className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                        selectedRoomSize === size
                          ? 'bg-primary-600 text-white border-2 border-primary-400'
                          : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      {size}人
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  默认会加入 {selectedRoomSize - 1} 位真人 + 1 位 AI
                  {selectedMode === GameMode.CHAR_DUEL ? '，所有人以一个汉字作答' : ''}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择想挑战的模型
                </label>
                <div className="grid md:grid-cols-3 gap-3">
                  {modelOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={() => option.enabled && setSelectedModel(option.name)}
                      disabled={!option.enabled && option.name !== 'auto'}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        option.current
                          ? 'border-primary-400 bg-primary-500/10 text-white shadow-lg shadow-primary-500/20'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                      } ${!option.enabled && option.name !== 'auto' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <p className="text-sm uppercase tracking-widest text-gray-400">{option.label}</p>
                      <p className="text-lg font-semibold">{option.model}</p>
                      {!option.enabled && option.name !== 'auto' && (
                        <p className="text-xs text-red-300 mt-1">未配置 API Key</p>
                      )}
                    </button>
                  ))}
                </div>
                {loadingProviders && <p className="text-xs text-gray-500 mt-2">加载可用模型...</p>}
                {providerError && <p className="text-xs text-red-400 mt-2">{providerError}</p>}
                {!loadingProviders && !providerError && (
                  <p className="text-xs text-gray-500 mt-2">
                    当前共 {providers.length} 个模型可用，随时可以切换
                  </p>
                )}
              </div>

              {!inQueue ? (
                <button
                  onClick={handleJoinQueue}
                  className="btn-primary w-full text-lg"
                  disabled={inputUsername.trim().length === 0}
                >
                  🎮 开始匹配
                </button>
              ) : (
                <div className="text-center py-8">
                  <div className="mb-6">
                    <div className="animate-pulse-slow text-6xl mb-4">🔍</div>
                    <h3 className="text-2xl font-semibold text-primary-400 mb-2">
                      正在寻找对手...
                    </h3>
                    <p className="text-gray-400">
                      Queue position: <span className="text-white font-bold">{queuePosition}</span>
                    </p>
                  </div>

                  <div className="flex justify-center space-x-2 mb-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="w-3 h-3 bg-primary-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${index * 150}ms` }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleLeaveQueue}
                    className="btn-secondary"
                  >
                    ❌ 退出排队
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <div className="text-center text-gray-500 text-sm">
        <p>体验升级：随时切换模型、玩法与回合规则，尝试不同组合。</p>
      </div>
    </div>
  );
}

export default Lobby;
