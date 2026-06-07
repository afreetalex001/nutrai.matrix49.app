'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, CheckCircle2, Dumbbell, Coffee, Loader2, X, Youtube, Printer, Search, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeSearchUrl, getYouTubeThumbnail } from '@/lib/youtube';

interface ExerciseItem {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  videoUrl?: string;
}
interface Day {
  dayName: string;
  isRest: boolean;
  focus?: string;
  exercises: ExerciseItem[];
}
interface StructuredExercisePlan {
  weekDays: Day[];
  warmup?: string;
  cooldown?: string;
  notes?: string;
}
interface Plan {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  isActive: boolean;
}

const DAYS_AR = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
function shortId() { return Math.random().toString(36).substring(2, 10); }

interface Props {
  token: string;
  plan: Plan;
  initialStructured: StructuredExercisePlan | null;
  onSaved?: (plan: Plan) => void;
  onDeleted?: () => void;
}

export function ExercisePlanEditor({ token, plan, initialStructured, onSaved, onDeleted }: Props) {
  const [structured, setStructured] = useState<StructuredExercisePlan>(
    initialStructured || { weekDays: DAYS_AR.map(d => ({ dayName: d, isRest: true, exercises: [] })) }
  );
  const [activeDay, setActiveDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState(plan.name);
  const [planStatus, setPlanStatus] = useState(plan.status);
  const [videoDialog, setVideoDialog] = useState<{ open: boolean; dayIdx: number; exIdx: number; exerciseName: string; videoUrl: string }>({ open: false, dayIdx: 0, exIdx: 0, exerciseName: '', videoUrl: '' });
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  const openVideoDialog = (dayIdx: number, exIdx: number) => {
    const ex = structured.weekDays[dayIdx].exercises[exIdx];
    setVideoDialog({ open: true, dayIdx, exIdx, exerciseName: ex.name, videoUrl: ex.videoUrl || '' });
  };

  const saveVideoUrl = () => {
    const { dayIdx, exIdx, videoUrl } = videoDialog;
    const trimmed = videoUrl.trim();
    if (trimmed) {
      const videoId = extractYouTubeId(trimmed);
      if (!videoId) {
        toast.error('رابط YouTube غير صالح. مثال صحيح: https://youtu.be/XXXXXXXXXXX');
        return;
      }
    }
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[dayIdx].exercises[exIdx].videoUrl = trimmed || undefined;
      return next;
    });
    setVideoDialog({ ...videoDialog, open: false });
    toast.success(trimmed ? 'تم ربط الفيديو' : 'تم إزالة الفيديو');
  };

  const openPrintWindow = () => {
    if (planStatus === 'draft') {
      if (!confirm('الخطة لم تُعتمد بعد. هل تريد طباعتها كمسودة؟')) return;
    }
    window.open(`/print/exercise/${plan.id}`, '_blank', 'width=900,height=700');
  };

  const toggleRest = (dayIdx: number, isRest: boolean) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[dayIdx].isRest = isRest;
      if (isRest) next.weekDays[dayIdx].exercises = [];
      return next;
    });
  };

  const updateFocus = (dayIdx: number, value: string) => {
    setStructured(prev => { const n = structuredClone(prev); n.weekDays[dayIdx].focus = value; return n; });
  };

  const addExercise = (dayIdx: number) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[dayIdx].exercises.push({
        id: shortId(),
        name: 'تمرين جديد',
        sets: 3,
        reps: '10-12',
        restSeconds: 60,
      });
      return next;
    });
  };

  const updateExercise = (dayIdx: number, exIdx: number, field: keyof ExerciseItem, value: string | number) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      // @ts-expect-error: dynamic field
      next.weekDays[dayIdx].exercises[exIdx][field] = value;
      return next;
    });
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[dayIdx].exercises.splice(exIdx, 1);
      return next;
    });
  };

  const copyDay = (fromIdx: number, toIdx: number) => {
    setStructured(prev => {
      const next = structuredClone(prev);
      next.weekDays[toIdx] = { ...structuredClone(next.weekDays[fromIdx]), dayName: next.weekDays[toIdx].dayName };
      next.weekDays[toIdx].exercises = next.weekDays[toIdx].exercises.map(e => ({ ...e, id: shortId() }));
      return next;
    });
    toast.success(`تم نسخ ${DAYS_AR[fromIdx]} إلى ${DAYS_AR[toIdx]}`);
  };

  const handleSave = async (newStatus?: string) => {
    setSaving(true);
    const t = toast.loading(newStatus === 'approved' ? 'جارٍ الاعتماد...' : 'جارٍ الحفظ...');
    try {
      const res = await fetch(`/api/plans/exercise/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: planName, structuredPlan: structured, status: newStatus || planStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(newStatus === 'approved' ? 'تم اعتماد الخطة' : 'تم الحفظ', { id: t });
        if (newStatus) setPlanStatus(newStatus);
        onSaved?.(data.plan);
      } else {
        toast.error(data.error || 'فشل', { id: t });
      }
    } catch {
      toast.error('تعذر الاتصال', { id: t });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('حذف الخطة؟')) return;
    try {
      const res = await fetch(`/api/plans/exercise/${plan.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('تم الحذف'); onDeleted?.(); }
    } catch { toast.error('فشل'); }
  };

  const trainingDays = structured.weekDays.filter(d => !d.isRest).length;
  const totalExercises = structured.weekDays.reduce((s, d) => s + d.exercises.length, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <Input value={planName} onChange={(e) => setPlanName(e.target.value)}
                className="text-base font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0" />
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={planStatus === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                  {planStatus === 'approved' ? '✓ معتمدة' : '🟡 مسودة'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {trainingDays} أيام تدريب · {totalExercises} تمرين
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handleSave()} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                حفظ
              </Button>
              {planStatus !== 'approved' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSave('approved')} disabled={saving}>
                  <CheckCircle2 className="size-3.5" />
                  اعتماد
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1" onClick={openPrintWindow}>
                <Printer className="size-3.5" />
                طباعة
              </Button>
              <Button size="icon" variant="ghost" className="text-red-500" onClick={handleDelete}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={String(activeDay)} onValueChange={(v) => setActiveDay(Number(v))}>
        <TabsList className="grid grid-cols-7 h-auto">
          {DAYS_AR.map((d, i) => (
            <TabsTrigger key={i} value={String(i)} className="flex flex-col h-auto py-2 text-[11px]">
              <span className="font-semibold">{d}</span>
              <span className="text-[9px] mt-0.5">
                {structured.weekDays[i]?.isRest ? '😴 راحة' : `${structured.weekDays[i]?.exercises.length || 0}🏋️`}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {structured.weekDays.map((day, dayIdx) => (
          <TabsContent key={dayIdx} value={String(dayIdx)} className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold">{day.dayName}</h3>
                  <div className="flex items-center gap-2">
                    <Switch checked={!day.isRest} onCheckedChange={(v) => toggleRest(dayIdx, !v)} />
                    <span className="text-xs">{day.isRest ? 'يوم راحة' : 'يوم تدريب'}</span>
                  </div>
                  {!day.isRest && (
                    <Input
                      placeholder="مجموعات اليوم (مثل: صدر وترايسبس)"
                      value={day.focus || ''}
                      onChange={(e) => updateFocus(dayIdx, e.target.value)}
                      className="h-8 text-xs flex-1 min-w-[200px]"
                    />
                  )}
                  {!day.isRest && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => addExercise(dayIdx)}>
                      <Plus className="size-3" />
                      تمرين
                    </Button>
                  )}
                  {dayIdx > 0 && !day.isRest && (
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => copyDay(dayIdx - 1, dayIdx)}>
                      نسخ من {DAYS_AR[dayIdx - 1]}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {day.isRest ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coffee className="size-10 mx-auto mb-2" />
                    <p className="text-sm">يوم راحة - لا تمارين اليوم</p>
                  </div>
                ) : day.exercises.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Dumbbell className="size-10 mx-auto mb-2" />
                    <p className="text-sm">لا توجد تمارين. اضغط &quot;+ تمرين&quot; لإضافة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {day.exercises.map((ex, exIdx) => {
                      const videoId = ex.videoUrl ? extractYouTubeId(ex.videoUrl) : null;
                      return (
                      <div key={ex.id} className="p-3 bg-muted/20 rounded-lg space-y-2 border">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="size-4 text-emerald-600 shrink-0" />
                          <Input
                            value={ex.name}
                            onChange={(e) => updateExercise(dayIdx, exIdx, 'name', e.target.value)}
                            className="h-8 text-sm font-semibold flex-1"
                            placeholder="اسم التمرين"
                          />
                          <Button size="icon" variant="ghost" className="size-7 text-red-500" onClick={() => removeExercise(dayIdx, exIdx)}>
                            <X className="size-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground">مجموعات</label>
                            <Input type="number" value={ex.sets} onChange={(e) => updateExercise(dayIdx, exIdx, 'sets', parseInt(e.target.value) || 0)} className="h-8 text-xs" min={1} />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">تكرارات</label>
                            <Input value={ex.reps} onChange={(e) => updateExercise(dayIdx, exIdx, 'reps', e.target.value)} className="h-8 text-xs" placeholder="10-12" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">راحة (ثانية)</label>
                            <Input type="number" value={ex.restSeconds} onChange={(e) => updateExercise(dayIdx, exIdx, 'restSeconds', parseInt(e.target.value) || 0)} className="h-8 text-xs" min={0} step={15} />
                          </div>
                        </div>
                        <Input value={ex.notes || ''} onChange={(e) => updateExercise(dayIdx, exIdx, 'notes', e.target.value)} placeholder="ملاحظات (اختياري)" className="h-7 text-xs" />

                        {/* Video section */}
                        <div className="flex items-center gap-2 pt-1 border-t">
                          {videoId ? (
                            <>
                              <button
                                onClick={() => setPreviewVideo(videoId)}
                                className="flex items-center gap-2 flex-1 p-1.5 rounded hover:bg-red-50 transition-colors group"
                              >
                                <div className="relative shrink-0">
                                  <img src={getYouTubeThumbnail(videoId, 'default')} alt="" className="w-16 h-12 rounded object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                                    <Play className="size-4 text-white fill-white" />
                                  </div>
                                </div>
                                <span className="text-xs text-red-600 font-medium">شاهد الفيديو التوضيحي</span>
                              </button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openVideoDialog(dayIdx, exIdx)}>
                                <Youtube className="size-3" />
                                تغيير
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => openVideoDialog(dayIdx, exIdx)}>
                              <Youtube className="size-3" />
                              ربط فيديو شرح من YouTube
                            </Button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {(structured.warmup || structured.cooldown) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            {structured.warmup && (
              <div>
                <h4 className="text-xs font-semibold text-emerald-700 mb-1">🔥 الإحماء:</h4>
                <p className="text-xs">{structured.warmup}</p>
              </div>
            )}
            {structured.cooldown && (
              <div>
                <h4 className="text-xs font-semibold text-blue-700 mb-1">❄️ التبريد:</h4>
                <p className="text-xs">{structured.cooldown}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Video URL dialog */}
      <Dialog open={videoDialog.open} onOpenChange={(open) => setVideoDialog({ ...videoDialog, open })}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Youtube className="size-5 text-red-600" />
              ربط فيديو لـ &quot;{videoDialog.exerciseName}&quot;
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              الصق رابط YouTube للفيديو التوضيحي. هذا الفيديو سيظهر للمريض في الواجهة لكن
              <strong className="text-foreground"> لن يُطبع</strong> في ملف الـ PDF.
            </p>
            <Input
              placeholder="https://youtu.be/XXXXXXXXXXX"
              value={videoDialog.videoUrl}
              onChange={(e) => setVideoDialog({ ...videoDialog, videoUrl: e.target.value })}
              className="text-xs"
              dir="ltr"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => window.open(getYouTubeSearchUrl(videoDialog.exerciseName), '_blank')}
            >
              <Search className="size-3" />
              ابحث على YouTube عن &quot;{videoDialog.exerciseName}&quot;
            </Button>
            <p className="text-[10px] text-muted-foreground bg-muted p-2 rounded">
              💡 افتح يوتيوب، انسخ رابط الفيديو من شريط العنوان أو من زر &quot;مشاركة&quot;، والصقه هنا.
            </p>
            <div className="flex gap-2 justify-end">
              {videoDialog.videoUrl && (
                <Button variant="ghost" size="sm" onClick={() => setVideoDialog({ ...videoDialog, videoUrl: '' })}>
                  مسح
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setVideoDialog({ ...videoDialog, open: false })}>
                إلغاء
              </Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={saveVideoUrl}>
                حفظ الرابط
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video preview dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Youtube className="size-5 text-red-600" />
              معاينة الفيديو
            </DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="aspect-video">
              <iframe
                src={getYouTubeEmbedUrl(previewVideo)}
                title="Exercise video"
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
