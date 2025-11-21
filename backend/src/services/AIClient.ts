import axios from 'axios';
import { config } from '../config';
import { CharacterTopic } from '../models/types';

export interface AIAnswerRequest {
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  personality: 'obvious' | 'normal' | 'deceptive';
}

export interface AIAnswerResponse {
  answer: string;
  confidence: number;
  tokens_used: number;
}

export interface ModelProviderInfo {
  name: string;
  enabled: boolean;
  model: string;
  current: boolean;
}

export interface CharacterDuelTurn {
  character: string;
  guess: 'human' | 'ai';
  reason: string;
  confidence: number;
  provider?: string;
}

export class AIClient {
  private baseUrl: string;
  private static readonly FALLBACK_TOPICS: CharacterTopic[] = [
    { category: 'person', title: '李白', description: '盛唐浪漫主义诗人', clue: '诗' },
    { category: 'person', title: '梅西', description: '阿根廷传奇球王', clue: '球' },
    { category: 'person', title: '宫崎骏', description: '吉卜力知名动画导演', clue: '梦' },
    { category: 'game', title: '塞尔达传说', description: '任天堂开放世界冒险', clue: '勇' },
    { category: 'game', title: '王者荣耀', description: '热门 MOBA 手机游戏', clue: '战' },
    { category: 'game', title: '绝地求生', description: '吃鸡生存射击', clue: '存' }
  ];

  constructor() {
    this.baseUrl = config.aiService.url;
  }

  async generateAnswer(
    question: string,
    personality: 'obvious' | 'normal' | 'deceptive' = 'normal',
    provider?: string
  ): Promise<string> {
    try {
      const response = await this.requestAnswer(question, personality, provider);

      const modelInfo = await this.getModelInfo();
      const providerUsed = this.resolveProvider(provider) || modelInfo.provider;
      console.log(`🤖 [AI回答] 模型: ${providerUsed} (${modelInfo.model}) | 问题: ${question.substring(0, 30)}... | 回答: ${response.answer.substring(0, 50)}...`);

      return response.answer;
    } catch (error) {
      if (provider && provider !== 'auto') {
        console.warn(`指定模型 ${provider} 调用失败，尝试退回默认模型`);
        try {
          const response = await this.requestAnswer(question, personality);
          return response.answer;
        } catch (fallbackError) {
          console.error('AI Service fallback error:', fallbackError);
        }
      }

      console.error('AI Service error:', error);
      return this.generateFallbackAnswer(question);
    }
  }

  private resolveProvider(provider?: string): string | undefined {
    if (provider && provider !== 'auto') return provider;
    if (config.aiService.defaultProvider && config.aiService.defaultProvider !== 'auto') {
      return config.aiService.defaultProvider;
    }
    return undefined;
  }

  private async requestAnswer(
    question: string,
    personality: 'obvious' | 'normal' | 'deceptive',
    provider?: string
  ): Promise<AIAnswerResponse> {
    const params = this.resolveProvider(provider)
      ? { provider: this.resolveProvider(provider) }
      : undefined;

    const response = await axios.post<AIAnswerResponse>(
      `${this.baseUrl}/generate-answer`,
      {
        question,
        difficulty: 'medium',
        personality
      } as AIAnswerRequest,
      {
        timeout: 10000,
        params
      }
    );

    return response.data;
  }

  private generateFallbackAnswer(question: string): string {
    const fallbacks = [
      "这是一个很有趣的问题。从逻辑角度来看，需要综合多个因素进行分析。",
      "根据现有的数据和研究，这个问题可以从多个维度来讨论。",
      "我认为这个问题没有绝对的答案，需要具体情况具体分析。",
      "这涉及到多个领域的知识，是一个复杂的话题。",
      "从科学的角度来说，我们需要更多的证据来支持任何结论。"
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('AI Service health check failed:', error);
      return false;
    }
  }

  async getModelInfo(): Promise<{ provider: string; model: string; available_providers: string[] }> {
    try {
      const response = await axios.get(`${this.baseUrl}/`, {
        timeout: 5000
      });
      return {
        provider: response.data.current_provider || 'unknown',
        model: response.data.model || 'unknown',
        available_providers: response.data.available_providers || []
      };
    } catch (error) {
      console.error('Failed to get model info:', error);
      return { provider: 'unknown', model: 'unknown', available_providers: [] };
    }
  }

  async listProviders(): Promise<ModelProviderInfo[]> {
    try {
      const response = await axios.get<{ providers: ModelProviderInfo[] }>(`${this.baseUrl}/providers`, {
        timeout: 5000
      });
      return response.data.providers || [];
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      return [];
    }
  }

