// ============================================================
// AI Fallback System - نظام التبديل التلقائي للذكاء الاصطناعي
// Sequential Routing / Fallback بين مزودي AI المتعددين
// ============================================================

import { db } from '@/lib/db';

export interface AiProviderConfig {
  id: string;
  name: string;
  displayName: string;
  baseUrl?: string;
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
}

// ====== أنواع الأخطاء التي تؤدي للتبديل ======
const FALLBACK_ERROR_CODES = [
  'rate_limit_exceeded',
  'insufficient_quota',
  'billing_hard_limit_reached',
  'model_overloaded',
  'server_error',
  'timeout',
  '429',  // Too Many Requests
  '503',  // Service Unavailable
  '500',  // Internal Server Error
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
  baseUrl?: string
): Promise<{ content: string; tokensUsed: number }> {
  const url = baseUrl ? `${baseUrl}/v1/chat/completions` : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
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
  };
}

/**
 * استدعاء نموذج Gemini
 */
async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  _baseUrl?: string
): Promise<{ content: string; tokensUsed: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // تحويل الرسائل لصيغة Gemini
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === 'system');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`Gemini API error: ${response.status} - ${errorBody}`);
    (error as { status?: number }).status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    tokensUsed: data.usageMetadata?.totalTokenCount || 0,
  };
}

/**
 * استدعاء نموذج Claude
 */
async function callClaude(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  _baseUrl?: string
): Promise<{ content: string; tokensUsed: number }> {
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
      max_tokens: 2048,
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
  };
}

/**
 * الحصول على المزودين النشطين مرتبين حسب الأولوية
 */
