# خطة إعادة بناء NutriClinic SaaS
## تقرير مرحلة التحليل والتخطيط (Step 1: Reconnaissance & Planning)

> **تاريخ التقرير:** 9 يوليو 2026
> **المشروع:** `nutrai.matrix49.app` (Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui)
> **الهدف:** تحويل قاعدة الكود من حالة "vibe coding" إلى بنية إنتاجية صالحة للـ SaaS دون تغيير أي وظيفة أو واجهة مستخدم.
> **القاعدة الأساسية:** لا تغيير في الميزات، لا تغيير في التصميم، فقط إعادة بناء هيكلية.

---

## 1. ملخص تنفيذي

تم تحليل المشروع بشكل شامل. المشروع يعمل بشكل جيد ويقدم قيمة حقيقية، لكنه يعاني من **دَين تقني (technical debt)** واضح ينتج من تطوير سريع. الأعراض الرئيسية:

- صفحات ضخمة (mega-components) تجمع بين جلب البيانات، الحالة، المنطق، والتصميم في ملف واحد.
- تكرار الأنواع (Types/Interfaces) في كل صفحة تقريباً.
- استدعاءات `fetch` مباشرة داخل مكونات UI.
- طبقة `lib` تحتوي على ملفات ضخمة تنتهك مبدأ المسؤولية الواحدة (SRP).
- ملفات API Routes تحتوي على منطق الأعمال واستعلامات DB معاً.
- تكوين الجودة (TypeScript + ESLint) معطل جزئياً، مما يخفي الأخطاء بدلاً من إصلاحها.

**الخطة المقترحة:** إعادة الهيكلة تدريجياً حسب المجالات الوظيفية (domain-driven folders)، وفصل واضح بين:
- **UI Components** (عرض فقط)
- **Custom Hooks** (إدارة الحالة والتأثيرات الجانبية)
- **Services / API Actions** (الاتصال بالخادم)
- **Domain Types** (أنواع مشتركة)
- **Server Utilities** (مصادقة، validation، أخطاء)
- **Repository / Business Logic** (لـ API routes)

---

## 2. تحليل البنية الحالية

### 2.1 هيكل الملفات الحالي

```
src/
├── app/                          # كل الصفحات والـ API Routes
│   ├── (auth)/                   # صفحات المصادقة
│   ├── (dashboard)/              # لوحة التحكم (كلها use client)
│   ├── (admin)/                  # لوحة الإدارة (كلها use client)
│   ├── api/                      # 50+ endpoint
│   ├── portal/                   # بوابة المريض
│   └── print/                    # صفحات الطباعة
├── components/                   # مكونات مشتركة (بعضها ضخم جداً)
│   ├── ui/                       # shadcn/ui (لا نمسها)
│   ├── nutrition-plan-editor.tsx
│   ├── exercise-plan-editor.tsx
│   ├── patient-share-dialog.tsx
│   └── ...
├── features/patients/            # بداية جيدة لكن غير مكتملة
│   ├── hooks/use-patient-detail.ts
│   └── services/patient-detail.api.ts
├── hooks/                        # hooks عامة (3 فقط)
├── lib/                          # ملفات ضخمة متعددة المهام
│   ├── db.ts (1,367 سطر)
│   ├── ai-fallback.ts (1,215 سطر)
│   ├── ai-vision.ts (277 سطر)
│   ├── auth.ts
│   ├── auth-store.ts
│   ├── api-auth.ts
│   └── ...
└── middleware.ts
```

### 2.2 الإيجابيات الحالية

- فكرة المنتج متكاملة وواضحة.
- قاعدة البيانات (Prisma Schema) جيدة ومنظمة.
- نظام AI fallback متقدم.
- دعم متعدد البيئات (Vercel + cPanel + Android).
- الواجهة عربية RTL بالكامل.
- وجود بداية تنظيمية في `features/patients` يمكن البناء عليها.

---

## 3. الاختناقات المعمارية (Architectural Bottlenecks)

### 3.1 مكونات صفحة ضخمة (Mega-Components)

