'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ServerCrash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/api-error';
import { useAuthToken } from '@/hooks/use-auth-token';

interface ErrorLog {
  id: string;
  level: string;
  source: string;
  message: string;
  stack: string | null;
  explanation: string | null;
  path: string | null;
  method: string | null;
  userRole: string | null;
  isResolved: boolean;
  createdAt: string;
}

interface AdminErrorsResponse {
  errors: ErrorLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminErrorsPage() {
  const token = useAuthToken();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState('false');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchErrors = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (resolved !== 'all') params.set('resolved', resolved);

      const data = await apiClient.get<AdminErrorsResponse>(`/api/admin/errors?${params}`, { token });
      setErrors(data.errors || []);
    } catch (error) {
      console.error('Error fetching admin errors:', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token, resolved]);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);

  const toggleResolved = async (err: ErrorLog) => {
    if (!token) return;

    try {
      await apiClient.patch('/api/admin/errors', { id: err.id, isResolved: !err.isResolved }, { token });
      fetchErrors();
    } catch (error) {
      console.error('Error updating admin error:', getErrorMessage(error));
    }
  };

  const badgeClass = (level: string) => level === 'error'
    ? 'bg-red-100 text-red-700 hover:bg-red-100'
    : level === 'warning'
      ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-100';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-red-600/10">
            <ServerCrash className="size-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">أخطاء المنصة</h1>
            <p className="text-sm text-muted-foreground">سجل أخطاء السيرفر والواجهة مع شرح مبسط لكل خطأ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={resolved} onValueChange={setResolved}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="false">غير محلولة</SelectItem>
              <SelectItem value="true">محلولة</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchErrors} className="gap-1 text-xs">
            <RefreshCw className="size-3.5" /> تحديث
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Card key={i} className="border-0 shadow-sm"><CardContent className="p-5"><div className="h-5 w-2/3 bg-muted animate-pulse rounded" /></CardContent></Card>)
        ) : errors.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="py-14 text-center"><CheckCircle2 className="size-12 text-emerald-600 mx-auto mb-3" /><p className="font-medium">لا توجد أخطاء في هذا التصنيف</p></CardContent></Card>
        ) : errors.map((err) => (
          <Card key={err.id} className={`border-0 shadow-sm ${err.isResolved ? 'opacity-70' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="size-4 text-red-600 shrink-0" />
                    <span className="truncate">{err.message}</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(err.createdAt).toLocaleString('ar-EG')} • {err.method || '-'} {err.path || '-'} • {err.source}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[10px] ${badgeClass(err.level)}`}>{err.level}</Badge>
                  <Badge className={`text-[10px] ${err.isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{err.isResolved ? 'محلول' : 'غير محلول'}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/40 p-3 text-xs leading-6">
                <strong>الشرح:</strong> {err.explanation || 'لا يوجد شرح متاح'}
              </div>
              {expanded === err.id && (
                <pre dir="ltr" className="max-h-80 overflow-auto rounded-lg bg-slate-950 text-slate-100 p-3 text-[11px] whitespace-pre-wrap">
{err.stack || err.message}
                </pre>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setExpanded(expanded === err.id ? null : err.id)}>{expanded === err.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</Button>
                <Button size="sm" className="text-xs bg-slate-600 hover:bg-slate-700" onClick={() => toggleResolved(err)}>{err.isResolved ? 'إعادة فتح' : 'تحديد كمحلول'}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