  async generateCharacterDuelTurn(userChar: string, topic: CharacterTopic, provider?: string): Promise<CharacterDuelTurn> {
    const duelQuestion = `
【游戏】一字识AI

本轮主题：
- 类型：${topic.category === 'person' ? '人物' : '游戏'}
- 名称：${topic.title}
- 线索：${topic.clue}

流程：
1. 你知道上面的主题，需要用一个汉字描述它，字数必须=1。
2. 对方（真人）也提交了一个字：${userChar}，请你据此判断 ta 更像人还是AI。
3. 你的回答要尽量像真人，别暴露自己是AI。

输出JSON：
{
  "character": "你给出的汉字，1个字符",
  "guess": "human 或 ai",
  "reason": "15字内判断依据",
  "confidence": 0-1之间的小数
}`.trim();

    try {
      const response = await this.requestAnswer(duelQuestion, 'deceptive', provider);
      const parsed = this.parseCharacterResponse(response.answer);
      parsed.provider = this.resolveProvider(provider);
      return parsed;
    } catch (error) {
      console.error('Failed to run character duel:', error);
      return {
        character: this.generateFallbackCharacter(),
        guess: 'human',
        reason: '凭直觉觉得像真人',
        confidence: 0.5,
        provider: this.resolveProvider(provider)
      };
    }
  }

  private parseCharacterResponse(raw: string): CharacterDuelTurn {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          character: this.normalizeCharacter(parsed.character),
          guess: parsed.guess === 'ai' ? 'ai' : 'human',
          reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 50) : '直觉判断',
          confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5
        };
      }
    } catch (error) {
      console.warn('Failed to parse duel JSON:', error);
    }

    return {
      character: this.generateFallbackCharacter(),
      guess: raw.includes('AI') ? 'ai' : 'human',
      reason: raw.substring(0, 50) || '直觉判断',
      confidence: 0.5
    };
  }

  private normalizeCharacter(char: string): string {
    if (!char) return this.generateFallbackCharacter();
    const trimmed = char.trim();
    if (trimmed.length === 0) return this.generateFallbackCharacter();
    return trimmed[0];
  }

  private generateFallbackCharacter(): string {
    const chars = ['心', '火', '风', '海', '野', '暮', '光', '影'];
    return chars[Math.floor(Math.random() * chars.length)];
  }

  async generateCharacterAnswer(topic: CharacterTopic, provider?: string): Promise<string> {
    const answerPrompt = `
【任务】用一个汉字概括主题
主题：${topic.category === 'person' ? '人物' : '游戏'} · ${topic.title}
描述：${topic.description}
提示：${topic.clue}
要求：
- 只输出一个最具代表性的汉字
- 不要解释
- 不能包含标点或空格`.trim();

    try {
      const response = await this.requestAnswer(answerPrompt, 'deceptive', provider);
      return this.normalizeCharacter(response.answer);
    } catch (error) {
      console.error('Failed to generate character answer:', error);
      return this.getRepresentativeFallbackChar(topic);
    }
  }

  async generateCharacterTopic(): Promise<CharacterTopic> {
    const topicPrompt = `
随机构思一个适合一字识人的主题，只能是“著名人物”或“知名游戏”之一。
输出JSON：
{
  "category": "person" 或 "game",
  "title": "名称，2-6字",
  "description": "15字左右背景介绍",
  "clue": "鼓励玩家用一个汉字描述该主题的提示，10字以内"
}`.trim();

    try {
      const response = await this.requestAnswer(topicPrompt, 'normal');
      const parsed = this.parseTopic(response.answer);
      if (parsed) return parsed;
      return this.pickFallbackTopic();
    } catch (error) {
      console.error('Failed to generate topic:', error);
      return this.pickFallbackTopic();
    }
  }

  private parseTopic(raw: string): CharacterTopic | null {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          category: parsed.category === 'game' ? 'game' : 'person',
          title: typeof parsed.title === 'string' ? parsed.title.slice(0, 12) : '未知主题',
          description: typeof parsed.description === 'string' ? parsed.description.slice(0, 40) : '神秘主题',
          clue: typeof parsed.clue === 'string' ? parsed.clue.slice(0, 20) : '自由发挥'
        } as CharacterTopic;
      }
    } catch (error) {
      console.warn('Failed to parse topic JSON:', error);
    }

    return null;
  }

  private pickFallbackTopic(): CharacterTopic {
    const list = AIClient.FALLBACK_TOPICS;
    return list[Math.floor(Math.random() * list.length)];
  }

  private getRepresentativeFallbackChar(topic: CharacterTopic): string {
    const map: Record<string, string> = {
      '李白': '诗',
      '梅西': '球',
      '宫崎骏': '梦',
      '塞尔达传说': '勇',
      '王者荣耀': '战',
      '绝地求生': '存'
    };
    return map[topic.title] || this.generateFallbackCharacter();
  }
}

export default AIClient;
