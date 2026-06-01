// ============================================================
// NutriClinic SaaS - cPanel Node.js App Entry Point
// نقطة دخول تطبيق Node.js لـ cPanel
// ============================================================
//
// This file serves as the entry point for cPanel's "Setup Node.js App"
// It runs the Next.js standalone server built with `next build`
//
// Setup in cPanel:
//   1. Go to: cPanel → Software → Setup Node.js App
//   2. Create Application with:
//      - Node.js version: 18.x or 20.x
//      - Application mode: Production
//      - Application root: /home/matrmlyq/nutriclinic.matrix49.app
//      - Application URL: nutriclinic.matrix49.app
//      - Application startup file: server.js
//   3. Add environment variables (see .env.production)
//   4. Run: npm install && npm run build
//   5. Start the application
// ============================================================

const { createServer } = require('http');
const path = require('path');
const fs = require('fs');

// Set the port - cPanel/Passenger provides PORT via environment
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

// Check if standalone build exists
const standaloneDir = path.join(__dirname, '.next', 'standalone');
const standaloneServer = path.join(standaloneDir, 'server.js');

if (fs.existsSync(standaloneServer)) {
  console.log('[NutriClinic] Starting Next.js standalone server...');

  // Set the correct directory for standalone server
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = path.join(standaloneDir, '.next', 'required-server-files.json');

  // Load the standalone server
  require(standaloneServer);
} else {
  console.log('[NutriClinic] Standalone build not found. Running development fallback...');

  // Fallback: try to use next start
  const { nextStart } = require('next/dist/cli/next-start');
  nextStart();
}
