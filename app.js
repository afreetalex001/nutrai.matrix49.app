// ============================================================
// NutriClinic SaaS - Lightweight Passenger Entry Point
// نقطة دخول خفيفة لـ Passenger على الاستضافة المشتركة
// ============================================================
//
// This file is designed to work with Phusion Passenger
// It loads the Next.js standalone server with minimal resource usage
//
// Setup:
//   1. Upload the standalone build to: ~/nutriclinic.matrix49.app/
//   2. Place this file as: ~/nutriclinic.matrix49.app/app.js
//   3. Create .htaccess in public_html with Passenger config
//
// ============================================================

const path = require('path');

// Set the application root
const appRoot = path.join(__dirname);

// Change to the application directory
process.chdir(appRoot);

// Set production mode
process.env.NODE_ENV = 'production';

// Set the standalone config
const standaloneDir = path.join(appRoot);
const serverFile = path.join(standaloneDir, 'server.js');

// Check if the standalone server exists
const fs = require('fs');
if (fs.existsSync(serverFile)) {
  // Load the Next.js standalone server
  require(serverFile);
} else {
  // Fallback: minimal HTTP server
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>NutriClinic</title></head><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui;background:#f0fdf4"><div style="text-align:center"><h1 style="color:#059669">NutriClinic</h1><p style="color:#374151">الموقع قيد الإعداد</p></div></body></html>`);
  });
  server.listen(process.env.PORT || 3000, () => {
    console.log('NutriClinic fallback server running');
  });
}
