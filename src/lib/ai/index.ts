// ============================================================
// AI Fallback System - نظام التبديل التلقائي للذكاء الاصطناعي
// Sequential Routing / Fallback بين مزودي AI المتعددين
// ============================================================

import { db } from '@/lib/db';
import { callCustomAiProvider } from '@/lib/custom-ai-provider';

export interface AiProviderConfig {
  id: string;
  name: string;
  displayName: string;
  baseUrl?: string;
  configJson?: string | null;
  isCustom?: boolean;
  priority: number;
  apiKeys: AiApiKeyConfig[];
}

export interface AiApiKeyConfig {
  id: string;
  apiKey: string;
  model: string;
  isActive: boolean;
  quotaLimit: number | null;
  quotaUsed: number;
  providerId: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
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
  truncated?: boolean; // true إذا الرد توقف بسبب MAX_TOKENS
  finishReason?: string;
}

export interface ChatOptions {
  maxOutputTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  /**
   * parallel = أسرع رد من أي مفتاح (مناسب للشات)
   * sequential = احترام أولوية المزود، مناسب للخطط الطبية حيث الجودة أهم من السرعة
   */
  executionMode?: 'parallel' | 'sequential';
  timeoutMs?: number;
}

// ====== أنواع الأخطاء التي تؤدي للتبديل ======
const FALLBACK_ERROR_CODES = [
  'rate_limit_exceeded',
  'insufficient_quota',
  'billing_hard_limit_reached',
  'model_overloaded',
  'server_error',
  'timeout',
  'permission_denied',
  '403',  // Forbidden / Permission denied
  '429',  // Too Many Requests
  '500',  // Internal Server Error
  '502',  // Bad Gateway
  '503',  // Service Unavailable
  '504',  // Gateway Timeout
];

/**
 * تحديد ما إذا كان الخطأ يستوجب التبديل للمزود التالي
 */
function shouldFallback(error: unknown): { fallback: boolean; reason: string } {
  const errorObj = error as { code?: string; status?: number; message?: string };

  if (errorObj.code && FALLBACK_ERROR_CODES.includes(errorObj.code)) {
    return { fallback: true, reason: `Error code: ${errorObj.code}` };
  }

  if (errorObj.status && FALLBACK_ERROR_CODES.includes(String(errorObj.status))) {
    return { fallback: true, reason: `HTTP status: ${errorObj.status}` };
  }

  if (errorObj.message) {
    const msg = errorObj.message.toLowerCase();
    if (msg.includes('rate limit') || msg.includes('quota') || msg.includes('billing')) {
      return { fallback: true, reason: `Rate/quota error: ${errorObj.message.substring(0, 100)}` };
    }
  }

  return { fallback: false, reason: '' };
}

/**
 * استدعاء نموذج OpenAI
 */
async function callOpenAI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  baseUrl?: string,
  options?: ChatOptions
): Promise<{ content: string; tokensUsed: number; finishReason?: string }> {
  const url = baseUrl ? `${baseUrl}/v1/chat/completions` : 'https://api.openai.com/v1/chat/completions';

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxOutputTokens ?? 8192,
  };
  if (options?.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
    (error as { status?: number }).status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens || 0,
    finishReason: data.choices[0]?.finish_reason,
  };
}

/**
 * تطبيع اسم نموذج Gemini
 * يقبل أسماء مختصرة مثل "gemini" أو "flash" ويحولها لاسم نموذج صالح
 * الأسماء الصالحة (مايو 2026): gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash, gemini-1.5-pro
 */
function normalizeGeminiModel(model: string): string {
  if (!model || typeof model !== 'string') return 'gemini-2.5-flash';

  const m = model.trim().toLowerCase();

  // إذا كان الاسم صالحاً بالفعل (يحتوي على رقم نسخة) نتركه كما هو
  if (/gemini[-_]?\d+(\.\d+)?/.test(m)) {
    // إصلاح حالة استخدام underscore بدل dash
    return m.replace(/_/g, '-').replace(/^models\//, '');
  }

  // أسماء مختصرة شائعة → نموذج افتراضي حديث
  const aliases: Record<string, string> = {
    'gemini': 'gemini-2.5-flash',
    'gemini-flash': 'gemini-2.5-flash',
    'flash': 'gemini-2.5-flash',
    'gemini-pro': 'gemini-2.5-pro',
    'pro': 'gemini-2.5-pro',
    'gemini-flash-lite': 'gemini-2.5-flash-lite',
    'flash-lite': 'gemini-2.5-flash-lite',
  };

  return aliases[m] || 'gemini-2.5-flash';
}

/**
 * استدعاء نموذج Gemini
 */
async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  _baseUrl?: string,
  options?: ChatOptions
): Promise<{ content: string; tokensUsed: number; finishReason?: string }> {
  const normalizedModel = normalizeGeminiModel(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${apiKey}`;

  // تحويل الرسائل لصيغة Gemini
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === 'system');

  const generationConfig: Record<string, unknown> = {
    temperature: options?.temperature ?? 0.7,
    maxOutputTokens: options?.maxOutputTokens ?? 8192,
  };
  if (options?.jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
      generationConfig,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let friendlyHint = '';
    if (response.status === 404) {
      friendlyHint = ` | اسم النموذج "${model}" غير صالح (تم تجربة "${normalizedModel}"). الأسماء الصحيحة: gemini-2.5-flash، gemini-2.5-pro، gemini-2.5-flash-lite، gemini-2.0-flash، gemini-1.5-pro.`;
    } else if (response.status === 400 && /API key/i.test(errorBody)) {
      friendlyHint = ' | تأكد من صحة مفتاح API.';
    } else if (response.status === 429) {
      friendlyHint = ' | تم تجاوز حد الاستخدام (Rate limit).';
    }
    const error = new Error(`Gemini API error: ${response.status} - ${errorBody}${friendlyHint}`);
    (error as { status?: number }).status = response.status;
    throw error;
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  // جمع كل parts (قد تكون أكثر من واحدة في الردود الطويلة)
  const allParts = candidate?.content?.parts || [];
  const content = allParts.map((p: { text?: string }) => p.text || '').join('');

  return {
    content,
    tokensUsed: data.usageMetadata?.totalTokenCount || 0,
    finishReason: candidate?.finishReason,
  };
}

/**
 * استدعاء نموذج Claude
 */
async function callClaude(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  _baseUrl?: string,
  options?: ChatOptions
): Promise<{ content: string; tokensUsed: number; finishReason?: string }> {
  const url = 'https://api.anthropic.com/v1/messages';

  const systemMessage = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: options?.maxOutputTokens ?? 8192,
      temperature: options?.temperature ?? 0.7,
      system: systemMessage?.content,
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`Claude API error: ${response.status} - ${errorBody}`);
    (error as { status?: number }).status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    finishReason: data.stop_reason,
  };
}

/**
 * الحصول على المزودين النشطين مرتبين حسب الأولوية
 */
async function getActiveProvidersWithKeys(): Promise<AiProviderConfig[]> {
  const providers = await db.aiProvider.findMany({
    where: { isActive: true, isDeleted: false },
    include: {
      apiKeys: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { priority: 'asc' },
  });

  return providers.map(p => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    baseUrl: p.baseUrl || undefined,
    configJson: p.configJson || undefined,
    isCustom: p.isCustom || p.name === 'custom',
    priority: p.priority,
    apiKeys: p.apiKeys.map(k => ({
      id: k.id,
      apiKey: k.apiKey,
      model: k.model,
      isActive: k.isActive,
      quotaLimit: k.quotaLimit,
      quotaUsed: k.quotaUsed,
      providerId: k.providerId,
    })),
  }));
}

/**
 * ===== النظام الأساسي: التبديل التلقائي (Sequential Fallback) =====
 *
 * يعمل كالتالي:
 * 1. يحصل على قائمة المزودين مرتبين حسب الأولوية (priority)
 * 2. يحاول استدعاء المزود الأول (أعلى أولوية)
 * 3. إذا فشل بسبب Rate Limit / Quota → ينتقل تلقائياً للمزود التالي
 * 4. يستمر حتى ينجح أو تنفد كل المزودين
 * 5. يسجّل كل محاولة في AiUsageLog
 */
/**
 * استدعاء مزود AI مع timeout (للتنفيذ المتوازي)
 */
async function callProviderWithTimeout(
  provider: AiProviderConfig,
  apiKeyConfig: AiApiKeyConfig,
  messages: ChatMessage[],
  options?: ChatOptions,
  timeoutMs = 45000
): Promise<{ content: string; tokensUsed: number; finishReason?: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout`));
    }, timeoutMs);

    (async () => {
      try {
        let result: { content: string; tokensUsed: number; finishReason?: string };
        switch (provider.name) {
          case 'openai':
            result = await callOpenAI(apiKeyConfig.apiKey, apiKeyConfig.model, messages, provider.baseUrl, options);
            break;
          case 'gemini':
            result = await callGemini(apiKeyConfig.apiKey, apiKeyConfig.model, messages, provider.baseUrl, options);
            break;
          case 'claude':
            result = await callClaude(apiKeyConfig.apiKey, apiKeyConfig.model, messages, provider.baseUrl, options);
            break;
          case 'custom':
            result = await callCustomAiProvider({
              configJson: provider.configJson,
              baseUrl: provider.baseUrl,
              apiKey: apiKeyConfig.apiKey,
              model: apiKeyConfig.model,
              messages,
              options,
            });
            break;
          default:
            result = provider.isCustom || provider.configJson
              ? await callCustomAiProvider({ configJson: provider.configJson, baseUrl: provider.baseUrl, apiKey: apiKeyConfig.apiKey, model: apiKeyConfig.model, messages, options })
              : await callOpenAI(apiKeyConfig.apiKey, apiKeyConfig.model, messages, provider.baseUrl, options);
        }
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    })();
  });
}

