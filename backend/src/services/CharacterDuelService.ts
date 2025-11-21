import AIClient from './AIClient';
import { CharacterTopic } from '../models/types';

export interface CharacterDuelPayload {
  userChar: string;
  userGuess: 'human' | 'ai';
  provider?: string;
  topic: CharacterTopic;
}

export interface CharacterDuelResult {
  userChar: string;
  userGuess: 'human' | 'ai';
  userGuessCorrect: boolean;
  aiChar: string;
  aiGuess: 'human' | 'ai';
  aiGuessCorrect: boolean;
  aiReason: string;
  aiConfidence: number;
  providerUsed?: string;
  topic: CharacterTopic;
}

export class CharacterDuelService {
  constructor(private aiClient: AIClient) {}

  async playRound(payload: CharacterDuelPayload): Promise<CharacterDuelResult> {
    const sanitizedInput = this.normalizeUserChar(payload.userChar);
    const provider = payload.provider && payload.provider !== 'auto' ? payload.provider : undefined;
    const topic = this.normalizeTopic(payload.topic);

    const aiTurn = await this.aiClient.generateCharacterDuelTurn(sanitizedInput, topic, provider);
    
    return {
      userChar: sanitizedInput,
      userGuess: payload.userGuess,
      userGuessCorrect: payload.userGuess === 'ai',
      aiChar: aiTurn.character,
      aiGuess: aiTurn.guess,
      aiGuessCorrect: aiTurn.guess === 'human',
      aiReason: aiTurn.reason,
      aiConfidence: aiTurn.confidence,
      providerUsed: aiTurn.provider || provider,
      topic
    };
  }

  async generateTopic(): Promise<CharacterTopic> {
    return this.aiClient.generateCharacterTopic();
  }

  private normalizeUserChar(char: string): string {
    if (!char) {
      throw new Error('字符不能为空');
    }

    const trimmed = char.trim();
    if (trimmed.length !== 1) {
      throw new Error('请只输入1个汉字');
    }

    const isChinese = /^[\u4e00-\u9fa5]$/.test(trimmed);
    if (!isChinese) {
      throw new Error('只能输入汉字');
    }

    return trimmed;
  }

  private normalizeTopic(topic?: CharacterTopic): CharacterTopic {
    if (!topic) {
      return {
        category: 'person',
        title: '李白',
        description: '盛唐诗人',
        clue: '酒'
      };
    }

    return {
      category: topic.category === 'game' ? 'game' : 'person',
      title: topic.title?.slice(0, 12) || '未知主题',
      description: topic.description?.slice(0, 40) || '神秘主题',
      clue: topic.clue?.slice(0, 20) || '自由发挥'
    };
  }
}

export default CharacterDuelService;
