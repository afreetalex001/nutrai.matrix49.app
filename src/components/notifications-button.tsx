'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, Check, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/auth-store';

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  patientId?: string;
  patientName?: string;
  icon?: string;
}

// تنسيق "منذ كم"
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `قبل ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `قبل ${days} يوم`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `قبل ${weeks} أسبوع`;
  return new Date(dateStr).toLocaleDateString('ar-EG');
}

export function NotificationsButton() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
      }
    } catch (e) {
      // silent fail
    }
  }, [token]);

  // تحميل أولي + polling كل دقيقة
  useEffect(() => {
    if (!token) return;
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, fetchNotifications]);

  // عند فتح الـ dropdown - حديث فوري
  useEffect(() => {
    if (open && token) {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));
    }
  }, [open, token, fetchNotifications]);

  const markAsRead = async (notifId: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications?id=${encodeURIComponent(notifId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      // optimistic update
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllAsRead = async () => {
    if (!token || marking) return;
    setMarking(true);
    try {
      await fetch('/api/notifications?all=1', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchNotifications();
    } catch { /* ignore */ }
    finally { setMarking(false); }
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) await markAsRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-muted-foreground hover:text-foreground"
          aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount} جديدة)` : ''}`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -left-0.5 min-w-4 h-4 px-1 text-[9px] flex items-center justify-center bg-red-500 text-white rounded-full border-2 border-background animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-80 sm:w-96 p-0 max-h-[80vh] overflow-hidden flex flex-col"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <h3 className="font-semibold text-sm">الإشعارات</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0">
                {unreadCount} جديد
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-primary hover:text-primary/80 gap-1"
              onClick={markAllAsRead}
              disabled={marking}
            >
              {marking ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              تعليم الكل كمقروء
            </Button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">جارٍ التحميل...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <BellOff className="size-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">لا توجد إشعارات</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                ستظهر هنا تحديثات مرضاك (وزن، ملاحظات) وخطط بحاجة لمراجعتك
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-right px-3 py-3 hover:bg-muted/50 transition-colors flex gap-2.5 items-start ${
                    !n.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {/* أيقونة */}
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-base shrink-0">
                    {n.icon || '🔔'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="size-2 rounded-full bg-blue-500 shrink-0 mt-1.5" aria-label="غير مقروء" />
                      )}
                    </div>
                    {n.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                        {n.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      {n.link && (
                        <span className="text-[10px] text-primary flex items-center gap-0.5">
                          عرض <ExternalLink className="size-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-3 py-2 border-t bg-muted/20 text-center">
            <p className="text-[10px] text-muted-foreground">
              {notifications.length} إشعار · تحديث تلقائي كل دقيقة
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
