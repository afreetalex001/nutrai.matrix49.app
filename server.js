// ============================================================
// NutriClinic SaaS - Production Entry Point
// نقطة دخول الإنتاج - تعمل مع cPanel Node.js App
// ============================================================

const path = require('path');
const fs = require('fs');

// تأكد من تحميل متغيرات البيئة من .env.production
const envPath = path.join(__dirname, '.env.production');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();
        // إزالة علامات الاقتباس
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
  console.log('[NutriClinic] Environment variables loaded from .env.production');
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

console.log(`[NutriClinic] Starting server on ${HOSTNAME}:${PORT}`);
console.log(`[NutriClinic] Node.js version: ${process.version}`);
console.log(`[NutriClinic] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

// التحقق من وجود البناء المستقل
const standaloneDir = path.join(__dirname, '.next', 'standalone');
const standaloneServer = path.join(standaloneDir, 'server.js');

if (fs.existsSync(standaloneServer)) {
  console.log('[NutriClinic] Found standalone build');

  // تعيين HOSTNAME و PORT للـ Next.js standalone server
  process.env.HOSTNAME = HOSTNAME;
  process.env.PORT = PORT.toString();

  // تشغيل standalone server
  require(standaloneServer);
} else {
  console.error('[NutriClinic] ERROR: Standalone build not found!');
  console.error('[NutriClinic] Please run: npm run build');

  // خادم احتياطي
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head><meta charset="utf-8"><title>NutriClinic - جاري الإعداد</title></head>
      <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui;background:#f0fdf4">
        <div style="text-align:center;padding:2rem">
          <h1 style="color:#059669">NutriClinic</h1>
          <p style="color:#374151;font-size:1.2rem">الموقع قيد الإعداد، سيكون متاحاً قريباً</p>
          <p style="color:#6b7280">Please run: npm install && npm run build</p>
        </div>
      </body>
      </html>
    `);
  });
  server.listen(PORT, HOSTNAME, () => {
    console.log(`[NutriClinic] Fallback server running on ${HOSTNAME}:${PORT}`);
  });
}
