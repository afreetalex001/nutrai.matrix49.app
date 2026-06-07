// ============================================================
// AI Vision - تحليل الصور والملفات (تحاليل، تقارير طبية) بـ Gemini Vision
// ============================================================

import { db } from '@/lib/db';

/**
 * تطبيع اسم نموذج Gemini (نسخة مستقلة)
 */
function normalizeGeminiModel(model: string): string {
  if (!model || typeof model !== 'string') return 'gemini-2.5-flash';
  const m = model.trim().toLowerCase();
  if (/gemini[-_]?\d+(\.\d+)?/.test(m)) {
    return m.replace(/_/g, '-').replace(/^models\//, '');
  }
  const aliases: Record<string, string> = {
    'gemini': 'gemini-2.5-flash',
    'flash': 'gemini-2.5-flash',
    'pro': 'gemini-2.5-pro',
    'gemini-flash': 'gemini-2.5-flash',
    'gemini-pro': 'gemini-2.5-pro',
    'flash-lite': 'gemini-2.5-flash-lite',
  };
  return aliases[m] || 'gemini-2.5-flash';
}

/**
 * الحصول على أول مفتاح Gemini نشط
 */
async function getActiveGeminiKey(): Promise<{ apiKey: string; model: string } | null> {
  const gemini = await db.aiProvider.findFirst({
    where: { name: 'gemini', isActive: true },
    include: { apiKeys: { where: { isActive: true }, orderBy: { createdAt: 'asc' } } },
  });
  if (!gemini || gemini.apiKeys.length === 0) return null;
  return {
    apiKey: gemini.apiKeys[0].apiKey,
    model: normalizeGeminiModel(gemini.apiKeys[0].model),
  };
}

export interface LabAnalysisResult {
  summary: string;
  extractedText: string;
  keyFindings: string[];
  recommendations: string[];
  tokensUsed: number;
}

/**
 * تحليل تحليل مخبري / تقرير طبي / صورة InBody من ملف
 * يقبل: image/jpeg, image/png, image/webp, application/pdf
 */
export async function analyzeLabReport(
  fileBase64: string,
  mimeType: string,
  patientContext?: string
): Promise<LabAnalysisResult> {
  const keyInfo = await getActiveGeminiKey();
  if (!keyInfo) {
    throw new Error('لا يوجد مفتاح Gemini نشط. أضف مفتاحاً من إعدادات المساعد الذكي.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${keyInfo.model}:generateContent?key=${keyInfo.apiKey}`;

  const systemPrompt = `أنت طبيب تغذية وأخصائي تحاليل خبير. قم بتحليل التقرير الطبي/التحليل المخبري المرفق بدقة وأرجع رداً JSON صالحاً فقط (بدون markdown أو شرح إضافي) بالشكل التالي:

{
  "summary": "ملخص موجز للتحليل (3-5 جمل بالعربية)",
  "extractedText": "النص الكامل المستخرج من الصورة/المستند بالعربية أو الإنجليزية كما هو",
  "keyFindings": ["نتيجة مهمة 1", "نتيجة مهمة 2", ...],
  "recommendations": ["توصية تغذوية أو طبية 1", "توصية 2", ...]
}

${patientContext ? `\nسياق المريض:\n${patientContext}\n` : ''}

اقرأ كل القيم بدقة، وإذا كانت قيمة خارج النطاق الطبيعي اذكرها في keyFindings مع توضيح. ركّز على ما يتعلق بالتغذية (سكر، كوليسترول، فيتامين د، B12، حديد، GFR، كبد، إلخ).`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: fileBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`فشل تحليل التحليل المخبري: HTTP ${response.status} - ${errorBody.substring(0, 300)}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const tokensUsed = data.usageMetadata?.totalTokenCount || 0;

  let parsed: Partial<LabAnalysisResult>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Fallback: treat as plain text
    parsed = {
      summary: rawText.substring(0, 500),
      extractedText: rawText,
      keyFindings: [],
      recommendations: [],
    };
  }

  return {
    summary: parsed.summary || 'لم يتمكن النظام من تحليل المحتوى',
    extractedText: parsed.extractedText || '',
    keyFindings: parsed.keyFindings || [],
    recommendations: parsed.recommendations || [],
    tokensUsed,
  };
}

/**
 * توليد ملخص ذكي شامل عن المريض من بياناته وتحاليله وزياراته
 */
export async function generatePatientSummary(patientId: string): Promise<string> {
  const keyInfo = await getActiveGeminiKey();
  if (!keyInfo) {
    throw new Error('لا يوجد مفتاح Gemini نشط.');
  }

  const patient = await db.patient.findUnique({
    where: { id: patientId },
    include: {
      visits: { orderBy: { visitDate: 'desc' }, take: 5 },
      nutritionPlans: { where: { isActive: true }, take: 2, orderBy: { createdAt: 'desc' } },
      exercisePlans: { where: { isActive: true }, take: 2, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!patient) throw new Error('المريض غير موجود');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${keyInfo.model}:generateContent?key=${keyInfo.apiKey}`;

  const context = buildPatientContext(patient);
  const prompt = `أنشئ ملخصاً ذكياً ومختصراً (5-8 جمل بالعربية) عن حالة هذا المريض، يساعد الطبيب على فهم الوضع بسرعة عند فتح الملف. اذكر: الحالة العامة، التقدم في الوزن إن وجد، أبرز ملاحظات التحاليل، التوصيات الفورية إن وُجدت.\n\n${context}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`فشل توليد الملخص: ${errorBody.substring(0, 200)}`);
  }
  const data = await response.json();
  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتمكن النظام من توليد ملخص';

  // Cache it
  await db.patient.update({
    where: { id: patientId },
    data: { aiSummary: summary, aiSummaryAt: new Date() },
  });

  return summary;
}

/**
 * بناء نص سياق المريض - يُستخدم في chat و summary
 */
type PatientWithRelations = {
  name: string;
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  goal: string | null;
  activityLevel: string | null;
  medicalNotes: string | null;
  inBodyData: string | null;
  labReports: string | null;
  caloriesTarget: number | null;
  proteinTarget: number | null;
  carbsTarget: number | null;
  fatsTarget: number | null;
  visits?: { weight: number | null; bmi: number | null; bodyFat: number | null; muscleMass: number | null; notes: string | null; visitDate: Date }[];
  nutritionPlans?: { name: string; calories: number; protein: number; carbs: number; fats: number; createdAt: Date }[];
  exercisePlans?: { name: string; description: string | null; createdAt: Date }[];
};

export function buildPatientContext(patient: PatientWithRelations): string {
  const lines: string[] = [];
  lines.push(`=== بيانات المريض ===`);
  lines.push(`الاسم: ${patient.name}`);
  if (patient.age) lines.push(`العمر: ${patient.age} سنة`);
  if (patient.gender) lines.push(`الجنس: ${patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : patient.gender}`);
  if (patient.height) lines.push(`الطول: ${patient.height} سم`);
  if (patient.weight) lines.push(`الوزن: ${patient.weight} كجم`);
  if (patient.height && patient.weight) {
    const bmi = patient.weight / Math.pow(patient.height / 100, 2);
    lines.push(`مؤشر كتلة الجسم BMI: ${bmi.toFixed(1)}`);
  }
  if (patient.goal) lines.push(`الهدف: ${patient.goal}`);
  if (patient.activityLevel) lines.push(`مستوى النشاط: ${patient.activityLevel}`);
  if (patient.medicalNotes) lines.push(`ملاحظات طبية: ${patient.medicalNotes}`);

  if (patient.caloriesTarget) {
    lines.push(`\n=== الأهداف الغذائية ===`);
    lines.push(`السعرات: ${patient.caloriesTarget} | البروتين: ${patient.proteinTarget}غ | الكربوهيدرات: ${patient.carbsTarget}غ | الدهون: ${patient.fatsTarget}غ`);
  }

  if (patient.inBodyData) {
    lines.push(`\n=== بيانات InBody ===`);
    lines.push(patient.inBodyData);
  }

  if (patient.visits && patient.visits.length > 0) {
    lines.push(`\n=== آخر ${patient.visits.length} زيارات ===`);
    for (const v of patient.visits) {
      const parts: string[] = [`بتاريخ ${new Date(v.visitDate).toLocaleDateString('ar-EG')}`];
      if (v.weight) parts.push(`وزن: ${v.weight}كجم`);
      if (v.bmi) parts.push(`BMI: ${v.bmi}`);
      if (v.bodyFat) parts.push(`دهون: ${v.bodyFat}%`);
      if (v.muscleMass) parts.push(`عضلات: ${v.muscleMass}كجم`);
      if (v.notes) parts.push(`(${v.notes})`);
      lines.push(`- ${parts.join(' | ')}`);
    }
  }

  if (patient.labReports) {
    try {
      const reports = JSON.parse(patient.labReports) as Array<{ fileName: string; uploadedAt: string; summary: string; keyFindings?: string[] }>;
      if (reports.length > 0) {
        lines.push(`\n=== التحاليل المخبرية (${reports.length}) ===`);
        for (const r of reports) {
          lines.push(`- ${r.fileName} (${new Date(r.uploadedAt).toLocaleDateString('ar-EG')}): ${r.summary}`);
          if (r.keyFindings && r.keyFindings.length > 0) {
            lines.push(`  نتائج: ${r.keyFindings.join('، ')}`);
          }
        }
      }
    } catch { /* ignore */ }
  }

  if (patient.nutritionPlans && patient.nutritionPlans.length > 0) {
    lines.push(`\n=== خطط التغذية النشطة ===`);
    for (const p of patient.nutritionPlans) {
      lines.push(`- ${p.name}: ${p.calories} سعرة، ${p.protein}غ بروتين`);
    }
  }

  if (patient.exercisePlans && patient.exercisePlans.length > 0) {
    lines.push(`\n=== خطط التمارين النشطة ===`);
    for (const p of patient.exercisePlans) {
      lines.push(`- ${p.name}`);
    }
  }

  return lines.join('\n');
}
