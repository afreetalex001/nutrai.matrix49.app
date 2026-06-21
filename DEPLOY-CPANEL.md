# دليل نشر NutriClinic SaaS على cPanel + MySQL + phpMyAdmin

هذا الدليل يشرح خطوة بخطوة كيفية نشر المشروع على استضافة cPanel مشتركة باستخدام Node.js App و MySQL (مع إدارة phpMyAdmin).

## ✅ المتطلبات

- استضافة cPanel تدعم **Node.js 18.18+** (Namecheap, HostGator, Bluehost, إلخ).
- صلاحية إنشاء MySQL Database + User.
- صلاحية استخدام Terminal أو SSH (موصى به لكن ليس إلزاميًا).
- صلاحية إضافة Cron Jobs.
- Node.js 18+ و npm مثبتين على جهازك المحلي (لبناء المشروع قبل الرفع).

---

## 📦 الخطوة 1: بناء المشروع محليًا

> **مهم جدًا**: لا تبني المشروع على خادم cPanel — قيود LVE (RAM ~1GB) ستسبب فشل `npm run build`. ابنِ محليًا ثم ارفع الناتج.

```bash
# 1) استنساخ المستودع
git clone https://github.com/afreetalex001/nutrai.matrix49.app.git
cd nutrai.matrix49.app

# 2) تثبيت الاعتمادات
npm install --legacy-peer-deps

# 3) إنشاء ملف .env محليًا للبناء (يمكن استخدام قيم وهمية)
cp .env.example .env
# عدّل .env بقيم MySQL الحقيقية للاستضافة (سنحصل عليها في الخطوة 3)

# 4) توليد Prisma Client
npx prisma generate

# 5) البناء للإنتاج
npm run build
```

بعد نجاح البناء ستظهر مجلدات:
- `.next/standalone/` — خادم Next.js المستقل (يحتوي server.js خاص به)
- `.next/static/` — ملفات ثابتة (JS, CSS)
- `public/` — ملفات عامة (صور، شعار، APK)

---

## 🗄️ الخطوة 2: إنشاء قاعدة بيانات MySQL على cPanel

1. سجل الدخول إلى cPanel (مثلاً: `https://premium77.web-hosting.com:2083`).
2. اذهب إلى **MySQL Databases**.
3. أنشئ قاعدة بيانات جديدة باسم `nutriclinic` — cPanel سيضيف البادئة تلقائيًا، فتصبح مثلاً `matrmylq_nutriclinic`.
4. أنشئ مستخدم MySQL جديد:
   - Username: `ncuser` → يصبح `matrmylq_ncuser`
   - Password: كلمة مرور قوية (احفظها!)
5. اربط المستخدم بالقاعدة بكل الصلاحيات (**ALL PRIVILEGES**).

### رابط الاتصال (DATABASE_URL)

```
mysql://matrmylq_ncuser:PASSWORD@localhost:3306/matrmylq_nutriclinic
```

> **تنبيه**: إذا كانت كلمة المرور تحتوي على رموز خاصة مثل `! @ # $ %`، يجب URL-encode:
> - `!` → `%21`
> - `@` → `%40`
> - `#` → `%23`
> - `$` → `%24`
> - `%` → `%25`
> - `&` → `%26`

مثال: كلمة مرور `Nutfi2024!Secure` تصبح `Nutfi2024%21Secure` في الـ URL.

---

## 🚀 الخطوة 3: إعداد Node.js App على cPanel

1. في cPanel، اذهب إلى **Setup Node.js App** (تحت قسم Software).
2. اضغط **Create Application**.
3. املأ الحقول:
   - **Node.js version**: 18.18.0 أو أحدث (يفضل 20.x إذا متاح).
   - **Application mode**: Production
   - **Application root**: `nutrai.matrix49.app` (مجلد داخل home directory)
   - **Application URL**: اختر النطاق الفرعي (مثلاً `nutrai.matrix49.app`)
   - **Application startup file**: `server.js`
4. في قسم **Environment variables**، أضف (يمكنك أيضًا وضعها في ملف `.env` على الخادم لاحقًا):

| المتغير | القيمة |
|---------|--------|
| `DATABASE_URL` | `mysql://matrmylq_ncuser:PASSWORD@localhost:3306/matrmylq_nutriclinic` |
| `JWT_SECRET` | سلسلة عشوائية 64 خانة (استخدم `openssl rand -base64 64`) |
| `NEXTAUTH_SECRET` | سلسلة عشوائية 32 خانة |
| `NEXTAUTH_URL` | `https://nutrai.matrix49.app` |
| `NODE_ENV` | `production` |
| `SETUP_KEY` | `nutriclinic-setup-2024` |
| `CRON_KEY` | `nutriclinic-cron-2024` |
| `FREE_TRIAL_DAYS` | `14` |
| `FREE_TRIAL_ENABLED` | `true` |

5. اضغط **Create**.

