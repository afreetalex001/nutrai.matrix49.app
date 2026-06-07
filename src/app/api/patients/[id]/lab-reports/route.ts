// ============================================================
// Lab Reports API - رفع وتحليل التحاليل المخبرية بالـ AI
// GET: قائمة التحاليل المخزنة للمريض
// POST: رفع تحليل جديد (multipart/form-data) وتحليله تلقائياً
// DELETE: حذف تحليل (?index=N)
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { analyzeLabReport, buildPatientContext } from '@/lib/ai-vision';

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB (Gemini inline limit ~20MB, نضع حد آمن)
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

interface LabReport {
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  summary: string;
  extractedText: string;
  keyFindings: string[];
  recommendations: string[];
  // ملاحظة: لا نخزن الملف نفسه — فقط تحليله
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    const { id } = await params;

    const patient = await db.patient.findFirst({
      where: { id, isActive: true },
      select: { id: true, doctorId: true, labReports: true },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    let reports: LabReport[] = [];
    if (patient.labReports) {
      try { reports = JSON.parse(patient.labReports); } catch { reports = []; }
    }
    return Response.json({ reports });
  } catch (error) {
    console.error('Error fetching lab reports:', error);
    return Response.json({ error: 'حدث خطأ أثناء جلب التحاليل' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    const { id } = await params;

    const patient = await db.patient.findFirst({
      where: { id, isActive: true },
      include: { visits: { orderBy: { visitDate: 'desc' }, take: 5 } },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return Response.json({ error: 'لم يتم رفع ملف' }, { status: 400 });

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: `حجم الملف يتجاوز 8 ميجابايت` }, { status: 400 });
    }
    if (!ALLOWED_MIMES.includes(file.type)) {
      return Response.json({ error: `نوع الملف غير مدعوم. الأنواع المسموحة: صور JPG/PNG/WEBP/HEIC أو PDF` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type === 'image/heic' ? 'image/jpeg' : file.type;

    const patientContext = buildPatientContext(patient);
    const analysis = await analyzeLabReport(base64, mimeType, patientContext);

    const newReport: LabReport = {
      fileName: file.name,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      summary: analysis.summary,
      extractedText: analysis.extractedText,
      keyFindings: analysis.keyFindings,
      recommendations: analysis.recommendations,
    };

    let existing: LabReport[] = [];
    if (patient.labReports) {
      try { existing = JSON.parse(patient.labReports); } catch { existing = []; }
    }
    existing.unshift(newReport);
    // limit to 20 reports to keep DB row size sane
    existing = existing.slice(0, 20);

    await db.patient.update({
      where: { id: patient.id },
      data: {
        labReports: JSON.stringify(existing),
        // مسح الملخص القديم ليُعاد توليده مع البيانات الجديدة
        aiSummary: null,
        aiSummaryAt: null,
      },
    });

    return Response.json({
      message: 'تم تحليل التحليل المخبري بنجاح',
      report: newReport,
      tokensUsed: analysis.tokensUsed,
    });
  } catch (error) {
    console.error('Error analyzing lab report:', error);
    const msg = error instanceof Error ? error.message : 'فشل تحليل الملف';
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const indexParam = searchParams.get('index');
    if (indexParam === null) {
      return Response.json({ error: 'يجب تحديد index' }, { status: 400 });
    }
    const index = parseInt(indexParam);

    const patient = await db.patient.findFirst({
      where: { id, isActive: true },
      select: { id: true, doctorId: true, labReports: true },
    });
    if (!patient) return Response.json({ error: 'المريض غير موجود' }, { status: 404 });
    if (patient.doctorId !== user.id && user.role !== 'admin') return forbidden();

    let reports: LabReport[] = [];
    if (patient.labReports) {
      try { reports = JSON.parse(patient.labReports); } catch { reports = []; }
    }
    if (index < 0 || index >= reports.length) {
      return Response.json({ error: 'index غير صالح' }, { status: 400 });
    }
    reports.splice(index, 1);

    await db.patient.update({
      where: { id: patient.id },
      data: {
        labReports: reports.length > 0 ? JSON.stringify(reports) : null,
        aiSummary: null,
        aiSummaryAt: null,
      },
    });

    return Response.json({ message: 'تم حذف التحليل', reports });
  } catch (error) {
    console.error('Error deleting lab report:', error);
    return Response.json({ error: 'فشل حذف التحليل' }, { status: 500 });
  }
}