| الملف | الأسطر | المشكلة |
|-------|--------|---------|
| `src/app/(dashboard)/patients/[id]/page.tsx` | 1,679 | كل شيء: تفاصيل المريض، الزيارات، التحاليل، خطط التغذية، خطط التمارين، AI summary، مشاركة، طباعة |
| `src/lib/db.ts` | 1,367 | واجهة DB + query builder + metadata + relations + transforms كلها في ملف واحد |
| `src/lib/ai-fallback.ts` | 1,215 | fallback + providers + JSON parsing + plan generation + usage tracking |
| `src/app/(admin)/admin/ai-providers/page.tsx` | 1,198 | CRUD كامل + UI + test + API calls في صفحة واحدة |
| `src/app/(admin)/admin/landing/page.tsx` | 1,157 | CMS كامل: sections، items، upload، settings |
| `src/app/(admin)/admin/users/page.tsx` | 1,014 | إدارة المستخدمين + subscriptions + activation |
| `src/components/nutrition-plan-editor.tsx` | 736 | محرر خطة التغذية كامل |
| `src/app/(dashboard)/patients/new/page.tsx` | 717 | نموذج إنشاء مريض + حساب الماكروز |
| `src/app/page.tsx` | 663 | Landing page كاملة |
| `src/app/portal/[token]/page.tsx` | 843 | بوابة المريض كاملة |

**التأثير:** صعوبة الصيانة، صعوبة اكتشاف الأخطاء، صعوبة إضافة ميزات جديدة، وإعادة الاستخدام منخفضة.

### 3.2 استدعاءات API مباشرة داخل مكونات UI

عُثر على `fetch(...)` مباشرة في:
- `src/app/(admin)/admin/ai-providers/page.tsx` (9 مرات)
- `src/app/(admin)/admin/landing/page.tsx` (10 مرات)
- `src/app/(admin)/admin/users/page.tsx` (6 مرات)
- `src/app/(admin)/admin/cms/page.tsx` (3 مرات)
- `src/app/(admin)/admin/subscriptions/page.tsx` (2 مرة)
- `src/app/(admin)/admin/page.tsx` (2 مرة)
- `src/app/(auth)/*` (كل صفحات المصادقة)
- `src/app/portal/[token]/page.tsx`
- `src/app/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/patients/page.tsx`
- `src/app/(dashboard)/ai-assistant/page.tsx`

**التأثير:** لا يوجد مكان مركزي للتعامل مع الأخطاء، التوثيق، التوكن، أو إعادة المحاولة. أي تغيير في API يتطلب تعديل عدة ملفات.

### 3.3 تكرار الأنواع (Duplicated Types)

تم العثور على `interface Patient` في 4 ملفات على الأقل، و`interface Visit` في ملفين، و`interface NutritionPlan` في 4 ملفات، و`interface ExercisePlan` في 3 ملفات. هذا يعني:
- أي تغيير في schema يتطلب تعديل عدة أماكن.
- احتمالية عالية لتناقض الأنواع.
- صعوبة في صيانة العقود بين API وUI.

### 3.4 ملفات `lib` ضخمة ومتعددة المهام

- `src/lib/db.ts`: يجمع بين connection pooling، query builder، relation resolution، include/select، transformations، id generation. يجب تقسيمه إلى:
  - `db/connection.ts` (pool)
  - `db/query-builder.ts`
  - `db/schema.ts` (metadata)
  - `db/repository.ts` (CRUD facade)
- `src/lib/ai-fallback.ts`: يجمع بين provider selection، fallback logic، quota tracking، JSON parsing، plan generation. يجب تقسيمه إلى:
  - `ai/providers/`
  - `ai/fallback-engine.ts`
  - `ai/plan-generator.ts`
  - `ai/usage-tracker.ts`

### 3.5 API Routes تحتوي على منطق الأعمال مباشرة

مثال: `src/app/api/patients/route.ts` يحتوي على:
- مصادقة
- pagination
- بحث
- validation
- حساب الماكروز
- create DB
- error handling

يجب نقل منطق الأعمال إلى `services/` أو `repositories/`، وترك الـ route كـ "thin controller".

### 3.6 جودة الكود معطلة

- `next.config.ts`: `typescript: { ignoreBuildErrors: true }` — يخفي أخطاء TypeScript بدلاً من إصلاحها.
- `eslint.config.mjs`: تم تعطيل معظم القواعد المهمة (`no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps`, `prefer-const`, `no-console`, ...).
- `tsconfig.json`: `noImplicitAny: false` — يقلل من فوائد TypeScript.