/**
 * ===== النظام الجديد: التنفيذ المتوازي (Parallel Execution) =====
 *
 * يعمل كالتالي:
 * 1. يجمع كل مفاتيح API النشطة من جميع المزودين في قائمة واحدة
 * 2. يُطلق كل المفاتيح في نفس اللحظة (متوازياً) باستخدام Promise.race
 * 3. أول مفتاح يرجع بنجاح يُعتمد ويتم إلغاء الباقي
 * 4. يُسجّل كل فشل في AiUsageLog لمعرفة المفاتيح المعطلة
 * 5. إذا فشلت جميع المفاتيح، يرجع خطأ شاملاً
 * 6. يدعم مفاتيح متعددة من نفس المزود (مثلاً 5 مفاتيح OpenAI) تُطلق معاً
 * 7. كل مفتاح له timeout 45 ثانية لمنع التعليق
 */
export async function chatWithFallback(
  messages: ChatMessage[],
  userId: string,
  requestType: 'chat' | 'nutrition_plan' | 'exercise_plan' | 'macro_calc' = 'chat',
  options?: ChatOptions
): Promise<AiResponse> {
  const providers = await getActiveProvidersWithKeys();

  // تسطيح كل المفاتيح من جميع المزودين في قائمة واحدة
  const allKeyConfigs: Array<{ provider: AiProviderConfig; key: AiApiKeyConfig; index: number }> = [];
  let idx = 0;
  for (const provider of providers) {
    for (const apiKeyConfig of provider.apiKeys) {
      // تخطي المفاتيح التي تجاوزت الحصة
      if (apiKeyConfig.quotaLimit && apiKeyConfig.quotaUsed >= apiKeyConfig.quotaLimit) {
        continue;
      }
      allKeyConfigs.push({ provider, key: apiKeyConfig, index: idx++ });
    }
  }

  if (allKeyConfigs.length === 0) {
    throw new Error('لا توجد مفاتيح API فعالة لأي مزود ذكاء اصطناعي. يرجى إضافة مفتاح من لوحة الإدارة.');
  }

  const startTimeOverall = Date.now();
  const failedKeys: Array<{ provider: string; model: string; error: string }> = [];

  if (options?.executionMode === 'sequential') {
    console.log(`[AI Sequential] Trying ${allKeyConfigs.length} keys by provider priority for ${requestType}...`);
    for (const { provider, key, index } of allKeyConfigs) {
      const startTime = Date.now();
      try {
        const result = await callProviderWithTimeout(provider, key, messages, options, options?.timeoutMs || 70000);
        const responseTime = Date.now() - startTime;
        const fr = String(result.finishReason || '').toUpperCase();
        const truncated = ['MAX_TOKENS', 'LENGTH', 'STOP_SEQUENCE'].includes(fr) && fr !== 'STOP';
        await db.aiApiKey.update({ where: { id: key.id }, data: { quotaUsed: { increment: 1 } } });
        await db.aiUsageLog.create({ data: { apiKeyId: key.id, providerId: provider.id, userId, requestType, tokensUsed: result.tokensUsed, isSuccess: true, responseTime } });
        return {
          content: result.content,
          providerUsed: provider.displayName,
          modelUsed: key.model,
          tokensUsed: result.tokensUsed,
          responseTime: Date.now() - startTimeOverall,
          fallbackOccurred: index > 0,
          fallbackReason: index > 0 ? 'Sequential fallback to next provider/key' : undefined,
          truncated,
          finishReason: result.finishReason,
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMsg = String(error).substring(0, 500);
        failedKeys.push({ provider: provider.displayName, model: key.model, error: errorMsg });
        await db.aiUsageLog.create({ data: { apiKeyId: key.id, providerId: provider.id, userId, requestType, tokensUsed: 0, isSuccess: false, errorMessage: errorMsg, responseTime } });
        await db.aiApiKey.update({ where: { id: key.id }, data: { lastError: errorMsg, lastErrorAt: new Date() } });
        console.warn(`[AI Sequential] ❌ Key #${index} (${provider.displayName}/${key.model}) failed: ${errorMsg.substring(0, 120)}`);
      }
    }
    const errorSummary = failedKeys.map(f => `• ${f.provider} (${f.model}): ${f.error.substring(0, 100)}`).join('\n');
    throw new Error(`جميع مزودي الذكاء الاصطناعي غير متاحين حالياً (${allKeyConfigs.length} مفتاح فشل). يرجى المحاولة لاحقاً أو التواصل مع الإدارة.\n\nتفاصيل الأخطاء:\n${errorSummary}`);
  }

  console.log(`[AI Parallel] Firing ${allKeyConfigs.length} keys in parallel across ${providers.length} providers...`);

  // إنشاء وعد لكل مفتاح — يحل عند النجاح ويرفض عند الفشل
  const promises = allKeyConfigs.map(({ provider, key, index }) => {
    return new Promise<AiResponse>(async (resolve, reject) => {
      const startTime = Date.now();
      try {
        // تأخير بسيط (stagger) للمفاتيح من نفس المزود لتجنب rate limit مفاجئ
        // مفاتيح نفس المزود يتأخر كل منها 200ms عن السابق
        const sameProviderKeys = allKeyConfigs.filter(c => c.provider.id === provider.id);
        const keyPosition = sameProviderKeys.findIndex(c => c.key.id === key.id);
        if (keyPosition > 0) {
          await new Promise(r => setTimeout(r, keyPosition * 200));
        }

        const result = await callProviderWithTimeout(provider, key, messages, options, options?.timeoutMs || 45000);
        const responseTime = Date.now() - startTime;
        const fr = String(result.finishReason || '').toUpperCase();
        const truncated = ['MAX_TOKENS', 'LENGTH', 'STOP_SEQUENCE'].includes(fr) && fr !== 'STOP';

        // تحديث حصة الاستخدام (نجاح)
        await db.aiApiKey.update({
          where: { id: key.id },
          data: { quotaUsed: { increment: 1 } },
        });

        // تسجيل الاستخدام الناجح
        await db.aiUsageLog.create({
          data: {
            apiKeyId: key.id,
            providerId: provider.id,
            userId,
            requestType,
            tokensUsed: result.tokensUsed,
            isSuccess: true,
            responseTime,
          },
        });

        console.log(`[AI Parallel] ✅ Key #${index} (${provider.displayName}/${key.model}) succeeded in ${responseTime}ms`);

        resolve({
          content: result.content,
          providerUsed: provider.displayName,
          modelUsed: key.model,
          tokensUsed: result.tokensUsed,
          responseTime: Date.now() - startTimeOverall,
          fallbackOccurred: allKeyConfigs.length > 1,
          fallbackReason: allKeyConfigs.length > 1 ? 'Parallel execution used multiple keys' : undefined,
          truncated,
          finishReason: result.finishReason,
        });
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMsg = String(error).substring(0, 500);

        failedKeys.push({ provider: provider.displayName, model: key.model, error: errorMsg });

        // تسجيل الخطأ
        await db.aiUsageLog.create({
          data: {
            apiKeyId: key.id,
            providerId: provider.id,
            userId,
            requestType,
            tokensUsed: 0,
            isSuccess: false,
            errorMessage: errorMsg,
            responseTime,
          },
        });

        // تحديث حالة المفتاح بآخر خطأ
        await db.aiApiKey.update({
          where: { id: key.id },
          data: {
            lastError: errorMsg,
            lastErrorAt: new Date(),
          },
        });

        console.warn(`[AI Parallel] ❌ Key #${index} (${provider.displayName}/${key.model}) failed: ${errorMsg.substring(0, 120)}`);
        reject(error);
      }
    });
  });

  // اختيار أول وعد ناجح — Promise.any يرجع أول resolve ويرفض فقط لو كلهم رفضوا
  try {
    const response = await Promise.any(promises);
    return response;
  } catch (aggregateError) {
    // جميع المفاتيح فشلت — اجمع الأخطاء في رسالة واحدة واضحة
    const errorSummary = failedKeys
      .map(f => `• ${f.provider} (${f.model}): ${f.error.substring(0, 100)}`)
      .join('\n');
    console.error(`[AI Parallel] ALL ${allKeyConfigs.length} keys failed.\n${errorSummary}`);
    throw new Error(
      `جميع مزودي الذكاء الاصطناعي غير متاحين حالياً (${allKeyConfigs.length} مفتاح فشل). يرجى المحاولة لاحقاً أو التواصل مع الإدارة.\n\nتفاصيل الأخطاء:\n${errorSummary}`
    );
  }
}

/**
 * نسخة "ذكية" من chatWithFallback تكمل الردود المقطوعة تلقائياً
 * تستدعي AI، وإذا توقف بسبب MAX_TOKENS تطلب الإكمال حتى تكتمل (حتى 3 مرات)
 */
export async function chatWithAutoContinue(
  messages: ChatMessage[],
  userId: string,
  requestType: 'chat' | 'nutrition_plan' | 'exercise_plan' | 'macro_calc' = 'chat',
  options?: ChatOptions,
  maxContinuations = 2
): Promise<AiResponse> {
  let combinedContent = '';
  let totalTokens = 0;
  let lastResponse: AiResponse | null = null;
  const conversationHistory = [...messages];

  for (let i = 0; i <= maxContinuations; i++) {
    const response = await chatWithFallback(conversationHistory, userId, requestType, options);
    combinedContent += response.content;
    totalTokens += response.tokensUsed;
    lastResponse = response;

    if (!response.truncated) break;
    if (i === maxContinuations) break;

    // أضف الرد المقطوع + طلب إكمال
    conversationHistory.push({ role: 'assistant', content: response.content });
    conversationHistory.push({
      role: 'user',
      content: options?.jsonMode
        ? 'تابع من حيث توقفت بالضبط. أكمل الـ JSON من نفس النقطة دون إعادة. لا تضع ```json أو أي markdown. ابدأ مباشرة من الحرف التالي الذي توقفت عنده.'
        : 'تابع من حيث توقفت بالضبط. أكمل من نفس النقطة دون إعادة كتابة ما سبق.',
    });
  }

  return {
    ...lastResponse!,
    content: combinedContent,
    tokensUsed: totalTokens,
    truncated: lastResponse?.truncated || false,
  };
}

// ==================== أنواع الخطط المنظمة (JSON Schema) ====================

export interface NutritionPlanItem {
  name: string;       // اسم الصنف
  grams: number;      // الكمية بالجرام
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface NutritionPlanMeal {
  id: string;
  type: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner' | 'snack3';
  name: string;       // مثل "الفطور" أو "سناك صباحي"
  time?: string;      // مثل "08:00"
  items: NutritionPlanItem[];
}

export interface NutritionPlanDay {
  dayName: string;    // السبت، الأحد...
  meals: NutritionPlanMeal[];
}

export interface StructuredNutritionPlan {
  weekDays: NutritionPlanDay[];
  notes?: string;
  dailyTargets?: { calories: number; protein: number; carbs: number; fats: number };
}

export interface ExerciseItem {
  id: string;
  name: string;        // مثل "سكوات بالبار"
  sets: number;
  reps: string;        // مثل "12-15" أو "10"
  restSeconds: number;
  notes?: string;
  videoUrl?: string;   // رابط YouTube اختياري (يعرض في الواجهة، يُتجاهل في الطباعة)
}

export interface ExerciseDay {
  dayName: string;
  isRest: boolean;
  focus?: string;      // مثل "صدر وترايسبس"
  exercises: ExerciseItem[];
}

export interface StructuredExercisePlan {
  weekDays: ExerciseDay[];
  warmup?: string;
  cooldown?: string;
  notes?: string;
}

/**
 * توليد ID قصير عشوائي
 */
function shortId() {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * استخراج JSON من نص قد يحتوي markdown
 */
function extractJson(text: string): string {
  let t = text.trim();
  // إزالة ```json ... ```
  const codeBlockMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) t = codeBlockMatch[1].trim();
  // إذا بدأ بـ } أو ] خطأ، نحاول إيجاد أول { أو [
  const firstBrace = t.search(/[{[]/);
  if (firstBrace > 0) t = t.substring(firstBrace);
  return t;
}


function variationSeed(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function generateNutritionStrategy(patientData: {
  name: string; age: number; gender: string; weight: number; height: number;
  activityLevel: string; goal: string; caloriesTarget: number; proteinTarget: number; carbsTarget: number; fatsTarget: number;
  medicalNotes?: string; doctorNotes?: string; bmi?: number; labReports?: string | null; aiSummary?: string | null; allergies?: string | null;
}, userId: string): Promise<string> {
  const prompt = `حلل حالة المريض كأخصائي تغذية علاجية، ثم اكتب استراتيجية تنفيذية قصيرة لإنشاء خطة غذائية أسبوعية واقعية.
لا تنشئ JSON الآن.

بيانات المريض:
- الاسم: ${patientData.name}
- العمر/الجنس: ${patientData.age} / ${patientData.gender}
- الوزن/الطول: ${patientData.weight} كجم / ${patientData.height} سم${patientData.bmi ? ` / BMI ${Math.round(patientData.bmi * 10) / 10}` : ''}
- النشاط: ${patientData.activityLevel}
- الهدف: ${patientData.goal}
- السعرات والماكروز: ${patientData.caloriesTarget} kcal، بروتين ${patientData.proteinTarget}غ، كارب ${patientData.carbsTarget}غ، دهون ${patientData.fatsTarget}غ
${patientData.medicalNotes ? `- ملاحظات طبية: ${patientData.medicalNotes}` : ''}
${patientData.doctorNotes ? `- ملاحظات الطبيب: ${patientData.doctorNotes}` : ''}
${patientData.allergies ? `- ممنوع/حساسية: ${patientData.allergies}` : ''}
${patientData.labReports ? `- تحاليل: ${patientData.labReports}` : ''}
${patientData.aiSummary ? `- ملخص سابق: ${patientData.aiSummary}` : ''}

اكتب الاستراتيجية في نقاط وتشمل: توزيع الوجبات، نوعية الأطعمة المناسبة، محاذير، كيفية توزيع البروتين والكارب حول النشاط، وقواعد التنويع.`;
  const res = await chatWithAutoContinue(
    [{ role: 'system', content: 'أنت أخصائي تغذية علاجية خبير. أجب بالعربية بدقة واختصار.' }, { role: 'user', content: prompt }],
    userId,
    'nutrition_plan',
    { maxOutputTokens: 2048, temperature: 0.45, executionMode: 'sequential', timeoutMs: 70000 },
    0
  );
  return res.content.slice(0, 4000);
}

async function generateExerciseStrategy(patientData: {
  name: string; age: number; gender: string; weight: number; height?: number;
  activityLevel: string; goal: string; medicalNotes?: string; doctorNotes?: string; bmi?: number;
  labReports?: string | null; aiSummary?: string | null; allergies?: string | null;
}, userId: string, seed: string): Promise<string> {
  const prompt = `حلل حالة المريض كمدرب رياضي وأخصائي Exercise Prescription ثم اختر استراتيجية تدريب أسبوعية مناسبة.
لا تنشئ JSON الآن.

بيانات المريض:
- الاسم: ${patientData.name}
- العمر/الجنس: ${patientData.age} / ${patientData.gender}
- الوزن/الطول: ${patientData.weight} كجم / ${patientData.height || 'غير محدد'} سم${patientData.bmi ? ` / BMI ${Math.round(patientData.bmi * 10) / 10}` : ''}
- النشاط الحالي: ${patientData.activityLevel}
- الهدف: ${patientData.goal}
${patientData.medicalNotes ? `- ملاحظات طبية/إصابات: ${patientData.medicalNotes}` : ''}
${patientData.doctorNotes ? `- ملاحظات الطبيب: ${patientData.doctorNotes}` : ''}
${patientData.labReports ? `- تحاليل: ${patientData.labReports}` : ''}
${patientData.aiSummary ? `- ملخص سابق: ${patientData.aiSummary}` : ''}

Variation Seed: ${seed}

حدد: مستوى المريض المتوقع، عدد أيام التمرين المناسب، نوع التقسيم (Full Body/Upper Lower/PPL/Hybrid)، أيام الراحة، شدة RPE، محاذير، وكيفية التنويع والتدرج. لا تستخدم قالب صدر/ترايسبس تلقائيًا إلا إذا كان مناسبًا فعلاً.`;
  const res = await chatWithAutoContinue(
    [{ role: 'system', content: 'أنت مدرب رياضي عربي معتمد. صمم استراتيجية آمنة وغير مكررة ومناسبة للمريض.' }, { role: 'user', content: prompt }],
    userId,
    'exercise_plan',
    { maxOutputTokens: 2048, temperature: 0.55, executionMode: 'sequential', timeoutMs: 70000 },
    0
  );
  return res.content.slice(0, 4000);
}

function validateNutritionDays(days: NutritionPlanDay[], targets: { calories: number; protein: number }): string[] {
  const issues: string[] = [];
  const seenMeals = new Map<string, number>();
  if (!Array.isArray(days) || days.length === 0) issues.push('لا توجد أيام في الخطة');
  for (const day of days || []) {
    if (!day.meals || day.meals.length !== 5) issues.push(`${day.dayName}: يجب أن يحتوي اليوم على 5 وجبات بالضبط`);
    let calories = 0, protein = 0;
    for (const meal of day.meals || []) {
      if (!meal.items || meal.items.length < 2) issues.push(`${day.dayName}/${meal.name}: الوجبة تحتوي أصناف قليلة جداً`);
      const key = (meal.items || []).map(i => i.name).join('|');
      seenMeals.set(key, (seenMeals.get(key) || 0) + 1);
      for (const item of meal.items || []) {
        calories += Number(item.calories || 0); protein += Number(item.protein || 0);
        if ((item.grams || 0) > 600) issues.push(`${day.dayName}: كمية غير منطقية للصنف ${item.name} (${item.grams}غ)`);
        if ((item.calories || 0) > 1000) issues.push(`${day.dayName}: سعرات صنف مرتفعة جداً ${item.name}`);
      }
    }
    if (targets.calories && Math.abs(calories - targets.calories) / targets.calories > 0.18) issues.push(`${day.dayName}: السعرات بعيدة عن المستهدف (${Math.round(calories)} مقابل ${targets.calories})`);
    if (targets.protein && Math.abs(protein - targets.protein) / targets.protein > 0.25) issues.push(`${day.dayName}: البروتين بعيد عن المستهدف (${Math.round(protein)} مقابل ${targets.protein})`);
  }
  for (const [meal, count] of seenMeals) if (meal && count > 2) issues.push(`تكرار نفس الوجبة أكثر من مرتين: ${meal}`);
  return issues.slice(0, 10);
}

function validateExercisePlan(plan: StructuredExercisePlan): string[] {
  const issues: string[] = [];
  const days = plan.weekDays || [];
  if (days.length !== 7) issues.push('الخطة يجب أن تحتوي 7 أيام بالضبط');
  const rest = days.filter(d => d.isRest).length;
  if (rest < 1 || rest > 3) issues.push(`عدد أيام الراحة غير منطقي (${rest})`);
  const exerciseCounts = new Map<string, number>();
  for (const day of days) {
    if (day.isRest && day.exercises?.length) issues.push(`${day.dayName}: يوم راحة يحتوي تمارين`);
    if (!day.isRest) {
      if (!day.exercises || day.exercises.length < 3 || day.exercises.length > 8) issues.push(`${day.dayName}: عدد التمارين غير مناسب`);
      for (const ex of day.exercises || []) {
        const key = ex.name.trim().toLowerCase();
        exerciseCounts.set(key, (exerciseCounts.get(key) || 0) + 1);
      }
    }
  }
  for (const [name, count] of exerciseCounts) if (count > 2) issues.push(`تكرار زائد للتمرين: ${name}`);
  if (!plan.warmup) issues.push('لا يوجد إحماء');
  if (!plan.cooldown) issues.push('لا يوجد تهدئة/إطالات');
  return issues.slice(0, 10);
}

/**
 * توليد جزء من خطة التغذية (مجموعة أيام محددة)
 */
async function generateNutritionDays(
  patientData: {
    name: string; age: number; gender: string; weight: number; height: number;
    activityLevel: string; goal: string; caloriesTarget: number;
    proteinTarget: number; carbsTarget: number; fatsTarget: number;
    medicalNotes?: string; doctorNotes?: string;
    bmi?: number; inBodyData?: { bodyFat?: number; muscleMass?: number; waterPercentage?: number } | null;
    labReports?: string | null; aiSummary?: string | null; allergies?: string | null;
  },
  dayNames: string[],
  userId: string,
  strategy: string,
  seed: string
): Promise<NutritionPlanDay[]> {
  const inBodyLines = [];
  if (patientData.inBodyData) {
    if (patientData.inBodyData.bodyFat !== undefined && patientData.inBodyData.bodyFat !== null) {
      inBodyLines.push(`نسبة الدهون: ${patientData.inBodyData.bodyFat}%`);
    }
    if (patientData.inBodyData.muscleMass !== undefined && patientData.inBodyData.muscleMass !== null) {
      inBodyLines.push(`الكتلة العضلية: ${patientData.inBodyData.muscleMass} كجم`);
    }
    if (patientData.inBodyData.waterPercentage !== undefined && patientData.inBodyData.waterPercentage !== null) {
      inBodyLines.push(`نسبة الماء: ${patientData.inBodyData.waterPercentage}%`);
    }
  }

  const systemPrompt = `أنت أخصائي تغذية عربي. أنشئ ${dayNames.length} أيام تغذية بصيغة JSON صالحة فقط.

الصيغة المطلوبة بالضبط:
{
  "weekDays": [
    {
      "dayName": "${dayNames[0]}",
      "meals": [
        { "type": "breakfast", "name": "الفطور", "time": "08:00", "items": [{ "name": "بياض بيض", "grams": 100, "calories": 52, "protein": 11, "carbs": 0.7, "fats": 0.2 }] }
      ]
    }
  ]
}

استراتيجية الطبيب/الذكاء قبل التحويل:
${strategy}

Variation Seed: ${seed}

قواعد صارمة:
- الأيام (بالترتيب): ${dayNames.join('، ')}
- لا تنسخ المثال الموجود في البنية، هو للتوضيح فقط.
- كل يوم 5 وجبات بالضبط:
  1) breakfast - الفطور - 08:00
  2) snack1 - سناك صباحي - 10:30
  3) lunch - الغداء - 14:00
  4) snack2 - سناك مسائي - 17:00
  5) dinner - العشاء - 20:00
- كل وجبة 2-4 أصناف، أرقام دقيقة لكل صنف
- الإجمالي اليومي قريب من ${patientData.caloriesTarget} سعرة (±7-10%)، ${patientData.proteinTarget}غ بروتين (±10%)
- وزع البروتين على 4 وجبات على الأقل ولا تضع معظم البروتين في وجبة واحدة.
- أطعمة عربية/مصرية واقعية وقابلة للتنفيذ، مع تنويع واضح بين الأيام.
- ممنوع كميات غير منطقية: لا تستخدم 500غ شوفان، 1 كجم دجاج، أو صنف واحد فوق 900 سعرة إلا لسبب واضح.
- لا تكرر نفس الوجبة أو نفس تركيبة الأصناف أكثر من مرتين في الأسبوع.
${patientData.medicalNotes ? `- راعي الملاحظات الطبية: ${patientData.medicalNotes}` : ''}
${patientData.allergies ? `- تجنب: ${patientData.allergies}` : ''}
${patientData.doctorNotes ? `- ملاحظات الطبيب: ${patientData.doctorNotes}` : ''}
${inBodyLines.length > 0 ? `- بيانات InBody: ${inBodyLines.join('، ')}` : ''}
${patientData.labReports ? `- تحاليل مخبرية: ${patientData.labReports}` : ''}
${patientData.aiSummary ? `- ملخص المريض: ${patientData.aiSummary}` : ''}

JSON فقط. ابدأ بـ { وانته بـ }.`;

  const userPrompt = `المريض: ${patientData.name}، ${patientData.age}س، ${patientData.gender}، ${patientData.weight}كجم/${patientData.height}سم${patientData.bmi ? `، BMI: ${Math.round(patientData.bmi * 10) / 10}` : ''}. هدف: ${patientData.goal}.`;

  const response = await chatWithAutoContinue(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    userId,
    'nutrition_plan',
    { maxOutputTokens: 8192, temperature: 0.55, jsonMode: true, executionMode: 'sequential', timeoutMs: 70000 },
    1
  );

  const cleaned = extractJson(response.content);
  let parsed: { weekDays: NutritionPlanDay[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse nutrition partial. Sample:', cleaned.substring(0, 500));
    throw new Error(`فشل تحويل خطة التغذية من AI إلى JSON. حاول مرة أخرى.`);
  }

  return parsed.weekDays || [];
}

/**
 * إنشاء خطة تغذية أسبوعية منظمة (JSON) - يولّد بالتوازي للسرعة
 */
export async function generateNutritionPlan(
  patientData: {
    name: string; age: number; gender: string; weight: number; height: number;
    activityLevel: string; goal: string; caloriesTarget: number;
    proteinTarget: number; carbsTarget: number; fatsTarget: number;
    medicalNotes?: string; doctorNotes?: string;
    bmi?: number; inBodyData?: { bodyFat?: number; muscleMass?: number; waterPercentage?: number } | null;
    labReports?: string | null; aiSummary?: string | null; allergies?: string | null;
  },
  userId: string
): Promise<StructuredNutritionPlan> {
  const inBodyLines = [];
  if (patientData.inBodyData) {
    if (patientData.inBodyData.bodyFat !== undefined && patientData.inBodyData.bodyFat !== null) inBodyLines.push(`نسبة الدهون: ${patientData.inBodyData.bodyFat}%`);
    if (patientData.inBodyData.muscleMass !== undefined && patientData.inBodyData.muscleMass !== null) inBodyLines.push(`الكتلة العضلية: ${patientData.inBodyData.muscleMass} كجم`);
    if (patientData.inBodyData.waterPercentage !== undefined && patientData.inBodyData.waterPercentage !== null) inBodyLines.push(`نسبة الماء: ${patientData.inBodyData.waterPercentage}%`);
  }

  // --- Stage 1: Free Text Generation (High Quality Thinking) ---
  const systemPromptStage1 = `أنت أخصائي تغذية علاجي خبير. بناءً على بيانات المريض، قم بكتابة خطة غذائية أسبوعية كاملة (7 أيام) في صيغة نصية (Markdown).
هذه المرحلة مخصصة للإبداع واختيار أفضل الأطعمة وتوزيع الوجبات باحترافية كما تفعل في الاستشارات المباشرة.

قواعد الخطة:
1. اذكر 7 أيام بوضوح (من السبت إلى الجمعة).
2. لكل يوم، اكتب 5 وجبات (الفطور، سناك صباحي، الغداء، سناك مسائي، العشاء).
3. لكل وجبة، اكتب الأصناف مقترنة بالكمية التقريبية بالجرامات ومقدار السعرات والماكروز (بروتين، كارب، دهون) التقريبي.
4. يجب أن يكون الإجمالي اليومي قريباً جداً من أهداف المريض: ${patientData.caloriesTarget} سعرة، ${patientData.proteinTarget}غ بروتين، ${patientData.carbsTarget}غ كارب، ${patientData.fatsTarget}غ دهون.
5. نوّع في الخيارات ووزع البروتين جيداً على مدار اليوم.
6. استخدم أطعمة حقيقية وقابلة للتنفيذ في البيئة العربية.
${patientData.medicalNotes ? `7. راعي الملاحظات الطبية: ${patientData.medicalNotes}` : ''}
${patientData.doctorNotes ? `8. ملاحظات الطبيب: ${patientData.doctorNotes}` : ''}
${patientData.allergies ? `9. تجنب/ممنوعات: ${patientData.allergies}` : ''}
${inBodyLines.length > 0 ? `10. بيانات InBody: ${inBodyLines.join('، ')}` : ''}

اكتب الخطة بوضوح واحترافية.`;

  const userPromptStage1 = `بيانات المريض:
- الاسم: ${patientData.name}، ${patientData.age} سنة، ${patientData.gender}
- الوزن: ${patientData.weight} كجم، الطول: ${patientData.height} سم${patientData.bmi ? `، BMI: ${Math.round(patientData.bmi * 10) / 10}` : ''}
- النشاط: ${patientData.activityLevel}
- الهدف: ${patientData.goal}`;

  const stage1Response = await chatWithAutoContinue(
    [
      { role: 'system', content: systemPromptStage1 },
      { role: 'user', content: userPromptStage1 },
    ],
    userId,
    'nutrition_plan',
    { maxOutputTokens: 8192, temperature: 0.65, executionMode: 'sequential', timeoutMs: 70000 },
    2
  );

  const markdownPlan = stage1Response.content;

  // --- Stage 2: JSON Extraction ---
  const systemPromptStage2 = `أنت أداة لاستخراج البيانات. قم بتحويل الخطة الغذائية النصية التالية إلى صيغة JSON صالحة فقط بناءً على هذه الهيكلة بالضبط:

{
  "weekDays": [
    {
      "dayName": "السبت",
      "meals": [
        {
          "type": "breakfast",
          "name": "الفطور",
          "time": "08:00",
          "items": [
            { "name": "بياض بيض", "grams": 100, "calories": 52, "protein": 11, "carbs": 0.7, "fats": 0.2 },
            { "name": "خبز أسمر", "grams": 50, "calories": 130, "protein": 4, "carbs": 25, "fats": 1.5 }
          ]
        }
      ]
    }
  ]
}

قواعد الاستخراج:
1. يجب أن يكون هناك بالضبط 7 أيام.
2. ⚠️ تحذير هام جداً: يجب فصل كل صنف طعام كعنصر مستقل في مصفوفة (items). ممنوع دمج الأصناف في عنصر واحد (مثل "100 جرام فول + بيضة + خبز")! كل مكون (فول، بيض، خبز) يجب أن يكون له item خاص به ليسهل على الطبيب تعديله.
3. استخرج الأرقام بدقة (grams, calories, protein, carbs, fats).
4. اجعل types الوجبات كالتالي: breakfast, snack1, lunch, snack2, dinner.
5. إرجاع JSON صالح فقط، بدون أي نصوص قبله أو بعده.`;

  const userPromptStage2 = `استخرج JSON من هذه الخطة:

${markdownPlan}`;

  const stage2Response = await chatWithAutoContinue(
    [
      { role: 'system', content: systemPromptStage2 },
      { role: 'user', content: userPromptStage2 },
    ],
    userId,
    'nutrition_plan',
    { maxOutputTokens: 8192, temperature: 0.1, jsonMode: true, executionMode: 'sequential', timeoutMs: 70000 },
    1
  );

  const cleaned = extractJson(stage2Response.content);
  let parsed: StructuredNutritionPlan;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse nutrition plan JSON. Sample:', cleaned.substring(0, 500));
    throw new Error('فشل تحويل خطة التغذية من AI إلى صيغة منظمة. يرجى المحاولة مرة أخرى.');
  }

  // ضمان IDs
  if (parsed.weekDays && Array.isArray(parsed.weekDays)) {
    for (const day of parsed.weekDays) {
      for (const meal of day.meals || []) {
        if (!meal.id) meal.id = shortId();
        for (const item of meal.items || []) {
          item.calories = Math.round(item.calories || 0);
          item.protein = Math.round((item.protein || 0) * 10) / 10;
          item.carbs = Math.round((item.carbs || 0) * 10) / 10;
          item.fats = Math.round((item.fats || 0) * 10) / 10;
        }
      }
    }
  }

  return {
    weekDays: parsed.weekDays || [],
    notes: parsed.notes,
    dailyTargets: {
      calories: patientData.caloriesTarget,
      protein: patientData.proteinTarget,
      carbs: patientData.carbsTarget,
      fats: patientData.fatsTarget,
    },
  };
}

/**
 * النسخة القديمة (deprecated) - تركتها للتوافق
 */
async function _unusedOldGenerate(
  patientData: {
    name: string; age: number; gender: string; weight: number; height: number;
    activityLevel: string; goal: string; caloriesTarget: number;
    proteinTarget: number; carbsTarget: number; fatsTarget: number;
    medicalNotes?: string; allergies?: string;
  },
  userId: string
): Promise<StructuredNutritionPlan> {
  const systemPrompt = `أنت أخصائي تغذية عربي خبير. أنشئ خطة تغذية أسبوعية كاملة (7 أيام) بصيغة JSON صالحة فقط (بدون markdown، بدون نص قبل أو بعد).

البنية المطلوبة بالضبط:
{
  "weekDays": [
    {
      "dayName": "السبت",
      "meals": [
        {
          "type": "breakfast",
          "name": "الفطور",
          "time": "08:00",
          "items": [
            { "name": "بياض بيض مسلوق", "grams": 100, "calories": 52, "protein": 11, "carbs": 0.7, "fats": 0.2 }
          ]
        }
      ]
    }
  ],
  "notes": "ملاحظات عامة",
  "dailyTargets": { "calories": ${patientData.caloriesTarget}, "protein": ${patientData.proteinTarget}, "carbs": ${patientData.carbsTarget}, "fats": ${patientData.fatsTarget} }
}

قواعد صارمة:
1. **بالضبط 7 أيام** (السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة)
2. كل يوم بالضبط **5 وجبات** بهذا الترتيب والأنواع:
   - type: "breakfast", name: "الفطور", time: "08:00"
   - type: "snack1", name: "سناك صباحي", time: "10:30"
   - type: "lunch", name: "الغداء", time: "14:00"
   - type: "snack2", name: "سناك مسائي", time: "17:00"
   - type: "dinner", name: "العشاء", time: "20:00"
3. كل وجبة بها **2-5 أصناف** (items)
4. كل صنف يحتوي: name (عربي)، grams (رقم)، calories، protein، carbs، fats (أرقام دقيقة لتلك الكمية)
5. الإجمالي اليومي يجب أن يقترب من: ${patientData.caloriesTarget} سعرة، ${patientData.proteinTarget}غ بروتين، ${patientData.carbsTarget}غ كربوهيدرات، ${patientData.fatsTarget}غ دهون (±10%)
6. تنويع بين الأيام (لا تكرر نفس الأطعمة)
7. أطعمة عربية شعبية مفضّلة (شوفان، فول، بيض، دجاج، أرز، سلطة...)
8. ${patientData.medicalNotes ? `راعي: ${patientData.medicalNotes}` : ''}
9. ${patientData.allergies ? `تجنب: ${patientData.allergies}` : ''}

أرجع JSON صالحاً فقط. ابدأ بـ { وانته بـ }.`;

  const userPrompt = `بيانات المريض:
- الاسم: ${patientData.name}
- العمر: ${patientData.age}، الجنس: ${patientData.gender}
- الوزن: ${patientData.weight}كجم، الطول: ${patientData.height}سم
- مستوى النشاط: ${patientData.activityLevel}
- الهدف: ${patientData.goal}

أنشئ الخطة الأسبوعية الآن.`;

  const response = await chatWithAutoContinue(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    userId,
    'nutrition_plan',
    { maxOutputTokens: 16384, temperature: 0.6, jsonMode: true },
    2
  );

  const cleaned = extractJson(response.content);
  let parsed: StructuredNutritionPlan;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse nutrition plan JSON. Content sample:', cleaned.substring(0, 500));
    throw new Error(`فشل تحويل خطة التغذية من AI إلى صيغة منظمة. ${response.truncated ? 'الرد توقف لتجاوز الحد. حاول مرة أخرى.' : 'الرد لم يكن JSON صالحاً.'}`);
  }

  // ضمان أن كل وجبة وكل عنصر لهم id
  if (parsed.weekDays && Array.isArray(parsed.weekDays)) {
    for (const day of parsed.weekDays) {
      for (const meal of day.meals || []) {
        if (!meal.id) meal.id = shortId();
        for (const item of meal.items || []) {
          // recompute values to be safe
          item.calories = Math.round(item.calories || 0);
          item.protein = Math.round((item.protein || 0) * 10) / 10;
          item.carbs = Math.round((item.carbs || 0) * 10) / 10;
          item.fats = Math.round((item.fats || 0) * 10) / 10;
        }
      }
    }
  }

  return parsed;
}

/**
 * إنشاء خطة تمارين أسبوعية منظمة (JSON)
 */
export async function generateExercisePlan(
  patientData: {
    name: string; age: number; gender: string; weight: number; height?: number;
    activityLevel: string; goal: string; medicalNotes?: string; doctorNotes?: string;
    bmi?: number; inBodyData?: { bodyFat?: number; muscleMass?: number; waterPercentage?: number } | null;
    labReports?: string | null; aiSummary?: string | null; allergies?: string | null;
  },
  userId: string
): Promise<StructuredExercisePlan> {
  const inBodyLines = [];
  if (patientData.inBodyData) {
    if (patientData.inBodyData.bodyFat !== undefined && patientData.inBodyData.bodyFat !== null) inBodyLines.push(`نسبة الدهون: ${patientData.inBodyData.bodyFat}%`);
    if (patientData.inBodyData.muscleMass !== undefined && patientData.inBodyData.muscleMass !== null) inBodyLines.push(`الكتلة العضلية: ${patientData.inBodyData.muscleMass} كجم`);
    if (patientData.inBodyData.waterPercentage !== undefined && patientData.inBodyData.waterPercentage !== null) inBodyLines.push(`نسبة الماء: ${patientData.inBodyData.waterPercentage}%`);
  }

  // --- Stage 1: Free Text Generation (High Quality Thinking) ---
  const systemPromptStage1 = `أنت مدرب رياضي عربي محترف. بناءً على بيانات المريض، قم بكتابة خطة تمارين أسبوعية كاملة (7 أيام) في صيغة نصية (Markdown).
هذه المرحلة مخصصة لإنشاء خطة احترافية واقعية تصف الأيام، أيام الراحة، وتفاصيل التمارين كأنك تكتبها في استشارة مباشرة.

قواعد الخطة:
1. اذكر 7 أيام بوضوح (من السبت إلى الجمعة).
2. حدد أيام التمرين وأيام الراحة بناءً على مستوى المريض (مبتدئ: 3-4 أيام تمرين، متوسط/متقدم: 4-6 أيام).
3. لكل يوم تمرين، حدد التركيز (مثال: Push, Pull, Legs, Full Body, Upper...).
4. اذكر التمارين لكل يوم تمرين بوضوح، مع ذكر: اسم التمرين، المجاميع (Sets)، التكرارات (Reps)، وقت الراحة بالثواني، وأي ملاحظات فنية للأداء.
5. ركز على هدف المريض وأمان مفاصله وقلبه.
${patientData.medicalNotes ? `6. راعي الملاحظات الطبية: ${patientData.medicalNotes}` : ''}
${patientData.doctorNotes ? `7. ملاحظات الطبيب: ${patientData.doctorNotes}` : ''}
${inBodyLines.length > 0 ? `8. بيانات InBody: ${inBodyLines.join('، ')}` : ''}

اكتب الخطة بوضوح، أضف إرشادات الإحماء (Warmup) والإطالات (Cooldown) وملاحظات عامة.`;

  const userPromptStage1 = `بيانات المتدرب:
- الاسم: ${patientData.name}، ${patientData.age} سنة، ${patientData.gender}
- الوزن: ${patientData.weight} كجم، الطول: ${patientData.height ? patientData.height + ' سم' : 'غير محدد'}${patientData.bmi ? `، BMI: ${Math.round(patientData.bmi * 10) / 10}` : ''}
- النشاط: ${patientData.activityLevel}
- الهدف: ${patientData.goal}`;

  const stage1Response = await chatWithAutoContinue(
    [
      { role: 'system', content: systemPromptStage1 },
      { role: 'user', content: userPromptStage1 },
    ],
    userId,
    'exercise_plan',
    { maxOutputTokens: 8192, temperature: 0.65, executionMode: 'sequential', timeoutMs: 70000 },
    2
  );

  const markdownPlan = stage1Response.content;

  // --- Stage 2: JSON Extraction ---
  const systemPromptStage2 = `أنت أداة لاستخراج البيانات. قم بتحويل خطة التمارين النصية التالية إلى صيغة JSON صالحة فقط بناءً على هذه الهيكلة بالضبط:

{
  "weekDays": [
    {
      "dayName": "السبت",
      "isRest": false,
      "focus": "التركيز (مثال: Push أو كارديو)",
      "exercises": [
        { "name": "اسم التمرين", "sets": 3, "reps": "8-12", "restSeconds": 60, "notes": "ملاحظات الأداء" }
      ]
    },
    {
      "dayName": "الأحد",
      "isRest": true,
      "focus": "راحة",
      "exercises": []
    }
  ],
  "warmup": "وصف الإحماء",
  "cooldown": "وصف الإطالات",
  "notes": "ملاحظات عامة"
}

قواعد الاستخراج:
1. بالضبط 7 أيام.
2. إذا كان اليوم يوم راحة، اجعل isRest = true و exercises مصفوفة فارغة [].
3. استخرج التمارين بدقة من النص إن وجدت.
4. إرجاع JSON صالح فقط.`;

  const userPromptStage2 = `استخرج JSON من هذه الخطة:

${markdownPlan}`;

  const stage2Response = await chatWithAutoContinue(
    [
      { role: 'system', content: systemPromptStage2 },
      { role: 'user', content: userPromptStage2 },
    ],
    userId,
    'exercise_plan',
    { maxOutputTokens: 8192, temperature: 0.1, jsonMode: true, executionMode: 'sequential', timeoutMs: 70000 },
    1
  );

  const cleaned = extractJson(stage2Response.content);
  let parsed: StructuredExercisePlan;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse exercise plan JSON. Sample:', cleaned.substring(0, 500));
    throw new Error('فشل تحويل خطة التمارين من AI إلى صيغة منظمة. يرجى المحاولة مرة أخرى.');
  }

  // ضمان IDs للتمارين
  if (parsed.weekDays && Array.isArray(parsed.weekDays)) {
    for (const day of parsed.weekDays) {
      if (!day.isRest && day.exercises) {
        for (const ex of day.exercises) {
          if (!ex.id) ex.id = shortId();
        }
      } else if (day.isRest) {
        day.exercises = day.exercises || [];
      }
    }
  }

  return parsed;
}

/**
 * حساب إجمالي السعرات والماكروز لخطة تغذية
 */
export function calculatePlanTotals(plan: StructuredNutritionPlan): {
  perDay: Array<{ dayName: string; calories: number; protein: number; carbs: number; fats: number }>;
  average: { calories: number; protein: number; carbs: number; fats: number };
} {
  const perDay = plan.weekDays.map(day => {
    let calories = 0, protein = 0, carbs = 0, fats = 0;
    for (const meal of day.meals || []) {
      for (const item of meal.items || []) {
        calories += item.calories || 0;
        protein += item.protein || 0;
        carbs += item.carbs || 0;
        fats += item.fats || 0;
      }
    }
    return {
      dayName: day.dayName,
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fats: Math.round(fats * 10) / 10,
    };
  });

  const n = perDay.length || 1;
  const average = {
    calories: Math.round(perDay.reduce((s, d) => s + d.calories, 0) / n),
    protein: Math.round((perDay.reduce((s, d) => s + d.protein, 0) / n) * 10) / 10,
    carbs: Math.round((perDay.reduce((s, d) => s + d.carbs, 0) / n) * 10) / 10,
    fats: Math.round((perDay.reduce((s, d) => s + d.fats, 0) / n) * 10) / 10,
  };

  return { perDay, average };
}
