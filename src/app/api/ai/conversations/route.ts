// ============================================================
// AI Conversations API - إدارة محادثات الذكاء الاصطناعي
// GET: قائمة المحادثات للمستخدم الحالي
// POST: إنشاء محادثة جديدة
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const conversations = await db.aiConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return Response.json({ conversations });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return Response.json(
      { error: 'حدث خطأ أثناء جلب قائمة المحادثات' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const body = await request.json();
    const { title } = body;

    const conversation = await db.aiConversation.create({
      data: {
        userId: user.id,
        title: title || 'محادثة جديدة',
      },
    });

    return Response.json(
      {
        message: 'تم إنشاء المحادثة بنجاح',
        conversation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating conversation:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء المحادثة';
    return Response.json({ error: message }, { status: 500 });
  }
}
