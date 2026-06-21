// ============================================================
// NutriClinic SaaS - Production Entry Point (cPanel / Node.js App)
// نقطة دخول الإنتاج - تعمل مع cPanel Node.js App
// ============================================================

const path = require('path');
const fs = require('fs');

// تحميل متغيرات البيئة من الملفات بالترتيب التالي:
// 1) .env (cPanel standard)
// 2) .env.production (legacy support)
// cPanel Node.js App قد يضبط بعض المتغيرات من الواجهة، فلن نكتب فوقها
function loadEnvFile(filename) {
  const envPath = path.join(__dirname, filename);
  if (!fs.existsSync(envPath)) return false;
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) return;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    // إزالة علامات الاقتباس
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // لا نكتب فوق متغير موجود (cPanel GUI env vars تأخذ الأولوية)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
  return true;
}

const loadedDotEnv = loadEnvFile('.env');
const loadedDotEnvProd = loadEnvFile('.env.production');
console.log(`[NutriClinic] Env files loaded: .env=${loadedDotEnv}, .env.production=${loadedDotEnvProd}`);

// منفذ الاستماع — cPanel يحدد PORT تلقائيًا
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

console.log(`[NutriClinic] Starting server on ${HOSTNAME}:${PORT}`);
console.log(`[NutriClinic] Node.js version: ${process.version}`);
console.log(`[NutriClinic] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`[NutriClinic] DATABASE_URL: ${process.env.DATABASE_URL ? '✓ set' : '✗ missing'}`);
console.log(`[NutriClinic] JWT_SECRET: ${process.env.JWT_SECRET ? '✓ set' : '✗ missing'}`);

// التحقق من وجود البناء المستقل
// Next.js standalone قد يضعه في:
//  - .next/standalone/server.js (إذا اسم المشروع = جذر المستودع)
//  - .next/standalone/<dirname>/server.js (إذا اسم المشروع != جذر المستودع)
const standaloneDir = path.join(__dirname, '.next', 'standalone');
const dirname = path.basename(__dirname);

let standaloneServer = path.join(standaloneDir, 'server.js');
if (!fs.existsSync(standaloneServer)) {
  // جرب المسار المتداخل
  const nestedServer = path.join(standaloneDir, dirname, 'server.js');
  if (fs.existsSync(nestedServer)) {
    standaloneServer = nestedServer;
  }
}

if (fs.existsSync(standaloneServer)) {
  console.log('[NutriClinic] Found standalone build at:', standaloneServer);

  // تحديد مكان standaloneDir الفعلي (لنسخ static و public)
  const actualStandaloneDir = path.dirname(standaloneServer);

  // نسخ مجلد public و .next/static إلى standalone (إذا لم يكونا موجودين)
  // Next.js standalone لا ينسخهما تلقائيًا
  const staticDir = path.join(__dirname, '.next', 'static');
  const staticTarget = path.join(actualStandaloneDir, '.next', 'static');
  if (fs.existsSync(staticDir) && !fs.existsSync(staticTarget)) {
    try {
      fs.cpSync(staticDir, staticTarget, { recursive: true });
      console.log('[NutriClinic] Copied .next/static to standalone ✓');
    } catch (e) {
      console.error('[NutriClinic] Failed to copy .next/static:', e.message);
    }
  }

  const publicDir = path.join(__dirname, 'public');
  const publicTarget = path.join(actualStandaloneDir, 'public');
  if (fs.existsSync(publicDir) && !fs.existsSync(publicTarget)) {
    try {
      fs.cpSync(publicDir, publicTarget, { recursive: true });
      console.log('[NutriClinic] Copied public/ to standalone ✓');
    } catch (e) {
      console.error('[NutriClinic] Failed to copy public/:', e.message);
    }
  }

  // نسخ Prisma schema إلى standalone (مطلوب لـ prisma db push من standalone)
  const prismaDir = path.join(__dirname, 'prisma');
  const prismaTarget = path.join(actualStandaloneDir, 'prisma');
  if (fs.existsSync(prismaDir) && !fs.existsSync(prismaTarget)) {
    try {
      fs.cpSync(prismaDir, prismaTarget, { recursive: true });
      console.log('[NutriClinic] Copied prisma/ to standalone ✓');
    } catch (e) {
      console.error('[NutriClinic] Failed to copy prisma/:', e.message);
    }
  }

  // تعيين HOSTNAME و PORT للـ Next.js standalone server
  process.env.HOSTNAME = HOSTNAME;
  process.env.PORT = PORT.toString();

  // تشغيل standalone server
  require(standaloneServer);
} else {
  console.error('[NutriClinic] ERROR: Standalone build not found!');
  console.error('[NutriClinic] Searched at:');
  console.error('  -', path.join(standaloneDir, 'server.js'));
  console.error('  -', path.join(standaloneDir, dirname, 'server.js'));
  console.error('[NutriClinic] Please run: npm install --legacy-peer-deps && npm run build');

  // خادم احتياطي يعرض رسالة مفيدة
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head><meta charset="utf-8"><title>NutriClinic - جاري الإعداد</title></head>
      <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui;background:#f0fdf4">
        <div style="text-align:center;padding:2rem">
          <h1 style="color:#059669;font-size:2.5rem;margin-bottom:1rem">NutriClinic</h1>
          <p style="color:#374151;font-size:1.2rem;margin-bottom:0.5rem">الموقع قيد الإعداد، سيكون متاحاً قريباً</p>
          <p style="color:#6b7280;font-size:0.9rem">يرجى تشغيل: npm install &amp;&amp; npm run build</p>
        </div>
      </body>
      </html>
    `);
  });
  server.listen(PORT, HOSTNAME, () => {
    console.log(`[NutriClinic] Fallback server running on ${HOSTNAME}:${PORT}`);
  });
}
