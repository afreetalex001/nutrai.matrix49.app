import { NextRequest } from 'next/server';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';
import { callCustomAiProvider } from '@/lib/custom-ai-provider';
import type { ChatMessage } from '@/lib/ai-fallback';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const body = await request.json();
    const messages: ChatMessage[] = [{ role: 'user', content: body.testPrompt || 'قل كلمة اختبار فقط' }];
    const result = await callCustomAiProvider({
      configJson: body.configJson,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      model: body.model || 'default',
      messages,
      options: { maxOutputTokens: 64, temperature: 0.1 },
    });

    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشل اختبار المزود';
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
