'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Cpu,
  CreditCard,
  FileText,
  Shield,
  ArrowRight,
  LogOut,
  Leaf,
  ChevronDown,
  Menu,
  Paintbrush,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const adminNavItems = [
  { title: 'نظرة عامة', href: '/admin', icon: LayoutDashboard },
  { title: 'المستخدمين', href: '/admin/users', icon: Users },
  { title: 'مزودو الذكاء الاصطناعي', href: '/admin/ai-providers', icon: Cpu },
  { title: 'الاشتراكات', href: '/admin/subscriptions', icon: CreditCard },
  { title: 'إدارة المحتوى', href: '/admin/cms', icon: FileText },
  { title: 'إعدادات الصفحة الرئيسية', href: '/admin/landing', icon: Paintbrush },
];

function AdminSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  return (
    <Sidebar
      side="right"
      collapsible="icon"
      className="border-l border-emerald-900/30 bg-[oklch(0.16_0.03_163)] text-white"
    >
      <SidebarHeader className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-emerald-800/40 text-white"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Shield className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold text-sm text-white">لوحة الإدارة</span>
                <span className="text-[10px] text-emerald-300">NutriClinic Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-emerald-800/40" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-emerald-300 font-medium">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="transition-all duration-200 text-emerald-100 hover:text-white hover:bg-emerald-800/40 data-[active=true]:bg-emerald-700/50 data-[active=true]:text-white font-medium"
                    >
                      <a href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                        {isActive && (
                          <motion.div
                            layoutId="admin-sidebar-active"
                            className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-l-full bg-emerald-400"
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarSeparator className="bg-emerald-800/40" />
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar className="size-8 border-2 border-emerald-600/40">
            <AvatarFallback className="bg-emerald-700/30 text-white text-xs font-bold">
              {user?.name?.charAt(0) || 'م'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-semibold text-white truncate">
              {user?.name || 'المدير'}
            </span>
            <span className="text-[10px] text-emerald-300 truncate">مدير النظام</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminTopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-emerald-900/20 bg-[oklch(0.16_0.03_163)]/95 backdrop-blur-md px-4 no-print">
      <SidebarTrigger className="-mr-1 text-white hover:text-emerald-100 hover:bg-emerald-800/40" />

      <div className="flex-1 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600/80 text-white hover:bg-emerald-600 border-0 text-[10px] px-2 py-0.5">
            <Shield className="size-3 ml-1" />
            مدير النظام
          </Badge>
        </div>
        <div className="flex-1" />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="gap-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/40 text-xs"
        >
          <ArrowRight className="size-3.5" />
          <span className="hidden sm:inline">العودة للموقع</span>
        </Button>

        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 h-9 px-2 hover:bg-emerald-800/40 text-emerald-200 hover:text-white"
            >
              <Avatar className="size-7 border border-emerald-600/40">
                <AvatarFallback className="bg-emerald-700/30 text-white text-[10px] font-bold">
                  {user?.name?.charAt(0) || 'م'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-xs font-medium">
                {user?.name || 'المدير'}
              </span>
              <ChevronDown className="size-3 text-emerald-300" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={() => router.push('/dashboard')}
              className="cursor-pointer gap-2"
            >
              <Leaf className="size-4" />
              <span>لوحة الطبيب</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function AnimatedContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="p-4 md:p-6"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { token, user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated()) {
        router.replace('/login');
      } else if (user?.role !== 'admin') {
        router.replace('/dashboard');
      } else {
        setIsLoading(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [router, isAuthenticated, token, user]);

  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-[oklch(0.16_0.03_163)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex items-center justify-center size-12 rounded-xl bg-emerald-600/20">
            <Shield className="size-6 text-emerald-400 animate-pulse" />
          </div>
          <span className="text-sm text-emerald-300">جارٍ تحميل لوحة الإدارة...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <AdminTopBar />
          <main className="flex-1 overflow-auto bg-[oklch(0.985_0.002_155)]">
            <AnimatedContent>{children}</AnimatedContent>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
