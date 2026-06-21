import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AnalyticsTracker } from "@/components/analytics-tracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NutriClinic - منصة إدارة عيادات التغذية",
  description: "منصة متكاملة لإدارة عيادات التغذية المدعومة بالذكاء الاصطناعي. إدارة المرضى، خطط التغذية، والزيارات بكل سهولة.",
  keywords: ["NutriClinic", "تغذية", "عيادات", "إدارة", "ذكاء اصطناعي", "حمية", "تغذية علاجية"],
  authors: [{ name: "NutriClinic Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NutriClinic",
  },
  applicationName: "NutriClinic",
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png" },
    ],
    apple: [
      { url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AnalyticsTracker />
        {children}
        <Toaster />
        <SonnerToaster richColors closeButton position="top-center" dir="rtl" />
      </body>
    </html>
  );
}
