// ============================================================
// AI Chat API - المحادثة مع الذكاء الاصطناعي
// POST: إرسال رسالة والحصول على رد من AI
// يدعم تمرير patientId لحقن سياق المريض الكامل في المحادثة
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { chatWithAutoContinue, type ChatMessage } from '@/lib/ai-fallback';
import { buildPatientContext } from '@/lib/ai-vision';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const body = await request.json();
    const { messages, conversationId, patientId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'الرسائل مطلوبة' },
        { status: 400 }
      );
    }

    // ===== بناء قائمة المرضى الموجزة للطبيب (للسياق العام) =====
    const doctorPatients = await db.patient.findMany({
      where: { doctorId: user.id, isActive: true },
      select: {
        id: true,
        name: true,
        age: true,
        gender: true,
        weight: true,
        height: true,
        goal: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    const patientsListContext = doctorPatients.length > 0
      ? `\n\n=== قائمة مرضى الطبيب (${doctorPatients.length}) ===\n` +
        doctorPatients.map(p => {
          const parts: string[] = [`• ${p.name}`];
          if (p.age) parts.push(`${p.age} سنة`);
          if (p.gender) parts.push(p.gender === 'male' ? 'ذكر' : p.gender === 'female' ? 'أنثى' : p.gender);
          if (p.weight) parts.push(`${p.weight}كجم`);
          if (p.goal) parts.push(`هدف: ${p.goal}`);
          return parts.join(' - ');
        }).join('\n')
      : '';

    // ===== سياق مريض محدد إن وُجد =====
    let focusedPatientContext = '';
    let focusedPatientName = '';
    if (patientId) {
      const patient = await db.patient.findFirst({
        where: { id: patientId, doctorId: user.id, isActive: true },
        include: {
          visits: { orderBy: { visitDate: 'desc' }, take: 5 },
          nutritionPlans: { where: { isActive: true }, take: 2, orderBy: { createdAt: 'desc' } },
          exercisePlans: { where: { isActive: true }, take: 2, orderBy: { createdAt: 'desc' } },
        },
      });
      if (patient) {
        focusedPatientName = patient.name;
        focusedPatientContext = `\n\n=== المريض المحدد للمناقشة ===\n${buildPatientContext(patient)}`;
      }
    }

    // ===== بناء System Prompt شامل =====
    const systemPrompt = `أنت "مساعد NutriClinic الذكي" - مساعد طبي متخصص في علم التغذية الإكلينيكية يساعد د. ${user.name} في إدارة عيادة التغذية.

دورك:
- تحليل بيانات المرضى وقراءة تحاليلهم والتوصية بخطط تغذية وتمارين
- الإجابة على استفسارات الطبيب بدقة طبية وعلمية
- اقتراح تعديلات على الخطط بناءً على تطور المريض
- تنبيه الطبيب لأي قيم تحاليل خارج النطاق الطبيعي
- استخدام البيانات المتاحة عن المرضى (المذكورة أدناه) بدلاً من السؤال عنها

قواعد:
- أجب دائماً بالعربية الفصحى المبسطة
- كن مختصراً ومحدداً، استخدم نقاط مرقمة عند تعداد التوصيات
- إذا كانت بيانات المريض ناقصة لاتخاذ قرار، اطلبها صراحة
- لا تخترع بيانات لم تُذكر
- معلومات الطبيب الحالي: ${user.email} - ${user.role === 'admin' ? 'مدير' : 'طبيب'}${patientsListContext}${focusedPatientContext}`;

    // ===== تجهيز قائمة الرسائل بإضافة system prompt في البداية =====
    const userMessages = messages.filter((m: { role: string }) => m.role !== 'system');
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...userMessages.map((m: { role: string; content: string }) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // ===== الحصول على المحادثة أو إنشاؤها =====
    let conversation;
    if (conversationId) {
      conversation = await db.aiConversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!conversation) {
        return Response.json({ error: 'المحادثة غير موجودة' }, { status: 404 });
      }
    } else {
      const lastUserMsg = chatMessages.filter(m => m.role === 'user').pop();
      const title = focusedPatientName
        ? `${focusedPatientName} - ${lastUserMsg?.content.substring(0, 50) || 'محادثة'}`
        : lastUserMsg?.content.substring(0, 100) || 'محادثة جديدة';
      conversation = await db.aiConversation.create({
        data: { userId: user.id, title },
        include: { messages: true },
      });
    }

    // Save user message
    const lastUserMessage = chatMessages[chatMessages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await db.aiMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: lastUserMessage.content,
        },
      });
    }

    // Call AI with auto-continue (resumes if truncated by MAX_TOKENS)
    const aiResponse = await chatWithAutoContinue(
      chatMessages,
      user.id,
      'chat',
      { maxOutputTokens: 8192, temperature: 0.7 },
      2 // up to 2 continuations
    );

    // Save AI response
    await db.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        providerUsed: aiResponse.providerUsed,
        tokensUsed: aiResponse.tokensUsed,
      },
    });

    await db.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return Response.json({
      conversationId: conversation.id,
      response: aiResponse.content,
      providerUsed: aiResponse.providerUsed,
      modelUsed: aiResponse.modelUsed,
      tokensUsed: aiResponse.tokensUsed,
      fallbackOccurred: aiResponse.fallbackOccurred,
      truncated: aiResponse.truncated,
      contextInfo: {
        patientsIncluded: doctorPatients.length,
        focusedPatient: focusedPatientName || null,
      },
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء المحادثة مع الذكاء الاصطناعي';
    return Response.json({ error: message }, { status: 500 });
  }
}
