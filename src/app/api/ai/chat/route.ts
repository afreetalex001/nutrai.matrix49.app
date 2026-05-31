// ============================================================
// AI Chat API - المحادثة مع الذكاء الاصطناعي
// POST: إرسال رسالة والحصول على رد من AI
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { chatWithFallback, type ChatMessage } from '@/lib/ai-fallback';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const body = await request.json();
    const { messages, conversationId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'الرسائل مطلوبة' },
        { status: 400 }
      );
    }

    // Validate message format
    const chatMessages: ChatMessage[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.aiConversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return Response.json(
          { error: 'المحادثة غير موجودة' },
          { status: 404 }
        );
      }
    } else {
      // Create new conversation
      const title = chatMessages[chatMessages.length - 1]?.content.substring(0, 100) || 'محادثة جديدة';
      conversation = await db.aiConversation.create({
        data: {
          userId: user.id,
          title,
        },
        include: {
          messages: true,
        },
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

    // Call AI with fallback system
    const aiResponse = await chatWithFallback(chatMessages, user.id, 'chat');

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

    // Update conversation timestamp
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
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء المحادثة مع الذكاء الاصطناعي';
    return Response.json({ error: message }, { status: 500 });
  }
}
