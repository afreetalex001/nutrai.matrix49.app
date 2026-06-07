import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ملاحظة: تمت إزالة output: "standalone" لأن Vercel يتولى ذلك تلقائياً
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
  },
  // تحسين حزم Prisma على Vercel Serverless
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
