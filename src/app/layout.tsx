import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
  icons: {
    icon: "/logo.svg",
  },
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
