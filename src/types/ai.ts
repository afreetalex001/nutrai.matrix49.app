export type AiRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: AiRole;
  content: string;
}

export interface AiResponse {
  content: string;
  providerUsed: string;
  modelUsed: string;
  tokensUsed: number;
  responseTime: number;
  fallbackOccurred: boolean;
  fallbackReason?: string;
  truncated?: boolean;
  finishReason?: string;
}

export interface AiApiKeyConfig {
  id: string;
  providerId: string;
  apiKey: string;
  model: string;
  isActive: boolean;
  quotaLimit: number | null;
  quotaUsed: number;
  quotaResetAt?: string | null;
  lastError?: string | null;
  lastErrorAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiProviderConfig {
  id: string;
  name: string;
  displayName: string;
  baseUrl?: string | null;
  configJson?: string | null;
  isCustom?: boolean;
  isActive?: boolean;
  priority: number;
  apiKeys: AiApiKeyConfig[];
}

export interface AiProviderWithStats extends AiProviderConfig {
  createdAt?: string;
  updatedAt?: string;
  _count: { usageLogs: number };
  stats: {
    _count: { id: number };
    _sum: { tokensUsed: number | null };
    _avg: { responseTime: number | null };
  };
}

export interface ChatOptions {
  maxOutputTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  executionMode?: 'parallel' | 'sequential';
  timeoutMs?: number;
}

export interface Conversation {
  id: string;
  title?: string;
  updatedAt?: string;
  createdAt?: string;
  _count?: { messages: number };
}

export interface AiMessage {
  id?: string;
  role: AiRole;
  content: string;
  providerUsed?: string | null;
  tokensUsed?: number | null;
  createdAt?: string;
}
