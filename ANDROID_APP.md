# تطبيق NutriClinic للأندرويد

## ✅ APK جاهز للتحميل

| الإصدار | الحجم | الرابط |
|---------|-------|--------|
| **Release (موصى به)** | 3.2 MB | https://nutriclinic.matrix49.app/NutriClinic.apk |
| Debug | 4.4 MB | `downloads/NutriClinic-v1.0.0-debug.apk` |

## 📱 طرق التثبيت

### الطريقة 1: APK مباشرة (الأفضل)
1. افتح من هاتفك: **https://nutriclinic.matrix49.app/download**
2. اضغط "تنزيل التطبيق"
3. افتح الملف بعد التحميل
4. اسمح بالتثبيت من مصدر غير معروف
5. اضغط "تثبيت" → جاهز ✅

### الطريقة 2: PWA (بدون تنزيل ملف)
1. افتح **https://nutriclinic.matrix49.app** من Chrome
2. القائمة (⋮) → "إضافة إلى الشاشة الرئيسية"
3. التطبيق جاهز ويعمل بنفس الجودة

## 🔧 معلومات تقنية

- **Application ID**: `app.matrix49.nutriclinic`
- **Min SDK**: Android 6.0 (API 23)
- **Target SDK**: Android 14 (API 36)
- **Framework**: Capacitor 8 + Next.js (WebView wrapper)
- **Backend**: متصل مباشرة بـ Neon PostgreSQL عبر nutriclinic.matrix49.app
- **التحديثات**: فورية - لا حاجة لإعادة تثبيت! (لأن التطبيق يفتح الموقع الفعلي)

## 🔄 إعادة بناء APK من المصدر

```bash
# المتطلبات
- Java JDK 21
- Android SDK 36 + Build-tools 36
- Node.js 18+

# الخطوات
cd /path/to/nutriclinic.matrix49.app
npm install --legacy-peer-deps
npx cap sync android
cd android
./gradlew assembleRelease -x lintVitalRelease

# APK الناتج
android/app/build/outputs/apk/release/app-release.apk
```

## 🔑 توقيع APK

الـ keystore الحالي للتجربة فقط:
- **File**: `android/nutriclinic-release.keystore`
- **Password**: `nutriclinic123`
- **Alias**: `nutriclinic`

⚠️ **للنشر على Google Play**: استخدم keystore جديد قوي واحفظه آمنًا. لا تستخدم الكلمات الافتراضية.

## 🌐 صفحات التطبيق

عند فتح التطبيق، يفتح مباشرة على `/portal` (دخول المريض). من هناك:

- **المريض**: يدخل التوكن الذي حصل عليه من طبيبه
- **الطبيب**: يضغط رابط "أنت طبيب؟ سجّل الدخول من هنا" → يدخل بـ email/password

كل ميزات الموقع متاحة في التطبيق:
- ✅ دخول الطبيب + إدارة المرضى
- ✅ خطط التغذية والتمارين (إنشاء + AI + تعديل + اعتماد)
- ✅ المساعد الذكي مع سياق المرضى
- ✅ التحاليل والملخصات الذكية
- ✅ الإشعارات الفورية
- ✅ بوابة المريض كاملة
- ✅ الطباعة من التطبيق (تفتح في المتصفح)
