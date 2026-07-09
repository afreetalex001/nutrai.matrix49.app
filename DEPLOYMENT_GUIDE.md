:# دليل النشر على cPanel - NutriClinic

> يشرح هذا الدليل خطوات نشر آخر تحديثات المشروع على استضافة cPanel.

---

## المتطلبات

- بيانات الدخول إلى cPanel (متوفرة لديك)
- التطبيق `nutrai.matrix49.app` موجود مسبقاً في cPanel Node.js App
- المسار: `/home/matrmylq/nutrai.matrix49.app`

---

## الخطوة 1: تسجيل الدخول إلى cPanel

افتح الرابط:

```
https://premium77.web-hosting.com:2083/
```

استخدم:
- **Username:** `matrmylq`
- **Password:** `gpqRI5P3YJZo`

---

## الخطوة 2: تحديث المشروع من GitHub

### الطريقة أ: Git Version Control (إذا كان المستودع مربوطاً)

1. في cPanel، ابحث عن **Git Version Control**.
2. اختر مستودع `nutrai.matrix49.app`.
3. اضغط **Manage** ثم **Pull** أو **Update from Remote**.
4. انتظر حتى يكتمل سحب آخر commit.

### الطريقة ب: Terminal

1. في cPanel، افتح **Terminal**.
2. نفّذ الأوامر التالية:

```bash
cd /home/matrmylq/nutrai.matrix49.app
git pull origin main
```

---

## الخطوة 3: تثبيت المكتبات وبناء المشروع

1. في cPanel Terminal، نفّذ:

```bash
cd /home/matrmylq/nutrai.matrix49.app
npm install --legacy-peer-deps
npm run build
```

2. تأكد من أن البناء انتهى بدون أخطاء خطيرة (قد يكون هناك تحذيرات TypeScript ولكنها تُتجاهل بسبب `ignoreBuildErrors: true`).

---

## الخطوة 4: التأكد من متغيرات البيئة

تأكد من أن متغيرات البيئة مضبوطة في cPanel Node.js App:

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXTAUTH_SECRET` (إذا كان مستخدماً)
- `EMAIL_USER` / `EMAIL_PASS` (إذا كان مستخدماً)
- `TURNSTILE_SECRET_KEY` (إذا كان مستخدماً)

يمكنك التحقق من `src/.env.example` للقائمة الكاملة.

---

## الخطوة 5: إعادة تشغيل Node.js App

1. في cPanel، افتح **Setup Node.js App** (أو **Application Manager**).
2. اختر التطبيق `nutrai.matrix49.app`.
3. اضغط **Restart** أو **Stop** ثم **Start**.
4. انتظر بضع ثوانٍ حتى يبدأ التطبيق.

---

## الخطوة 6: الاختبار

افتح الموقع في المتصفح:

```
https://nutrai.matrix49.app
```

تأكد من:
- ✅ تحميل الصفحة الرئيسية
- ✅ عمل صفحة تسجيل الدخول: `/login`
- ✅ عمل صفحة التسجيل: `/register`
- ✅ عمل لوحة التحكم بعد الدخول: `/dashboard`
- ✅ عمل صفحة المرضى: `/patients`

---

## استكشاف الأخطاء

### المشكلة: التطبيق لا يبدأ

1. افتح **Node.js App Logs** في cPanel.
2. ابحث عن رسائل مثل:
   - `DATABASE_URL missing`
   - `JWT_SECRET missing`
   - `standalone build not found`
3. أضف المتغيرات المفقودة أو شغّل `npm run build` مرة أخرى.

### المشكلة: التغييرات غير ظاهرة

1. تأكد من أن `git pull` سحب آخر commit.
2. تأكد من تشغيل `npm run build`.
3. أعد تشغيل Node.js App.
4. امسح ذاكرة التخزين المؤقت للمتصفح (Ctrl+Shift+R).

### المشكلة: أخطاء TypeScript

إذا أردت إصلاح الأخطاء قبل الإزالة التدريجية لـ `ignoreBuildErrors`:

```bash
cd /home/matrmylq/nutrai.matrix49.app
npx tsc --noEmit
```

---

## ملاحظة أمنية

بعد إكمال النشر، يُنصح بتدوير GitHub Token المستخدم من إعدادات GitHub > Developer settings > Personal access tokens.
