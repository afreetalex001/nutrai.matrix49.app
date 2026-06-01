// ============================================================
// NutriClinic SaaS - cPanel Node.js App Entry Point
// نقطة دخول تطبيق Node.js لـ cPanel
// ============================================================
//
// This file serves as the entry point for cPanel's "Setup Node.js App"
// It runs the Next.js standalone server built with `next build`
//
// Setup in cPanel:
//   1. Go to: cPanel > Software > Setup Node.js App
//   2. Create Application with:
//      - Node.js version: 20.x
//      - Application mode: Production
//      - Application root: /home/matrmlyq/nutriclinic.matrix49.app
//      - Application URL: nutriclinic.matrix49.app
//      - Application startup file: server.js
//   3. Add environment variables (see .env.production)
//   4. Run: npm install && npm run build
//   5. Start the application
// ============================================================

const path = require('path');
const fs = require('fs');

// Set the port - cPanel/Passenger provides PORT via environment
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

console.log(`[NutriClinic] Starting server on ${HOSTNAME}:${PORT}`);
console.log(`[NutriClinic] Node.js version: ${process.version}`);
console.log(`[NutriClinic] Working directory: ${__dirname}`);

// Check if standalone build exists
const standaloneDir = path.join(__dirname, '.next', 'standalone');
const standaloneServer = path.join(standaloneDir, 'server.js');

if (fs.existsSync(standaloneServer)) {
  console.log('[NutriClinic] Found standalone build at:', standaloneDir);

  // The standalone server.js handles everything including listening on PORT
  // Just require it and it will start
  require(standaloneServer);
} else {
  console.error('[NutriClinic] ERROR: Standalone build not found!');
  console.error('[NutriClinic] Expected location:', standaloneServer);
  console.error('[NutriClinic] Please run: npm run build');
  console.error('[NutriClinic] Then restart this application from cPanel');

  // Create a simple HTTP server as fallback to prevent crash
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
          <p style="color:#6b7280">The site is being set up and will be available soon</p>
        </div>
      </body>
      </html>
    `);
  });
  server.listen(PORT, HOSTNAME, () => {
    console.log(`[NutriClinic] Fallback server running on ${HOSTNAME}:${PORT}`);
  });
}
