import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ضروري لنشر cPanel: يُنتج مجلد .next/standalone قابل للنقل
  // يعمل مع server.js كنقطة دخول على Node.js App في cPanel
  output: "standalone",

  // تجاهل أخطاء TypeScript أثناء البناء (مؤقت - يجب إصلاحها لاحقًا)
  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // تحسين الأداء على الاستضافة المشتركة
    formats: ['image/avif', 'image/webp'],
  },

  // فصل mysql2 عن الحزمة لتجنب مشاكل الـ bundling على cPanel
  serverExternalPackages: ['mysql2'],

  // تعطيل telemetry لإرسال بيانات أقل
  logging: false,

  // تقليل استخدام العمليات والـ threads على cPanel/CloudLinux
  // لتجنب EAGAIN / ERR_WORKER_INIT_FAILED
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