**التأثير:** لا توجد حراس جودة، والأخطاء تتراكم.

### 3.7 أخطاء تصميم أخرى

- استخدام `Response.json` و `NextResponse.json` معاً دون توحيد.
- inline styles في صفحات `print/`.
- `next-auth` مثبت لكن غير مستخدم.
- التوكن مخزن في `localStorage` (Zustand persist) + cookie، مما يسبب عدم اتساق.
- صفحات Landing و Dashboard و Admin كلها `use client`، بينما يمكن أن تكون Server Components في أجزاء كبيرة.
- لا يوجد `error.tsx` أو `loading.tsx` في route groups.

---

## 4. الهيكل المقترح (Proposed Folder Structure)

```
src/
├── app/                              # Next.js App Router (صفحات رفيعة فقط)
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── (admin)/
│   ├── api/                          # Thin Controllers فقط
│   ├── portal/
│   └── print/
├── components/                       # مكونات واجهة مشتركة (عرض فقط)
│   ├── ui/                           # shadcn/ui (لا تُمس)
│   ├── layout/                       # sidebar، header، auth-layout wrapper
│   └── forms/                        # نماذج معاد استخدامها (مثلاً patient-form)
├── features/                         # وحدات حسب المجال الوظيفي
│   ├── auth/
│   │   ├── components/               # login-form, register-form, reset-password-form
│   │   ├── hooks/                    # use-login, use-register, use-logout
│   │   ├── services/                 # auth.api.ts, auth.actions.ts
│   │   └── types/                    # auth.types.ts
│   ├── patients/
│   │   ├── components/               # patient-detail-tabs, visit-list, lab-report-list, macro-editor
│   │   ├── hooks/                    # use-patients-list, use-patient-detail, use-create-patient
│   │   ├── services/                 # patients.api.ts, visits.api.ts, lab-reports.api.ts
│   │   ├── types/                    # patient.types.ts
│   │   └── utils/                    # patient-helpers.ts
│   ├── plans/
│   │   ├── components/               # nutrition-editor, exercise-editor, plan-list
│   │   ├── hooks/                    # use-nutrition-plan, use-exercise-plan
│   │   ├── services/                 # plans.api.ts
│   │   └── types/                    # plan.types.ts
│   ├── ai/
│   │   ├── components/               # chat, conversation-list
│   │   ├── hooks/                    # use-chat, use-conversations
│   │   ├── services/                 # ai.api.ts
│   │   └── types/                    # ai.types.ts
│   ├── admin/
│   │   ├── components/               # users-table, ai-provider-form, cms-editor
│   │   ├── hooks/                    # use-admin-users, use-ai-providers, use-cms
│   │   ├── services/                 # admin.api.ts
│   │   └── types/                    # admin.types.ts
│   └── landing/
│       ├── components/               # hero-section, features-section, testimonials-section, footer-section
│       ├── hooks/                    # use-landing-data
│       ├── services/                 # landing.api.ts
│       └── types/                    # landing.types.ts
├── lib/                              # مكتبات أساسية مشتركة (cross-cutting)
│   ├── db/                           # ← بدلاً من db.ts الضخم
│   │   ├── index.ts                  # export db facade
│   │   ├── connection.ts             # pool
│   │   ├── schema.ts                 # metadata
│   │   ├── query-builder.ts          # where/orderBy/select/include
│   │   └── repository.ts             # CRUD helpers
│   ├── ai/                           # ← بدلاً من ai-fallback.ts الضخم
│   │   ├── index.ts                  # chatWithFallback
│   │   ├── providers/                # openai.ts, gemini.ts, claude.ts, custom.ts
│   │   ├── fallback.ts               # fallback engine
│   │   ├── plan-generator.ts         # nutrition / exercise generation
│   │   └── usage-tracker.ts          # logging + quota
│   ├── auth/                         # auth helpers
│   │   ├── index.ts
│   │   ├── token.ts                  # JWT generate/verify
│   │   └── password.ts               # bcrypt
│   ├── api/                          # API helpers
│   │   ├── auth.ts                   # getAuthUser, unauthorized, forbidden
│   │   ├── errors.ts                 # ApiError + standard responses
│   │   └── validation.ts             # zod helpers for routes
│   ├── utils/                        # cn, formatting, etc.
│   └── macros.ts                     # calculator (صغير ومحدود)
├── types/                            # أنواع المجال المشتركة (Domain Types)
│   ├── index.ts                      # re-exports
│   ├── auth.ts
│   ├── patient.ts
│   ├── plan.ts
│   ├── visit.ts
│   ├── ai.ts
│   ├── admin.ts
│   └── landing.ts
├── hooks/                            # hooks عامة مشتركة
│   ├── use-mobile.ts
│   ├── use-toast.ts
│   └── use-auth-token.ts
└── middleware.ts
```

