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

  // فصل Prisma عن الحزمة لتجنب مشاكل الـ bundling على cPanel
  serverExternalPackages: ['@prisma/client', 'prisma', 'mysql2'],

  // تعطيل telemetry لإرسال بيانات أقل
  logging: false,
};

export default nextConfig;
