# تقرير مقارنة طلبات المستخدم مع حالة المشروع الحالية + اقتراحات الحلول

| # | الطلب | الحالة الحالية | المشكلة | الحل المقترح | الأولوية | الملفات المتأثرة |
|---|-------|---------------|---------|-------------|----------|-----------------|
| 1 | **حساب العمر تلقائياً من تاريخ الميلاد** | `dateOfBirth` و `age` حقلان منفصلان وغير مرتبطين. في `new/page.tsx` العمر يُدخل يدوياً. | الطبيب يكتب العمر يدوي. | (أ) تعليق حقل العمر (read-only) ويحسب تلقائياً من `dateOfBirth` عند الحفظ في الـ API. (ب) يضاف `useEffect` يحسب العمر client-side لما يتغير تاريخ الميلاد. | **P0** | `patients/new/page.tsx` `api/patients/route.ts` |
| 2 | **إضافة تعديل بيانات المريض** | صفحة `patients/[id]/page.tsx` تعرض فقط (display). لا يوجد زر "تعديل" أو نموذج تعديل. | لا يمكن تعديل بيانات المريض بعد الإنشاء. | إضافة Tab "تعديل البيانات" في صفحة تفاصيل المريض، أو زر "تعديل" يفتح Dialog. نحتاج API `PUT /api/patients/[id]` + form مبني على `new/page.tsx` مع بيانات محملة. | **P0** | `patients/[id]/page.tsx` + API جديد |
| 3 | **رفع لوجو من الكمبيوتر (upload)** | في `admin/landing/page.tsx` إعدادات الموقع → "رابط الشعار" (URL text input فقط). لا يوجد file upload. | المستخدم يحتاج يرفع صورة من جهازه. | إضافة file upload API (`/api/upload/logo`) يستخدم Vercel Blob أو يحول Base64 ويحفظ في `public/` (أو يستخدم Cloudinary). ثم يُرجع URL للحفظ في `SystemSettings`. | **P1** | `admin/landing/page.tsx` + API upload |
| 4 | **مربع نصي لملاحظات الطبيب قبل توليد خطة AI** | زر "إنشاء بالذكاء" في `patients/[id]/page.tsx` يُرسل `useAi: true` مباشرة للـ API بدون أي notes إضافية. | الـ AI يولد الخطة بناءً على بيانات المريض فقط، دون ملاحظات الطبيب (مثل "بدون حليب" أو "نباتي"). | إضافة Dialog قبل الـ AI: textarea يطلب "ملاحظات إضافية للمساعد الذكي". يُرسل مع الـ request كـ `doctorNotes`. الـ API يُمررها للـ AI prompt. | **P0** | `patients/[id]/page.tsx` `api/plans/nutrition/route.ts` `api/plans/exercise/route.ts` `lib/ai-fallback.ts` |
| 5 | **إحصائيات Dashboard حقيقية خاصة بالطبيب** | في `dashboard/page.tsx` الإحصائيات هي `Math.random()` أو mock data ثابت. | الأرقام وهمية ولا تعكس بيانات الطبيب الحقيقية. | إنشاء API `/api/dashboard/stats` يرجع: `totalPatients`, `activePlans`, `thisWeekVisits`, `aiConversations` من قاعدة البيانات (filter by `doctorId`). استبدال `chartData` بـ بيانات حقيقية من الزيارات. | **P0** | `dashboard/page.tsx` + API جديد |
| 6 | **تسجيل طبيب: تحديد أيام الاشتراك + خطة + مبلغ في Admin** | في `register` الطبيب يسجل → `isActive=false`. لا يُنشأ له `Subscription` تلقائياً. Admin يفعّله فقط. | لا يوجد workflow للاشتراك عند التسجيل. لا يظهر مبلغ في Admin. | إضافة: (أ) في `register` (أو بعد التفعيل) يُنشأ `Subscription` مع `planId` + `startDate` + `endDate`. (ب) في `admin/subscriptions` page يُعرض المبلغ المدفوع (السعر × duration). (ج) في `admin/users` يُعرض خطة كل طبيب وتاريخ الانتهاء. | **P1** | `api/auth/register/route.ts` `api/admin/users/[id]/activate/route.ts` `admin/subscriptions/page.tsx` `admin/users/page.tsx` |
| 7 | **خطة مجانية: تتغير مدتها مع إعدادات التجربة** | `freeTrialEnabled` و `freeTrialDays` موجودان في `SystemSettings` بس لكن لا يُستخدمان في logic الـ subscription. | لا يوجد خطة "مجانية" فعلية. لا يتم ربط مدة التجربة بـ subscription. | (أ) إنشاء `SubscriptionPlan` اسمها "free" (أو استخدام `freeTrialDays` من settings). (ب) عند التسجيل: يُنشأ subscription تلقائياً بالـ plan "free" ومدة `freeTrialDays`. (ج) تعديل `admin/landing` لإظهار خطة مجانية مع `freeTrialDays`. | **P1** | `api/auth/register/route.ts` `prisma/schema.prisma` (add free plan) `admin/landing/page.tsx` |
| 8 | **اعتماد الماكروز بعد حسابها: تعديل أو اعتماد** | في `new/page.tsx` الماكروز تُحسب وتُعرض في sidebar، لكن عند "حفظ المريض" تُحفظ مباشرة بدون تأكيد. | الطبيب لا يستطيع تعديل الماكروز قبل الحفظ. | إضافة Dialog أو Card في sidebar: "تعديل الماكروز" مع inputs editable لـ calories, protein, carbs, fats. زر "اعتماد الماكروز الحالية" (تؤكد) أو "تعديل" (تفتح inputs). تُرسل مع body في `POST /api/patients`. | **P0** | `patients/new/page.tsx` `api/patients/route.ts` |
| 9 | **قسم إعدادات الطبيب** | غير واضح. هل يقصد نفس صفحة `settings/page.tsx` الحالية؟ | — | **محتاج توضيح**: هل يقصد: (أ) إضافة تبويبات جديدة في `settings` (مثل: مظهر العيادة، قالب التقرير، التوقيع)؟ (ب) صفحة جديدة منفصلة؟ | **—** | `settings/page.tsx` |
| 10 | **scroll في الشات الذكي** | في `ai-assistant/page.tsx` يوجد `ScrollArea` في `messages` و `conversations`. | ربما المشكلة في mobile (keyboard يغطي الـ chat) أو الـ `scrollIntoView` لا يعمل بشكل صحيح في بعض الحالات. | فحص: `messagesEndRef` و `scrollIntoView({ behavior: 'smooth' })` — أضف `overflow-anchor: auto` و `scroll-behavior: smooth` في CSS. في mobile: استخدم `dvh` أو `height: 100%` مع `flex-col`. إضافة `overscroll-behavior-y: contain` للـ chat area. | **P1** | `ai-assistant/page.tsx` `globals.css` |
| 11 | **ألوان لوحة تحكم Admin غير مريحة** | `admin/page.tsx` و `admin/layout.tsx` يستخدمون ألوان emerald/teal بشكل مكثف. | ذوق شخصي — الألوان الداكنة أو متشابهة. | **اقتراح**: تبديل خلفية الـ Admin sidebar لـ `slate` أو `zinc` بدلاً من `emerald`، أو تقليل saturation. استخدام `shadcn` theme مع `--sidebar` و `--sidebar-primary` ألوان محايدة. | **P2** | `admin/layout.tsx` (أو إنشائه) `admin/page.tsx` |
| 12 | **تغيير ألوان أزرار CTA في Landing Page** | في `page.tsx` (CTA section): زر "ابدأ مجاناً" أخضر (gradient). زر "دخول الطبيب" و "دخول المريض" outline مع border أبيض/شفاف. | الأزرار تبدو غير متسقة. | تغيير variant أزرار "دخول الطبيب" و "دخول المريض" إلى نفس الـ gradient `bg-white text-emerald-700` (مثل زر "ابدأ مجاناً") أو تغيير زر "ابدأ" لـ outline. | **P2** | `page.tsx` (CTA section) |