async function getActiveProvidersWithKeys(): Promise<AiProviderConfig[]> {
  const providers = await db.aiProvider.findMany({
    where: { isActive: true },
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
export async function chatWithFallback(
  messages: ChatMessage[],
  userId: string,
  requestType: 'chat' | 'nutrition_plan' | 'exercise_plan' | 'macro_calc' = 'chat'
): Promise<AiResponse> {
  const providers = await getActiveProvidersWithKeys();

  if (providers.length === 0) {
    throw new Error('لا يوجد مزودو ذكاء اصطناعي نشطون. يرجى التواصل مع الإدارة.');
  }

  let fallbackOccurred = false;
  let fallbackReason = '';

  for (const provider of providers) {
    for (const apiKeyConfig of provider.apiKeys) {
      // التحقق من حصة الاستخدام
      if (apiKeyConfig.quotaLimit && apiKeyConfig.quotaUsed >= apiKeyConfig.quotaLimit) {
        fallbackOccurred = true;
        fallbackReason = `Quota exceeded for ${provider.displayName}/${apiKeyConfig.model}`;
        continue;
      }

      const startTime = Date.now();

      try {
        // استدعاء المزود المناسب
        let result: { content: string; tokensUsed: number };

        switch (provider.name) {
          case 'openai':
            result = await callOpenAI(apiKeyConfig.apiKey, apiKeyConfig.model, messages, provider.baseUrl);
            break;
          case 'gemini':
            result = await callGemini(apiKeyConfig.apiKey, apiKeyConfig.model, messages, provider.baseUrl);
            break;
          case 'claude':
            result = await callClaude(apiKeyConfig.apiKey, apiKeyConfig.model, messages, provider.baseUrl);
            break;
          default:
            // دعم مزودين آخرين عبر OpenAI-compatible API
            result = await callOpenAI(apiKeyConfig.apiKey, apiKeyConfig.model, messages, provider.baseUrl);
        }

        const responseTime = Date.now() - startTime;

        // تحديث حصة الاستخدام
        await db.aiApiKey.update({
          where: { id: apiKeyConfig.id },
          data: { quotaUsed: { increment: 1 } },
        });

        // تسجيل الاستخدام الناجح
        await db.aiUsageLog.create({
          data: {
            apiKeyId: apiKeyConfig.id,
            providerId: provider.id,
            userId,
            requestType,
            tokensUsed: result.tokensUsed,
            isSuccess: true,
            responseTime,
          },
        });

        return {
          content: result.content,
          providerUsed: provider.displayName,
          modelUsed: apiKeyConfig.model,
          tokensUsed: result.tokensUsed,
          responseTime,
          fallbackOccurred,
          fallbackReason: fallbackOccurred ? fallbackReason : undefined,
        };

      } catch (error) {
        const responseTime = Date.now() - startTime;
        const { fallback, reason } = shouldFallback(error);

        // تسجيل الخطأ
        await db.aiUsageLog.create({
          data: {
            apiKeyId: apiKeyConfig.id,
            providerId: provider.id,
            userId,
            requestType,
            tokensUsed: 0,
            isSuccess: false,
            errorMessage: String(error).substring(0, 500),
            responseTime,
          },
        });

        // تحديث حالة المفتاح بآخر خطأ
        await db.aiApiKey.update({
          where: { id: apiKeyConfig.id },
          data: {
            lastError: String(error).substring(0, 500),
            lastErrorAt: new Date(),
          },
        });

        if (fallback) {
          fallbackOccurred = true;
          fallbackReason = reason;
          console.warn(
            `[AI Fallback] Switching from ${provider.displayName}/${apiKeyConfig.model}: ${reason}`
          );
          continue; // الانتقال للمفتاح/المزود التالي
        }

        // خطأ لا يستوجب التبديل (مثل خطأ في الطلب نفسه)
        throw error;
      }
    }
  }

  // جميع المزودين فشلوا
  throw new Error(
    'جميع مزودي الذكاء الاصطناعي غير متاحين حالياً. يرجى المحاولة لاحقاً أو التواصل مع الإدارة.'
  );
}

/**
 * إنشاء خطة تغذية باستخدام الذكاء الاصطناعي
 */
export async function generateNutritionPlan(
  patientData: {
    name: string; age: number; gender: string; weight: number; height: number;
    activityLevel: string; goal: string; caloriesTarget: number;
    proteinTarget: number; carbsTarget: number; fatsTarget: number;
    medicalNotes?: string; allergies?: string;
  },
  userId: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `أنت أخصائي تغذية خبير. قم بإنشاء خطة تغذية أسبوعية مفصلة باللغة العربية.
يجب أن تتضمن الخطة:
- 5-6 وجبات يومياً (فطور، سناك صباحي، غداء، سناك مسائي، عشاء، وسناك قبل النوم إن لزم)
- كل وجبة تتضمن: اسم الوجبة، الأطعمة مع الكميات بالغرام، السعرات الحرارية، البروتين، الكربوهيدرات، والدهون
- يجب أن يكون الإجمالي اليومي قريباً من: ${patientData.caloriesTarget} سعرة، ${patientData.proteinTarget}غ بروتين، ${patientData.carbsTarget}غ كربوهيدرات، ${patientData.fatsTarget}غ دهون
- التنويع في الأطعمة خلال الأسبوع
- مراعاة أي ملاحظات طبية أو حساسيات`,
    },
    {
      role: 'user',
      content: `أنشئ خطة تغذية أسبوعية للمريض التالي:
الاسم: ${patientData.name}
العمر: ${patientData.age}
الجنس: ${patientData.gender}
الوزن: ${patientData.weight} كجم
الطول: ${patientData.height} سم
مستوى النشاط: ${patientData.activityLevel}
الهدف: ${patientData.goal}
السعرات المستهدفة: ${patientData.caloriesTarget}
البروتين: ${patientData.proteinTarget}غ
الكربوهيدرات: ${patientData.carbsTarget}غ
الدهون: ${patientData.fatsTarget}غ
${patientData.medicalNotes ? `ملاحظات طبية: ${patientData.medicalNotes}` : ''}
${patientData.allergies ? `حساسيات: ${patientData.allergies}` : ''}`,
    },
  ];

  const response = await chatWithFallback(messages, userId, 'nutrition_plan');
  return response.content;
}

/**
 * إنشاء خطة تمارين رياضية باستخدام الذكاء الاصطناعي
 */
export async function generateExercisePlan(
  patientData: {
    name: string; age: number; gender: string; weight: number;
    activityLevel: string; goal: string; medicalNotes?: string;
  },
  userId: string
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `أنت مدرب رياضي معتمد وأخصائي تغذية. قم بإنشاء خطة تمارين رياضية أسبوعية باللغة العربية.
يجب أن تتضمن الخطة:
- تمارين لـ 5-6 أيام في الأسبوع مع يوم راحة
- كل يوم يتضمن: نوع التمرين، المجموعات (Sets)، التكرارات (Reps)، مدة الراحة بين المجموعات
- الإحماء والتبريد
- تعديل الشدة حسب مستوى نشاط المريض
- مراعاة أي ملاحظات طبية`,
    },
    {
      role: 'user',
      content: `أنشئ خطة تمارين أسبوعية للمريض التالي:
الاسم: ${patientData.name}
العمر: ${patientData.age}
الجنس: ${patientData.gender}
الوزن: ${patientData.weight} كجم
مستوى النشاط: ${patientData.activityLevel}
الهدف: ${patientData.goal}
${patientData.medicalNotes ? `ملاحظات طبية: ${patientData.medicalNotes}` : ''}`,
    },
  ];

  const response = await chatWithFallback(messages, userId, 'exercise_plan');
  return response.content;
}
