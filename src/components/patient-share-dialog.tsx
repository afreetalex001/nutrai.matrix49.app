'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, Trash2, Loader2, Calendar, Eye, Link as LinkIcon, ExternalLink, MessageSquare, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface ShareToken {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
  createdAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
  canSubmitWeight: boolean;
  canSubmitNote: boolean;
  isExpired: boolean;
}

interface SelfReport {
  id: string;
  type: string;
  weight?: number | null;
  bodyFat?: number | null;
  note?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface Props {
  patientId: string;
  patientName: string;
  token: string;
  initialOpen?: boolean;
}

export function PatientShareDialog({ patientId, patientName, token, initialOpen = false }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
  const [reports, setReports] = useState<SelfReport[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [days, setDays] = useState(7);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        fetch(`/api/patients/${patientId}/share`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/patients/${patientId}/self-reports`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (tRes.ok) {
        const d = await tRes.json();
        setShareTokens(d.tokens || []);
      }
      if (rRes.ok) {
        const d = await rRes.json();
        setReports(d.reports || []);
        setUnreadCount(d.unreadCount || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load unread count even when closed (for badge)
  useEffect(() => {
    if (!token) return;
    fetch(`/api/patients/${patientId}/self-reports`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUnreadCount(d.unreadCount || 0); })
      .catch(() => {});
  }, [patientId, token]);

  const createToken = async () => {
    setCreating(true);
    const t = toast.loading('جارٍ إنشاء الرابط...');
    try {
      const res = await fetch(`/api/patients/${patientId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ daysValid: days }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success('تم إنشاء الرابط', { id: t });
        await load();
        // Copy to clipboard automatically
        try {
          await navigator.clipboard.writeText(d.token.url);
          toast.success('تم نسخ الرابط للحافظة');
        } catch { /* ignore */ }
      } else {
        toast.error(d.error || 'فشل', { id: t });
      }
    } catch {
      toast.error('تعذر الاتصال', { id: t });
    } finally {
      setCreating(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    if (!confirm('إلغاء هذا الرابط؟ لن يستطيع المريض الوصول بعد ذلك.')) return;
    try {
      const res = await fetch(`/api/patients/${patientId}/share?tokenId=${tokenId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { toast.success('تم الإلغاء'); await load(); }
    } catch { toast.error('فشل'); }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('تم النسخ');
    } catch { toast.error('فشل النسخ'); }
  };

  const shareWhatsApp = (url: string) => {
    const text = `مرحباً ${patientName}، إليك رابط متابعة خطتك مع NutriClinic:\n${url}\n\nالرابط سيُبقيك على اطلاع بخطة التغذية والتمارين الخاصة بك.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const markRead = async (reportId: string) => {
    try {
      await fetch(`/api/patients/${patientId}/self-reports?id=${reportId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await fetch(`/api/patients/${patientId}/self-reports?all=1`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('تم تعليم الكل كمقروء');
      await load();
    } catch { toast.error('فشل'); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 relative">
          <Share2 className="size-3.5" />
          مشاركة مع المريض
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-[10px] bg-red-500">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-emerald-600" />
            مشاركة مع {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new link */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-emerald-900 mb-2">إنشاء رابط مشاركة جديد</h3>
            <p className="text-xs text-emerald-800 mb-3">
              المريض سيتمكن من رؤية الخطط المعتمدة، الفيديوهات، وتسجيل وزنه وملاحظاته بدون حاجة لتسجيل دخول.
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-emerald-700 font-semibold">مدة الصلاحية (يوم)</label>
                <select
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full mt-1 px-3 py-1.5 text-sm border rounded-md bg-white"
                >
                  <option value="7">7 أيام (موصى به)</option>
                  <option value="14">14 يوم</option>
                  <option value="30">30 يوم</option>
                  <option value="90">90 يوم</option>
                </select>
              </div>
              <Button onClick={createToken} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                {creating ? <Loader2 className="size-3.5 animate-spin" /> : <LinkIcon className="size-3.5" />}
                إنشاء
              </Button>
            </div>
          </div>

          {/* Active tokens */}
          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <LinkIcon className="size-4" />
              الروابط النشطة ({shareTokens.filter(t => !t.isExpired).length})
            </h3>
            {loading ? (
              <div className="text-center py-4"><Loader2 className="size-5 animate-spin mx-auto" /></div>
            ) : shareTokens.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg">
                لم يتم إنشاء روابط بعد
              </div>
            ) : (
              <div className="space-y-2">
                {shareTokens.map(st => {
                  const expDate = new Date(st.expiresAt);
                  const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                  return (
                    <div key={st.id} className={`p-3 rounded-lg border ${st.isExpired ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-emerald-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="size-3" />
                          <span>
                            ينتهي: {expDate.toLocaleDateString('ar-EG')}
                            {!st.isExpired && <span className="text-emerald-600 mr-1">(باقي {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'})</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Eye className="size-3" />
                          {st.accessCount} زيارة
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <input
                          type="text"
                          value={st.url}
                          readOnly
                          className="flex-1 px-2 py-1 text-[10px] border rounded bg-gray-50 font-mono"
                          onFocus={(e) => e.target.select()}
                          dir="ltr"
                        />
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyUrl(st.url)} disabled={st.isExpired}>
                          <Copy className="size-3" />
                          نسخ
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50" onClick={() => shareWhatsApp(st.url)} disabled={st.isExpired}>
                          📱 واتساب
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.open(st.url, '_blank')} disabled={st.isExpired}>
                          <ExternalLink className="size-3" />
                          فتح
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-500 ml-auto" onClick={() => revokeToken(st.id)}>
                          <Trash2 className="size-3" />
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Self reports from patient */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="size-4 text-blue-600" />
                تقارير وملاحظات المريض ({reports.length})
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-[10px]">{unreadCount} جديدة</Badge>
                )}
              </h3>
              {unreadCount > 0 && (
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={markAllRead}>
                  تعليم الكل كمقروء
                </Button>
              )}
            </div>
            {reports.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg">
                لم يرسل المريض أي تحديثات بعد
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reports.map(r => (
                  <div key={r.id} className={`p-3 rounded-lg border text-xs ${r.isRead ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-300'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {r.type === 'weight' ? (
                          <div>
                            <p className="font-semibold flex items-center gap-1">
                              <span className="text-emerald-700">⚖️ تسجيل وزن:</span>
                              <span className="text-base">{r.weight} كجم</span>
                              {r.bodyFat && <span className="text-blue-700">| دهون: {r.bodyFat}%</span>}
                            </p>
                            {r.note && <p className="text-gray-700 mt-1 italic">📝 {r.note}</p>}
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-blue-900 mb-1">💬 ملاحظة:</p>
                            <p className="whitespace-pre-wrap">{r.note}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-500 mt-1">
                          {new Date(r.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      {!r.isRead && (
                        <Button size="icon" variant="ghost" className="size-6 shrink-0" title="تعليم كمقروء" onClick={() => markRead(r.id)}>
                          <Bell className="size-3 text-blue-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