---

## 🎯 خطة التنفيذ المقترحة (P0 → P1 → P2)

### المرحلة 1: P0 (أسبوع 1)
1. **حساب العمر التلقائي** — تعديل form + API
2. **تعديل بيانات المريض** — إنشاء `PUT /api/patients/[id]` + Dialog edit
3. **مربع ملاحظات قبل AI** — Dialog + تمرير notes للـ API
4. **اعتماد الماكروز** — Edit sidebar + تعديل POST body
5. **Dashboard حقيقي** — API stats + charts حقيقية

### المرحلة 2: P1 (أسبوع 2)
6. **رفع لوجو** — API upload + preview
7. **Subscription workflow** — Free plan + تفعيل + مبالغ
8. **Scroll chat** — CSS fixes + mobile testing

### المرحلة 3: P2 (أسبوع 3)
9. **Admin colors** — Theme adjustment
10. **Landing CTA buttons** — Color consistency

---

## 📁 التفاصيل التقنية لكل طلب

### 1. حساب العمر التلقائي
```typescript
// في patients/new/page.tsx
useEffect(() => {
  if (formData.dateOfBirth) {
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    setFormData(prev => ({ ...prev, age: String(age) }));
  }
}, [formData.dateOfBirth]);
```
في الـ API: `age` يُحسب من `dateOfBirth` إذا لم يُرسل.

### 2. تعديل بيانات المريض
- API: `PUT /api/patients/[id]/route.ts` (new file)
- UI: Tab جديد "تعديل البيانات" في `patients/[id]/page.tsx` (أو زر يفتح Dialog)
- Form: نفس fields في `new/page.tsx` لكن مع `defaultValues` من `patient`.