### 4.1 توجيهات التنظيم

- **صفحات `app/`**: يجب أن تكون رفيعة. إذا كانت `page.tsx` أكثر من 150 سطر، فهي بحاجة للتقسيم.
- **مكونات `features/*/components/`**: مسؤولة عن العرض فقط. لا يوجد `fetch` مباشر.
- **hooks `features/*/hooks/`**: مسؤولة عن الـ state + الـ effects + الاتصال بالـ services.
- **services `features/*/services/`**: المكان الوحيد المسموح به لـ `fetch` في الواجهة.
- **types `src/types/`**: أنواع المجال المشتركة. لا يتم تعريف `interface Patient` في أي صفحة.
- **lib/db/**: تقسيم db.ts إلى وحدات صغيرة.
- **lib/ai/**: تقسيم ai-fallback.ts إلى وحدات صغيرة.
- **API routes**: "thin controllers" تستدعي `services/server/` أو `repositories/`.

---

## 5. أولويات إعادة البناء (Refactoring Priority)

### 5.1 الأولوية P0 (أساسية للبنية)

| # | الملف/النطاق | السبب | الحجم التقريبي |
|---|--------------|-------|----------------|
| 1 | إنشاء `src/types/` ونقل الأنواع المشتركة | إيقاف التكرار وتحسين العقود | ~300-500 سطر جديد/معدل |
| 2 | إنشاء `src/features/auth/` ورفع login/register/logout من `app/(auth)` | عزل منطق المصادقة | ~600-900 سطر |
| 3 | إنشاء `src/features/patients/` (توسيع الموجود) | تبسيط `patients/[id]/page.tsx` و `patients/new/page.tsx` | ~1000-1400 سطر |
| 4 | إنشاء `src/features/plans/` | تبسيط المحررات والصفحات | ~800-1200 سطر |
| 5 | توسيع `src/features/admin/` | تبسيط كل صفحات `/admin` | ~1500-2000 سطر |
| 6 | إنشاء `src/features/landing/` | تبسيط `page.tsx` و `admin/landing` | ~800-1200 سطر |

### 5.2 الأولوية P1 (تحسين الجودة والأمان)

| # | الملف/النطاق | السبب |
|---|--------------|-------|
| 7 | تقسيم `src/lib/db.ts` إلى `src/lib/db/` | SRP، صيانة أسهل، اختبار أسهل |
| 8 | تقسيم `src/lib/ai-fallback.ts` إلى `src/lib/ai/` | SRP، فصل providers عن fallback |
| 9 | توحيد الـ API responses في `src/lib/api/errors.ts` | الاتساق بين routes |
| 10 | إضافة Zod validation helpers في `src/lib/api/validation.ts` | أمان البيانات المدخلة |
| 11 | تفعيل ESLint تدريجياً (بدءاً بـ `no-explicit-any` و `no-unused-vars`) | اكتشاف الأخطاء مبكراً |
| 12 | إزالة `ignoreBuildErrors` بعد إصلاح الأخطاء | بنية سليمة |

### 5.3 الأولوية P2 (تحسينات الأداء والموثوقية)

| # | الملف/النطاق | السبب |
|---|--------------|-------|
| 13 | إضافة `error.tsx` و `loading.tsx` في route groups | تحسين UX عند الأخطاء |
| 14 | تحويل أجزاء من Landing و Dashboard إلى Server Components | أداء أفضل |
| 15 | إضافة caching (`unstable_cache` / `revalidate`) على routes العامة | تقليل ضغط DB |
| 16 | توحيد مصادقة الـ API (cookie vs localStorage) | أمان واتساق |

---

## 6. الأنماط التصميمية التي سيتم تطبيقها (Design Patterns)

### 6.1 Single Responsibility Principle (SRP)

كل ملف يجب أن يكون له سبب واحد للتغيير. مثلاً:
- `page.tsx` → مسؤول عن تجميع المكونات فقط.
- `*.api.ts` → مسؤول عن HTTP.
- `*.hook.ts` → مسؤول عن state.
- `*.types.ts` → مسؤول عن الأنواع.

### 6.2 Feature-Based Organization (Domain-Driven)

كل ميزة (auth, patients, plans, ai, admin, landing) لها مجلد خاص بها تحت `src/features/` يحتوي على: `components/`, `hooks/`, `services/`, `types/`, `utils/`.

### 6.3 Thin Controllers (API Routes)

API Routes ستصبح:

```ts
// src/app/api/patients/route.ts
import { getAuthUser } from '@/lib/api/auth';
import { patientsService } from '@/features/patients/services/patients.server';
import { listPatientsSchema } from '@/features/patients/types/patients.schema';
import { handleApiError, successResponse } from '@/lib/api/errors';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    const query = listPatientsSchema.parse(new URL(request.url).searchParams);
    const result = await patientsService.list({ doctorId: user.id, ...query });
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 6.4 Repository Pattern (Server-side)

خدمات الواجهة الخلفية ستفصل بين:
- `repositories/patient.repository.ts` — DB queries
- `services/patient.service.ts` — business logic + validation

### 6.5 Custom Hooks for Server State

كل صفحة تستخدم hooks مثل:
- `usePatientsList()`
- `usePatientDetail(id)`
- `useAiProviders()`
- `useLandingData()`

### 6.6 DRY (Don't Repeat Yourself)

- أيقونات المأكولات، الترجمات، التسميات، والأنواع يتم نقلها إلى ملفات مشتركة.
- لا يوجد `fetch` متكرر في كل صفحة.

### 6.7 Error Handling Strategy

- `ApiError` في الواجهة.
- `handleApiError` في API Routes.
- Toasts في hooks.

### 6.8 Type Safety

- إلغاء `any` تدريجياً.
- استخدام Zod للـ runtime validation.
- استخدام `strict` TypeScript.

---

## 7. خطة التنفيذ التدريجي (Incremental Execution Plan)

سيتم التنفيذ **ملفاً واحداً أو وحدة واحدة في كل مرة**. بعد كل خطوة، سيتم:
- تحديث جميع الـ imports.
- تشغيل `npm run lint` (بعد تعديل ESLint) أو `npm run build`.
- التأكد من أن التطبيق لا يزال يعمل.
- طلب التأكيد منك قبل الانتقال للخطوة التالية.

### الخطوة 1: الأساسيات المشتركة

- إنشاء `src/types/` ونقل الأنواع: `Patient`, `Visit`, `NutritionPlan`, `ExercisePlan`, `AiProvider`, `LandingSection`, `UserItem`.
- إنشاء `src/lib/api/errors.ts` (standardized `successResponse`, `errorResponse`, `unauthorized`, `forbidden`, `handleApiError`).
- إنشاء `src/lib/api/validation.ts` (Zod helpers).
- تحديث `src/features/patients/services/patient-detail.api.ts` لاستخدام الأنواع المشتركة.

### الخطوة 2: المصادقة (Auth)

- إنشاء `src/features/auth/`.
- نقل منطق `login`, `register`, `logout`, `forgot-password`, `reset-password`, `verify-email`, `activation-pending` إلى hooks و services.
- تبسيط صفحات `app/(auth)/`.
- تحديث `middleware.ts` و `lib/api-auth.ts` لاستخدام helpers مشتركة.

### الخطوة 3: المرضى (Patients)

- توسيع `src/features/patients/`.
- تقسيم `src/app/(dashboard)/patients/[id]/page.tsx` إلى:
  - `PatientDetailTabs`
  - `VisitsSection`
  - `LabReportsSection`
  - `NutritionPlansSection`
  - `ExercisePlansSection`
  - `AiSummarySection`
  - `ShareSection`
- تبسيط `src/app/(dashboard)/patients/new/page.tsx` باستخدام `useCreatePatient` hook.
- تبسيط `src/app/(dashboard)/patients/page.tsx` باستخدام `usePatientsList` hook.

### الخطوة 4: الخطط (Plans)

- إنشاء `src/features/plans/`.
- نقل `NutritionPlanEditor` و `ExercisePlanEditor` إلى `features/plans/components/`.
- تقسيم كل محرر إلى أجزاء أصغر (day tabs, meal item, exercise item, dialogs).
- إنشاء `plans.api.ts` و `usePlan` hooks.

### الخطوة 5: الإدارة (Admin)

- إنشاء `src/features/admin/`.
- تبسيط `admin/users`, `admin/ai-providers`, `admin/landing`, `admin/cms`, `admin/subscriptions`, `admin/security`.
- نقل كل `fetch` إلى `features/admin/services/admin.api.ts`.

### الخطوة 6: الصفحة الرئيسية (Landing)

- إنشاء `src/features/landing/`.
- تقسيم `src/app/page.tsx` إلى `HeroSection`, `FeaturesSection`, `StatsSection`, `PricingSection`, `TestimonialsSection`, `FaqSection`, `FooterSection`.
- إنشاء `useLandingData` hook.

### الخطوة 7: إعادة بناء `lib/db.ts`

- تقسيم إلى `src/lib/db/connection.ts`, `schema.ts`, `query-builder.ts`, `repository.ts`.
- الحفاظ على نفس API surface (exports) لعدم كسر الـ API routes.
- اختبار كل route بعد التقسيم.

### الخطوة 8: إعادة بناء `lib/ai-fallback.ts`

- تقسيم إلى `src/lib/ai/providers/`, `fallback.ts`, `plan-generator.ts`, `usage-tracker.ts`.
- الحفاظ على نفس الـ exports الرئيسية (`chatWithAutoContinue`, `generateNutritionPlan`, etc.).

### الخطوة 9: توحيد API Routes

- تحديث جميع API Routes لاستخدام `handleApiError` و `successResponse`.
- إضافة Zod validation على routes الأساسية (patients, plans, auth).

### الخطوة 10: الجودة والتحسينات النهائية

- إضافة `error.tsx` و `loading.tsx` في route groups.
- إزالة `ignoreBuildErrors` بعد التأكد من خلو البناء من الأخطاء.
- تفعيل قواعد ESLint الأساسية تدريجياً.

---

## 8. القواعد الحرجة (Critical Rules) خلال التنفيذ

1. **Zero Feature Changes**: لا إضافة ميزات، لا تغيير في واجهة المستخدم.
2. **Safe Commits**: التطبيق يجب أن يبقى قابلاً للتشغيل بعد كل خطوة.
3. **One Module at a Time**: خطوة واحدة، ثم توقف للتأكيد.
4. **Import Updates**: تحديث كل الـ imports بعد كل تغيير.
5. **No Type Changes That Break API**: الحفاظ على شكل البيانات المرسلة/المستقبلة.
6. **Keep Public API Surface**: لا حذف لـ exports المستخدمة حتى يتم تحديث المستوردين.

---

## 9. المخاطر والتحديات

| المخاطر | التأثير | التخفيف |
|---------|---------|---------|
| التقسيم قد يكسر imports مؤقتاً | متوسط | تحديث كل imports في نفس الخطوة |
| إعادة بناء db.ts قد تؤثر على كل API routes | عالي | الحفاظ على API surface، والاختبار بعد كل تعديل |
| إعادة بناء ai-fallback.ts قد تؤثر على AI chat والخطط | عالي | اختبار منفصل لكل provider |
| تفعيل ESLint قد يكشف أخطاء كثيرة | متوسط | تفعيل القواعد تدريجياً |
| إزالة ignoreBuildErrors قد يمنع البناء | متوسط | إصلاح الأخطاء قبل الإزالة |

---

## 10. ما الذي سأحتاجه منك للمتابعة

1. **الموافقة على هذه الخطة**: إذا كانت هناك أقسام ترغب في تعديلها أو تخطيها.
2. **تحديد البيئة للاختبار**: هل تريد أن نختبار فقط على `npm run build`، أم تحتاج إلى تشغيل dev server مع بيانات حقيقية؟
3. **أولوية البداية**: هل تريد البدء بالـ P0 (الأنواع + المرضى + المصادقة) أم بملف معين تحدده؟

> **ملاحظة:** لم يتم تعديل أي ملف في هذا التقرير. هذا التقرير هو فقط خطة تحليلية تنتظر موافقتك قبل التنفيذ.