---

## 📤 الخطوة 4: رفع ملفات المشروع

### الطريقة الموصى بها (آمنة وسريعة)

1. على جهازك المحلي، أنشئ حزمة tar.gz تحتوي فقط على الملفات المطلوبة:

```bash
cd nutrai.matrix49.app

# إنشاء حزمة النشر
tar -czf nutrai-deploy.tar.gz \
  server.js \
  app.js \
  package.json \
  package-lock.json \
  prisma/ \
  public/ \
  .next/standalone/ \
  .next/static/ \
  .env \
  .htaccess \
  next.config.ts
```

2. ارفع `nutrai-deploy.tar.gz` عبر **cPanel File Manager** إلى مجلد `nutrai.matrix49.app/` (الذي أنشأته cPanel في الخطوة 3).

3. من cPanel Terminal (أو SSH)، استخرج الملفات:

```bash
cd ~/nutrai.matrix49.app
tar -xzf nutrai-deploy.tar.gz
rm nutrai-deploy.tar.gz
```

4. انسخ مجلد `.next/static` و `public/` إلى داخل `.next/standalone/` (مطلوب لـ Next.js standalone):

```bash
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
```

> **ملاحظة**: `server.js` يقوم بهذه الخطوة تلقائيًا عند بدء التشغيل، لكن القيام بها يدويًا يضمن عدم وجود مشاكل.

---

## 🗃️ الخطوة 5: إنشاء جداول قاعدة البيانات (Prisma)

> هذه الخطوة يجب تنفيذها مرة واحدة فقط.

### الطريقة 1: عبر Terminal (موصى بها)

من cPanel Terminal:

```bash
cd ~/nutrai.matrix49.app
npx prisma db push
```

هذا سيقرأ `prisma/schema.prisma` وينشئ كل الجداول الـ 16 في MySQL.

### الطريقة 2: عبر /api/setup (بديل)

بعد تشغيل التطبيق، استدعِ:

```bash
curl -X POST https://nutrai.matrix49.app/api/setup \
  -H "Content-Type: application/json" \
  -d '{"setupKey":"nutriclinic-setup-2024"}'
```

سيقوم بـ:
1. محاولة `prisma db push` تلقائيًا (قد يفشل على cPanel مشترك).
2. إنشاء حساب الأدمن: `admin@nutriclinic.com / Admin@2024`.
3. إنشاء حساب الطبيب التجريبي: `doctor@demo.com / Doctor@2024`.
4. إنشاء خطط الاشتراك (monthly, yearly, free).
5. إنشاء مزودي AI (openai, gemini, claude).
6. إنشاء أقسام الصفحة الرئيسية.
7. إنشاء إعدادات النظام.

> **ملاحظة**: إذا فشل `prisma db push` تلقائيًا، نفّذه يدويًا من Terminal ثم استدعِ `/api/setup` لزرع البيانات.

---

## ⏰ الخطوة 6: إعداد Cron Jobs

1. في cPanel، اذهب إلى **Cron Jobs**.
2. أضف مهمة جديدة لتعطيل الاشتراكات المنتهية (يوميًا منتصف الليل):

| الحقل | القيمة |
|------|--------|
| Minute | `0` |
| Hour | `0` |
| Day | `*` |
| Month | `*` |
| Weekday | `*` |
| Command | `curl -s "https://nutrai.matrix49.app/api/cron/disable-expired?key=nutriclinic-cron-2024" > /dev/null 2>&1` |

---

## 🔧 الخطوة 7: إعدادات PHP إضافية (اختياري)

من **MultiPHP INI Editor**، ارفع الحدود التالية لتطبيقك:

```ini
max_execution_time = 300
max_input_time = 300
memory_limit = 512M
upload_max_filesize = 50M
post_max_size = 50M
```

هذا يساعد في رفع ملفات تقارير المختبر والصور.

---

## ✅ الخطوة 8: التحقق من النشر

1. افتح المتصفح على: `https://nutrai.matrix49.app`
2. يجب أن تظهر الصفحة الرئيسية (Landing Page) بالعربية.
3. جرّب تسجيل الدخول كأدمن: `https://nutrici.matrix49.app/login`
   - Email: `admin@nutriclinic.com`
   - Password: `Admin@2024`
4. من لوحة الأدمن، أضف مفاتيح AI (OpenAI / Gemini / Claude).
5. جرّب إنشاء مريض وخطة تغذية للتأكد من عمل AI.

---

## 🐛 استكشاف الأخطاء

### المشكلة: 502 Bad Gateway أو 503 Service Unavailable

**السبب**: تطبيق Node.js لا يعمل أو المنفذ مغلق.

**الحل**:
1. من cPanel Node.js App → اضغط **Restart**.
2. راجع سجلات التطبيق من زر **Logs** في نفس الصفحة.
3. تأكد أن `server.js` موجود في جذر التطبيق.
4. تأكد أن `.next/standalone/server.js` موجود.