### 3. رفع لوجو
- API: `POST /api/upload/route.ts` — يستخدم ` formidable` أو `busboy` لرفع الملفات.
- Vercel: استخدم `vercel/blob` (أو Cloudinary) لرفع ملفات.
- UI: تبديل `Input` في `admin/landing` لـ `input type="file"` + preview.

### 4. ملاحظات قبل AI
- Dialog في `patients/[id]/page.tsx` قبل `handleCreateAiNutritionPlan`:
```typescript
const [doctorNotes, setDoctorNotes] = useState('');
// Dialog: Textarea "ملاحظات للمساعد الذكي (مثال: نباتي، بدون حليب، كمية بروتين عالية...)"
```
- Body: `{ patientId, useAi: true, doctorNotes }`
- في `api/plans/nutrition/route.ts` أو `lib/ai-fallback.ts`: أضف `doctorNotes` في الـ system prompt.

### 5. Dashboard حقيقي
- API: `GET /api/dashboard/stats`:
```prisma
// totalPatients
prisma.patient.count({ where: { doctorId: user.id } })
// activePlans
prisma.nutritionPlan.count({ where: { patient: { doctorId: user.id }, isActive: true } })
// thisWeekVisits
prisma.visit.count({ where: { patient: { doctorId: user.id }, visitDate: { gte: startOfWeek } } })
// aiConversations
prisma.aiConversation.count({ where: { userId: user.id } })
```
- Charts: استخدم `recharts` مع بيانات حقيقية من `visits` grouped by day.

### 6. تسجيل طبيب + subscription
- في `api/auth/register/route.ts`:
```typescript
// بعد إنشاء user:
await db.subscription.create({
  data: {
    userId: user.id,
    planId: freePlan.id, // أو planId من body
    status: 'active',
    startDate: new Date(),
    endDate: addDays(new Date(), freeTrialDays),
  }
});
```
- في `admin/users/page.tsx`: أضف عمود "الخطة" و"تاريخ الانتهاء" و"المبلغ".

### 7. خطة مجانية
- Seed plan "free" في `seed/route.ts`:
```typescript
{ name: 'free', nameAr: 'مجاني', price: 0, durationDays: 14, ... }
```
- أو استخدم `freeTrialDays` من `SystemSettings` كـ dynamic duration.

### 8. اعتماد الماكروز
- في `patients/new/page.tsx` sidebar:
```typescript
// Macro preview card:
// إذا macroPreview موجود:
//   أعرض الأرقام + زر "تعديل" → يفتح inputs
//   + زر "اعتماد" → يحفظ القيم في formData (أو يرسلها مباشرة)
```
- تعديل `POST /api/patients` ليقبل `customMacros: { calories, protein, carbs, fats }` ويستخدمها بدلاً من الحساب التلقائي.

### 9. قسم إعدادات الطبيب
- **محتاج توضيح**: هل يقصد تبويبات جديدة في `settings/page.tsx`؟ مثل:
  - "مظهر العيادة" (ألوان، شعار)
  - "قوالب التقارير"
  - "التوقيع الرقمي"
  - "إشعارات البريد/واتساب"

### 10. Scroll في الشات
- CSS:
```css
.chat-messages {
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scroll-behavior: smooth;
}
```
- Mobile fix: `height: calc(100dvh - headerHeight - inputHeight)`.
- بعد كل رسالة: `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })`.

### 11. ألوان Admin
- تغيير `bg-emerald-600` في sidebar إلى `bg-slate-800` أو `bg-zinc-900`.
- تقليل saturation في الـ cards: `bg-emerald-50` → `bg-slate-50`.
- استخدام `text-slate-700` بدلاً من `text-emerald-700` في النصوص.

### 12. Landing CTA buttons
- في `page.tsx` (CTA section):
```tsx
<Button className="bg-white text-emerald-700 hover:bg-emerald-50">... all three buttons same class</Button>
```
- أو: "ابدأ مجاناً" gradient، والباقي `bg-white/10 backdrop-blur text-white`.

---

## ⚠️ ملاحظات عامة على الطلبات

- **أغلب الطلبات هي UX improvements** مش bugs فنية. المشروع يعمل لكنه يحتاج "تلميع".
- **الطلبات 1, 2, 4, 5, 8** هي الأكثر تأثيراً على workflow الطبيب اليومي.
- **الطلب 3 (upload)** يحتاج storage solution (Vercel Blob / Cloudinary / AWS S3). لا يمكن فعله بـ Neon DB فقط.
- **الطلب 6 و 7** يحتاجان تعديل في `prisma/schema` و `seed` لإضافة "free plan".
- **الطلب 9** غير واضح — يحتاج توضيح من المستخدم.
