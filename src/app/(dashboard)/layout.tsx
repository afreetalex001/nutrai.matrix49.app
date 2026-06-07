'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Bot,
  ClipboardList,
  Settings,
  Search,
  LogOut,
  User,
  ChevronDown,
  Leaf,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { NotificationsButton } from '@/components/notifications-button';
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
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { title: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
  { title: 'المرضى', href: '/patients', icon: Users },
  { title: 'المساعد الذكي', href: '/ai-assistant', icon: Bot },
  { title: 'الخطط', href: '/plans', icon: ClipboardList },
  { title: 'الإعدادات', href: '/settings', icon: Settings },
];

function AppSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  return (
    <Sidebar side="right" collapsible="icon" className="border-l border-sidebar-border">
      <SidebarHeader className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Leaf className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold text-sm">NutriClinic</span>
                <span className="text-[10px] text-muted-foreground">إدارة عيادات التغذية</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground">القائمة الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="transition-all duration-200"
                    >
                      <a href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active"
                            className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-l-full bg-primary"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
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
        <SidebarSeparator />
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar className="size-8 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {user?.name?.charAt(0) || 'د'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-semibold truncate">{user?.name || 'الطبيب'}</span>
            <span className="text-[10px] text-muted-foreground truncate">{user?.clinicName || 'عيادة التغذية'}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/patients?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 no-print">
      <SidebarTrigger className="-mr-1" />
      
      <div className="flex-1 flex items-center gap-3">
        <form onSubmit={handleSearch} className="hidden sm:flex items-center relative max-w-sm flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن مريض..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 h-9 bg-muted/50 border-0 focus-visible:ring-1 text-sm"
          />
        </form>
        <div className="flex-1 sm:hidden" />
      </div>

      <div className="flex items-center gap-2">
        <NotificationsButton />

        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-9 px-2 hover:bg-accent">
              <Avatar className="size-7 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {user?.name?.charAt(0) || 'د'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-xs font-medium">{user?.name || 'الطبيب'}</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer gap-2">
              <User className="size-4" />
              <span>الملف الشخصي</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated()) {
        router.replace('/login');
      } else {
        setIsLoading(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [router, isAuthenticated, token]);

  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10">
            <Leaf className="size-6 text-primary animate-pulse" />
          </div>
          <span className="text-sm text-muted-foreground">جارٍ التحميل...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 overflow-auto">
          <AnimatedContent>{children}</AnimatedContent>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
