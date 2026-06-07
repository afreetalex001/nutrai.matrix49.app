'use client';

import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-right decorative circle */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-400 blur-3xl"
        />
        {/* Bottom-left decorative circle */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-teal-400 blur-3xl"
        />
        {/* Center subtle glow */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.05 }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.4 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-300 blur-3xl"
        />
        {/* Floating dots pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, #059669 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Brand logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold bg-gradient-to-l from-emerald-700 to-teal-600 bg-clip-text text-transparent">
              NutriClinic
            </span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider -mt-1">
              منصة إدارة عيادات التغذية
            </span>
          </div>
        </motion.div>

        {/* Card container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-emerald-900/5 border border-white/60 p-8"
        >
          {children}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          © {new Date().getFullYear()} NutriClinic — جميع الحقوق محفوظة
        </motion.p>
      </motion.div>
    </div>
  );
}
