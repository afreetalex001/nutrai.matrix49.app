import type { ChatMessage, ChatOptions } from '@/lib/ai-fallback';

export interface CustomAiConfig {
  method?: 'POST' | 'GET';
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  responsePath: string;
  tokensPath?: string;
}

function getByPath(obj: any, path?: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((acc, part) => {
    if (acc === undefined || acc === null) return undefined;
    const key = /^\d+$/.test(part) ? Number(part) : part;
    return acc[key];
  }, obj);
}

function renderTemplate(value: unknown, ctx: { apiKey: string; model: string; messages: ChatMessage[]; options?: ChatOptions }): unknown {
  if (typeof value === 'string') {
    if (value === '{{messages}}') return ctx.messages;
    if (value === '{{model}}') return ctx.model;
    if (value === '{{apiKey}}') return ctx.apiKey;
    return value
      .replace(/{{apiKey}}/g, ctx.apiKey)
      .replace(/{{model}}/g, ctx.model);
  }
  if (Array.isArray(value)) return value.map((v) => renderTemplate(v, ctx));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, renderTemplate(v, ctx)]));
  }
  return value;
}

export async function callCustomAiProvider(args: {
  configJson?: string | null;
  baseUrl?: string | null;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  options?: ChatOptions;
}): Promise<{ content: string; tokensUsed: number; finishReason?: string }> {
  const config: CustomAiConfig = args.configJson ? JSON.parse(args.configJson) : {
    method: 'POST',
    url: args.baseUrl || '',
    headers: { Authorization: 'Bearer {{apiKey}}', 'Content-Type': 'application/json' },
    body: { model: '{{model}}', messages: '{{messages}}' },
    responsePath: 'choices.0.message.content',
    tokensPath: 'usage.total_tokens',
  };

  const url = config.url || args.baseUrl;
  if (!url || !/^https:\/\//i.test(url)) throw new Error('رابط المزود المخصص يجب أن يبدأ بـ https://');
  if (!config.responsePath) throw new Error('responsePath مطلوب للمزود المخصص');

  const headers = renderTemplate(config.headers || {}, args) as Record<string, string>;
  const body = renderTemplate(config.body ?? { model: '{{model}}', messages: '{{messages}}' }, args);
  const response = await fetch(url, {
    method: config.method || 'POST',
    headers,
    body: (config.method || 'POST') === 'GET' ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }

  if (!response.ok) {
    const error = new Error(`Custom AI provider error: ${response.status} - ${text.slice(0, 500)}`);
    (error as { status?: number }).status = response.status;
    throw error;
  }

  const content = getByPath(data, config.responsePath);
  if (typeof content !== 'string') {
    throw new Error(`لم يتم العثور على نص الرد في المسار: ${config.responsePath}`);
  }

  const tokens = getByPath(data, config.tokensPath);
  return { content, tokensUsed: typeof tokens === 'number' ? tokens : 0 };
}

export const DEFAULT_CUSTOM_AI_CONFIG: CustomAiConfig = {
  method: 'POST',
  url: 'https://api.example.com/v1/chat/completions',
  headers: {
    Authorization: 'Bearer {{apiKey}}',
    'Content-Type': 'application/json',
  },
  body: {
    model: '{{model}}',
    messages: '{{messages}}',
  },
  responsePath: 'choices.0.message.content',
  tokensPath: 'usage.total_tokens',
};