### المشكلة: Database connection failed

**السبب**: `DATABASE_URL` غير صحيح أو المستخدم لا يملك صلاحيات.

**الحل**:
1. تحقق من `DATABASE_URL` في Environment variables.
2. تأكد أن كلمة المرور URL-encoded إذا تحتوي رموز.
3. من phpMyAdmin، جرّب تسجيل الدخول بنفس بيانات المستخدم للتأكد.
4. تأكد أن المستخدم مرتبط بالقاعدة بـ ALL PRIVILEGES.

### المشكلة: prisma db push يفشل بـ LVE error

**السبب**: قيود RAM على الاستضافة المشتركة.

**الحل**:
1. ابنِ Prisma Client محليًا: `npx prisma generate`.
2. ارفع مجلد `node_modules/.prisma/` جاهزًا مع باقي الملفات.
3. بدلًا من `prisma db push`، استخدم Prisma Migrate محليًا وارفع ملفات SQL:
   ```bash
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema.sql
   ```
4. استورد `schema.sql` عبر phpMyAdmin.

### المشكلة: API requests timeout (خاصة AI endpoints)

**السبب**: مهلة Apache/Passenger قصيرة (30 ثانية افتراضيًا).

**الحل**:
1. من MultiPHP INI Editor → ارفع `max_execution_time` إلى 300.
2. أضف في `.htaccess`:
   ```
   RewriteRule ^ - [E=proxy:no,E=proxytimeout:300]
   ```
3. لطلبات AI طويلة، فكّر في تقسيم الطلب إلى chunks.

### المشكلة: ملفات الرفع (صور، PDFs) لا تُحفظ

**السبب**: مشاكل صلاحيات المجلد.

**الحل**:
```bash
mkdir -p ~/nutrai.matrix49.app/public/uploads
chmod 755 ~/nutrai.matrix49.app/public/uploads
chown $USER:$USER ~/nutrai.matrix49.app/public/uploads
```

---

## 📊 معلومات إضافية

### بيانات الدخول الافتراضية

| الحساب | البريد | كلمة المرور | الدور |
|--------|--------|------------|------|
| Admin | admin@nutriclinic.com | Admin@2024 | مدير النظام |
| Doctor | doctor@demo.com | Doctor@2024 | طبيب |

> ⚠️ **غيّر كلمات المرور فور أول دخول** من صفحة الإعدادات.

### مفاتيح النظام

| المفتاح | القيمة الافتراضية | الغرض |
|---------|------------------|------|
| `SETUP_KEY` | `nutriclinic-setup-2024` | حماية /api/setup |
| `CRON_KEY` | `nutriclinic-cron-2024` | حماية /api/cron/* |

### الجداول في قاعدة البيانات (16 جدول)

1. User
2. SubscriptionPlan
3. Subscription
4. Patient
5. PatientShareToken
6. PatientSelfReport
7. Visit
8. NutritionPlan
9. ExercisePlan
10. FoodItem
11. AiProvider
12. AiApiKey
13. AiUsageLog
14. AiConversation
15. AiMessage
16. CmsContent
17. LandingPageSection
18. LandingPageItem
19. SystemSettings

> **ملاحظة**: العدد الفعلي 19 جدولًا. يمكنك رؤيتها كلها في phpMyAdmin بعد تنفيذ `prisma db push`.

### أوامر مفيدة

```bash
# إعادة تشغيل التطبيق (من cPanel Terminal)
pkill -f "node server.js" && nohup node server.js > server.log 2>&1 &

# مراقبة السجلات
tail -f ~/nutrai.matrix49.app/server.log

# فحص حالة قاعدة البيانات
npx prisma db execute --file /dev/null --schema prisma/schema.prisma

# إعادة بناء Prisma Client (بعد تحديث schema)
npx prisma generate

# تصدير قاعدة البيانات من phpMyAdmin
# ← اختر القاعدة ← Export ← Custom ← Format: SQL ← Go
```

---

## 🔄 التحديثات المستقبلية

عند تحديث الكود:

```bash
# محليًا
git pull origin main
npm install --legacy-peer-deps
npm run build

# حزم ورفع
tar -czf nutrai-update.tar.gz .next/standalone/ .next/static/ public/ server.js
# ارفع ثم استخرج على الخادم

# على الخادم
cd ~/nutrai.matrix49.app
tar -xzf nutrai-update.tar.gz
# من cPanel: Restart التطبيق
```

---

## 📞 الدعم

للمشاكل التقنية، راجع:
1. سجلات cPanel Node.js App (زر **Logs**).
2. سجلات الموقع من cPanel → **Errors**.
3. ملف `server.log` على الخادم.

---

**آخر تحديث**: يونيو 2026
**المستودع**: https://github.com/afreetalex001/nutrai.matrix49.app
**النطاق الإنتاجي**: nutrai.matrix49.app
