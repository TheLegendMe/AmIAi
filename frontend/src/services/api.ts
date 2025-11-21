import { CharacterDuelResult, CharacterTopic, ModelProvider } from '../types/game';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

export type CharacterDuelPayload = {
  userChar: string;
  userGuess: 'human' | 'ai';
  provider?: string | null;
  topic: CharacterTopic;
};

export async function fetchProviders(): Promise<ModelProvider[]> {
  const response = await fetch(`${API_URL}/ai/providers`);
  if (!response.ok) {
    throw new Error('Failed to load providers');
  }
  const data = await response.json();
  return data.providers || [];
}

export async function playCharacterDuel(payload: CharacterDuelPayload): Promise<CharacterDuelResult> {
  const response = await fetch(`${API_URL}/ai/char-duel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to start duel');
  }

  return response.json();
}

export async function fetchCharacterTopic(): Promise<CharacterTopic> {
  const response = await fetch(`${API_URL}/ai/char-topic`);
  if (!response.ok) {
    throw new Error('Failed to load topic');
  }
  return response.json();
}

export { API_URL };
