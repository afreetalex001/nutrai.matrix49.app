// ============================================================
// Notifications API - تجميع إشعارات الطبيب من مصادر متعددة
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

export interface Notification {
  id: string;
  type: 'patient_weight' | 'patient_note' | 'plan_draft' | 'pending_doctor';
  title: string;
  description: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  // metadata
  patientId?: string;
  patientName?: string;
  icon?: string; // emoji
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const notifications: Notification[] = [];

    // ===== للأطباء: تقارير ذاتية من المرضى =====
    if (user.role === 'doctor' || user.role === 'admin') {
      const selfReports = await db.patientSelfReport.findMany({
        where: {
          patient: { doctorId: user.id, isActive: true },
        },
        include: {
          patient: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      for (const r of selfReports) {
        if (r.type === 'weight') {
          notifications.push({
            id: `report-${r.id}`,
            type: 'patient_weight',
            title: `${r.patient.name} سجّل وزنه`,
            description: `الوزن: ${r.weight} كجم${r.bodyFat ? ` · دهون: ${r.bodyFat}%` : ''}${r.note ? ` · ${r.note.substring(0, 60)}` : ''}`,
            link: `/patients/${r.patient.id}`,
            isRead: r.isRead,
            createdAt: r.createdAt.toISOString(),
            patientId: r.patient.id,
            patientName: r.patient.name,
            icon: '⚖️',
          });
        } else if (r.type === 'note') {
          notifications.push({
            id: `report-${r.id}`,
            type: 'patient_note',
            title: `رسالة من ${r.patient.name}`,
            description: r.note ? r.note.substring(0, 120) + (r.note.length > 120 ? '...' : '') : '',
            link: `/patients/${r.patient.id}`,
            isRead: r.isRead,
            createdAt: r.createdAt.toISOString(),
            patientId: r.patient.id,
            patientName: r.patient.name,
            icon: '💬',
          });
        }
      }

      // ===== خطط مسودة (draft) تحتاج مراجعة - آخر 7 أيام =====
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const draftNutrition = await db.nutritionPlan.findMany({
        where: {
          doctorId: user.id,
          status: 'draft',
          isActive: true,
          createdAt: { gte: sevenDaysAgo },
        },
        include: { patient: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      for (const p of draftNutrition) {
        notifications.push({
          id: `np-${p.id}`,
          type: 'plan_draft',
          title: `خطة تغذية بحاجة مراجعة`,
          description: `للمريض ${p.patient.name} - ${Math.round(p.calories)} سعرة/يوم`,
          link: `/patients/${p.patient.id}`,
          isRead: false, // المسودات دائماً تظهر حتى تُعتمد
          createdAt: p.createdAt.toISOString(),
          patientId: p.patient.id,
          patientName: p.patient.name,
          icon: '🍎',
        });
      }

      const draftExercise = await db.exercisePlan.findMany({
        where: {
          doctorId: user.id,
          status: 'draft',
          isActive: true,
          createdAt: { gte: sevenDaysAgo },
        },
        include: { patient: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      for (const p of draftExercise) {
        notifications.push({
          id: `ep-${p.id}`,
          type: 'plan_draft',
          title: `خطة تمارين بحاجة مراجعة`,
          description: `للمريض ${p.patient.name}`,
          link: `/patients/${p.patient.id}`,
          isRead: false,
          createdAt: p.createdAt.toISOString(),
          patientId: p.patient.id,
          patientName: p.patient.name,
          icon: '💪',
        });
      }
    }

    // ===== للمدراء: حسابات أطباء بحاجة تفعيل =====
    if (user.role === 'admin') {
      const pendingDoctors = await db.user.findMany({
        where: { role: 'doctor', isActive: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      for (const d of pendingDoctors) {
        notifications.push({
          id: `pending-${d.id}`,
          type: 'pending_doctor',
          title: `طبيب جديد بحاجة تفعيل`,
          description: `${d.name} - ${d.email}`,
          link: `/admin/users`,
          isRead: false,
          createdAt: d.createdAt.toISOString(),
          icon: '👤',
        });
      }
    }

    // رتب من الأحدث للأقدم
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return Response.json({
      notifications: notifications.slice(0, 50), // حد 50
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return Response.json({ error: 'فشل جلب الإشعارات' }, { status: 500 });
  }
}

// ===== PATCH: تعليم إشعار/الكل كمقروء =====
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';
    const notifId = searchParams.get('id'); // مثل: "report-cmqxxxx"

    if (all) {
      // علّم كل تقارير المرضى لهذا الطبيب كمقروءة
      await db.patientSelfReport.updateMany({
        where: {
          patient: { doctorId: user.id, isActive: true },
          isRead: false,
        },
        data: { isRead: true, readAt: new Date() },
      });
      return Response.json({ message: 'تم تعليم الكل كمقروء' });
    }

    if (!notifId) return Response.json({ error: 'id مطلوب' }, { status: 400 });

    // التعرف على نوع الإشعار من الـ prefix
    if (notifId.startsWith('report-')) {
      const reportId = notifId.substring(7);
      const report = await db.patientSelfReport.findUnique({
        where: { id: reportId },
        include: { patient: { select: { doctorId: true } } },
      });
      if (!report) return Response.json({ error: 'غير موجود' }, { status: 404 });
      if (report.patient.doctorId !== user.id && user.role !== 'admin') {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
      await db.patientSelfReport.update({
        where: { id: reportId },
        data: { isRead: true, readAt: new Date() },
      });
      return Response.json({ message: 'تم' });
    }

    // الخطط المسودة لا تُعلّم كمقروءة (تختفي عند اعتمادها)
    return Response.json({ message: 'لا يحتاج إجراء' });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return Response.json({ error: 'فشل التحديث' }, { status: 500 });
  }
}
