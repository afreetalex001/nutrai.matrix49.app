'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  LayoutDashboard,
  Eye,
  EyeOff,
  Edit2,
  Plus,
  Trash2,
  Save,
  X,
  Settings,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Type,
  Star,
  MessageCircle,
  RefreshCw,
  GripVertical,
  Globe,
  Copyright,
  Bot,
  Shield,
  Upload,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

// ==================== أنواع البيانات ====================

interface LandingPageItem {
  id: string;
  sectionKey: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  iconName: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LandingPageSection {
  id: string;
  sectionKey: string;
  title: string;
  titleAr: string | null;
  subtitle: string | null;
  subtitleAr: string | null;
  content: string | null;
  contentAr: string | null;
  imageUrl: string | null;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  items: LandingPageItem[];
}

interface SiteSettings {
  [key: string]: string;
}

// ==================== أيقونات الأقسام ====================

const sectionIcons: Record<string, React.ElementType> = {
  hero: LayoutDashboard,
  stats: Bot,
  features: Shield,
  ai_showcase: Bot,
  how_it_works: Settings,
  pricing: Star,
  nutrition_showcase: Type,
  testimonials: MessageCircle,
  faq: MessageCircle,
  cta: Star,
  free_trial: Star,
  footer: Copyright,
};

const sectionLabels: Record<string, string> = {
  hero: 'الهيرو / البانر الرئيسي',
  stats: 'الإحصائيات',
  features: 'المميزات',
  ai_showcase: 'عرض الذكاء الاصطناعي',
  how_it_works: 'كيف تعمل',
  pricing: 'الأسعار',
  nutrition_showcase: 'عرض خطط التغذية',
  testimonials: 'آراء العملاء',
  faq: 'الأسئلة الشائعة',
  cta: 'دعوة للعمل',
  free_trial: 'التجربة المجانية',
  footer: 'التذييل / الحقوق',
};

// ==================== المكون الرئيسي ====================

export default function AdminLandingPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [sections, setSections] = useState<LandingPageSection[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // حالات الحوار
  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editItemOpen, setItemEditOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [editingSection, setEditingSection] = useState<LandingPageSection | null>(null);
  const [editingItem, setEditingItem] = useState<LandingPageItem | null>(null);
  const [addItemSectionKey, setAddItemSectionKey] = useState('');

  // نماذج البيانات
  const [sectionForm, setSectionForm] = useState({
    title: '', titleAr: '', subtitle: '', subtitleAr: '',
    content: '', contentAr: '', imageUrl: '',
  });
  const [itemForm, setItemForm] = useState({
    title: '', titleAr: '', description: '', descriptionAr: '',
    imageUrl: '', iconName: '', linkUrl: '',
  });
  const [settingsForm, setSettingsForm] = useState<SiteSettings>({});
  const [logoUploading, setLogoUploading] = useState(false);

  // ==================== جلب البيانات ====================

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/landing', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || []);
        setSettings(data.settings || {});
      }
    } catch (error) {
      console.error('Error fetching landing page data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================== دوال التحديث ====================

  const toggleSectionVisibility = async (sectionId: string) => {
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'toggleSection', id: sectionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSections((prev) =>
          prev.map((s) => (s.id === sectionId ? { ...s, isVisible: data.section.isVisible } : s))
        );
        toast({ title: data.section.isVisible ? 'تم إظهار القسم' : 'تم إخفاء القسم' });
      }
    } catch (error) {
      console.error('Error toggling section:', error);
    }
  };

  const toggleItemVisibility = async (itemId: string) => {
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'toggleItem', id: itemId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSections((prev) =>
          prev.map((s) => ({
            ...s,
            items: s.items.map((i) => (i.id === itemId ? { ...i, isVisible: data.item.isVisible } : i)),
          }))
        );
        toast({ title: data.item.isVisible ? 'تم إظهار العنصر' : 'تم إخفاء العنصر' });
      }
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const handleEditSection = (section: LandingPageSection) => {
    setEditingSection(section);
    setSectionForm({
      title: section.title,
      titleAr: section.titleAr || '',
      subtitle: section.subtitle || '',
      subtitleAr: section.subtitleAr || '',
      content: section.content || '',
      contentAr: section.contentAr || '',
      imageUrl: section.imageUrl || '',
    });
    setEditSectionOpen(true);
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'section',
          id: editingSection.id,
          data: sectionForm,
        }),
      });
      if (res.ok) {
        setEditSectionOpen(false);
        setEditingSection(null);
        fetchData();
        toast({ title: 'تم تحديث القسم بنجاح' });
      } else {
        const data = await res.json();
        toast({ title: data.error || 'حدث خطأ', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error saving section:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = (item: LandingPageItem) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      titleAr: item.titleAr || '',
      description: item.description || '',
      descriptionAr: item.descriptionAr || '',
      imageUrl: item.imageUrl || '',
      iconName: item.iconName || '',
      linkUrl: item.linkUrl || '',
    });
    setItemEditOpen(true);
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'item',
          id: editingItem.id,
          data: itemForm,
        }),
      });
      if (res.ok) {
        setItemEditOpen(false);
        setEditingItem(null);
        fetchData();
        toast({ title: 'تم تحديث العنصر بنجاح' });
      } else {
        const data = await res.json();
        toast({ title: data.error || 'حدث خطأ', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = (sectionKey: string) => {
    setAddItemSectionKey(sectionKey);
    setItemForm({
      title: '', titleAr: '', description: '', descriptionAr: '',
      imageUrl: '', iconName: '', linkUrl: '',
    });
    setAddItemOpen(true);
  };

  const handleSaveNewItem = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'item',
          data: { ...itemForm, sectionKey: addItemSectionKey },
        }),
      });
      if (res.ok) {
        setAddItemOpen(false);
        fetchData();
        toast({ title: 'تم إضافة العنصر بنجاح' });
      } else {
        const data = await res.json();
        toast({ title: data.error || 'حدث خطأ', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
    try {
      const res = await fetch(`/api/admin/landing?type=item&id=${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchData();
        toast({ title: 'تم حذف العنصر بنجاح' });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleOpenSettings = () => {
    setSettingsForm({ ...settings });
    setLogoUploading(false);
    setSettingsOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'نوع الملف غير مدعوم. الصور فقط: JPG, PNG, WEBP, SVG, GIF', variant: 'destructive' });
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'حجم الملف كبير جداً. الحد الأقصى 2MB', variant: 'destructive' });
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSettingsForm({ ...settingsForm, site_logo_url: data.url });
        toast({ title: 'تم رفع الشعار بنجاح' });
      } else {
        toast({ title: data.error || 'حدث خطأ أثناء رفع الملف', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({ title: 'تعذر رفع الشعار', variant: 'destructive' });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/landing', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'settings', data: settingsForm }),
      });
      if (res.ok) {
        setSettings({ ...settingsForm });
        setSettingsOpen(false);
        toast({ title: 'تم حفظ الإعدادات بنجاح' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const moveSection = async (sectionId: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sections.length - 1)) return;

    const newSections = [...sections];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];

    setSections(newSections);

    // تحديث الترتيب في الخادم
    try {
      await Promise.all(
        newSections.map((s, i) =>
          fetch('/api/admin/landing', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'section', id: s.id, data: { sortOrder: i + 1 } }),
          })
        )
      );
    } catch (error) {
      console.error('Error reordering sections:', error);
      fetchData(); // إعادة الجلب في حالة الخطأ
    }
  };

  // ==================== العرض ====================

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-slate-600/10">
            <LayoutDashboard className="size-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">إعدادات الصفحة الرئيسية</h1>
            <p className="text-sm text-muted-foreground">
              تحكّم في جميع أقسام ومحتوى الصفحة الرئيسية
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
            <RefreshCw className="size-3.5" />
            تحديث
          </Button>
          <Button size="sm" onClick={handleOpenSettings} className="gap-1.5 text-xs bg-slate-600 hover:bg-slate-700">
            <Settings className="size-3.5" />
            إعدادات الموقع
          </Button>
        </div>
      </div>

      {/* إعدادات الموقع السريعة */}
      <Card className="border-0 shadow-sm bg-gradient-to-l from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">اسم الموقع</p>
              <p className="font-bold text-slate-700">{settings.site_name_ar || settings.site_name || 'NutriClinic'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">الشعار</p>
              {settings.site_logo_url ? (
                <img src={settings.site_logo_url} alt="Logo" className="h-8 mx-auto" />
              ) : (
                <p className="font-bold text-slate-700">الافتراضي</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">التجربة المجانية</p>
              <p className="font-bold text-slate-700">{settings.free_trial_enabled === 'true' ? `${settings.free_trial_days || '14'} يوم` : 'معطلة'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">الحقوق محفوظة</p>
              <p className="font-bold text-slate-700 text-xs">{settings.site_copyright_ar || settings.site_copyright || '© 2024'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قائمة الأقسام */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm animate-pulse">
              <CardContent className="p-4">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : (
          sections.map((section, idx) => {
            const SectionIcon = sectionIcons[section.sectionKey] || Type;
            const isExpanded = expandedSection === section.sectionKey;
            const label = sectionLabels[section.sectionKey] || section.sectionKey;

            return (
              <Card
                key={section.id}
                className={`border-0 shadow-sm transition-all duration-200 ${
                  !section.isVisible ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-0">
                  {/* رأس القسم */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedSection(isExpanded ? null : section.sectionKey)}
                  >
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }}
                        disabled={idx === 0}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }}
                        disabled={idx === sections.length - 1}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-center size-9 rounded-lg bg-slate-600/10">
                      <SectionIcon className="size-4 text-slate-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">{label}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          {section.items.length} عنصر
                        </Badge>
                        {!section.isVisible && (
                          <Badge className="bg-red-100 text-red-700 text-[10px]">مخفي</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {section.titleAr || section.title}
                        {section.subtitleAr ? ` — ${section.subtitleAr}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={section.isVisible}
                        onCheckedChange={() => toggleSectionVisibility(section.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleEditSection(section)}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8">
                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* محتوى القسم الموسع */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t">
                          <div className="flex items-center justify-between mt-3 mb-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              عناصر القسم ({section.items.length})
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[11px] h-7 gap-1"
                              onClick={() => handleAddItem(section.sectionKey)}
                            >
                              <Plus className="size-3" />
                              إضافة عنصر
                            </Button>
                          </div>

                          {section.items.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              لا توجد عناصر في هذا القسم
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {section.items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                                    !item.isVisible ? 'opacity-50 bg-muted/20' : 'bg-card hover:bg-muted/30'
                                  }`}
                                >
                                  {item.iconName && (
                                    <div className="size-8 rounded bg-slate-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                      <span className="text-[11px] font-mono text-slate-700">{item.iconName.slice(0, 2)}</span>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {item.titleAr || item.title}
                                    </p>
                                    {item.descriptionAr && (
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {item.descriptionAr}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Switch
                                      checked={item.isVisible}
                                      onCheckedChange={() => toggleItemVisibility(item.id)}
                                      className="scale-75"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7"
                                      onClick={() => handleEditItem(item)}
                                    >
                                      <Edit2 className="size-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-7 text-red-500 hover:text-red-700"
                                      onClick={() => handleDeleteItem(item.id)}
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ==================== حوار تعديل القسم ==================== */}
      <Dialog open={editSectionOpen} onOpenChange={setEditSectionOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-4 text-slate-600" />
              تعديل القسم: {editingSection ? sectionLabels[editingSection.sectionKey] || editingSection.sectionKey : ''}
            </DialogTitle>
            <DialogDescription>
              تعديل محتوى وإعدادات القسم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">العنوان (عربي)</Label>
                <Input
                  value={sectionForm.titleAr}
                  onChange={(e) => setSectionForm({ ...sectionForm, titleAr: e.target.value })}
                  placeholder="العنوان بالعربية"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">العنوان (إنجليزي)</Label>
                <Input
                  value={sectionForm.title}
                  onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                  placeholder="Title in English"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">العنوان الفرعي (عربي)</Label>
                <Input
                  value={sectionForm.subtitleAr}
                  onChange={(e) => setSectionForm({ ...sectionForm, subtitleAr: e.target.value })}
                  placeholder="العنوان الفرعي بالعربية"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">العنوان الفرعي (إنجليزي)</Label>
                <Input
                  value={sectionForm.subtitle}
                  onChange={(e) => setSectionForm({ ...sectionForm, subtitle: e.target.value })}
                  placeholder="Subtitle in English"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">المحتوى (عربي)</Label>
                <Textarea
                  value={sectionForm.contentAr}
                  onChange={(e) => setSectionForm({ ...sectionForm, contentAr: e.target.value })}
                  placeholder="المحتوى بالعربية"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">المحتوى (إنجليزي)</Label>
                <Textarea
                  value={sectionForm.content}
                  onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
                  placeholder="Content in English"
                  rows={4}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">رابط الصورة</Label>
              <Input
                value={sectionForm.imageUrl}
                onChange={(e) => setSectionForm({ ...sectionForm, imageUrl: e.target.value })}
                placeholder="/hero-dashboard.webp"
                dir="ltr"
              />
              {sectionForm.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border h-32">
                  <img src={sectionForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSectionOpen(false)} className="text-xs">إلغاء</Button>
            <Button onClick={handleSaveSection} disabled={saving} className="text-xs bg-slate-600 hover:bg-slate-700">
              <Save className="size-3.5 ml-1" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== حوار تعديل العنصر ==================== */}
      <Dialog open={editItemOpen} onOpenChange={setItemEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-4 text-slate-600" />
              تعديل العنصر
            </DialogTitle>
            <DialogDescription>
              تعديل محتوى وإعدادات العنصر
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">العنوان (عربي)</Label>
                <Input
                  value={itemForm.titleAr}
                  onChange={(e) => setItemForm({ ...itemForm, titleAr: e.target.value })}
                  placeholder="العنوان بالعربية"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">العنوان (إنجليزي)</Label>
                <Input
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="Title in English"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">الوصف (عربي)</Label>
                <Textarea
                  value={itemForm.descriptionAr}
                  onChange={(e) => setItemForm({ ...itemForm, descriptionAr: e.target.value })}
                  placeholder="الوصف بالعربية"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">الوصف (إنجليزي)</Label>
                <Textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Description in English"
                  rows={3}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">اسم الأيقونة</Label>
                <Input
                  value={itemForm.iconName}
                  onChange={(e) => setItemForm({ ...itemForm, iconName: e.target.value })}
                  placeholder="Users, Bot, Heart..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">رابط (اختياري)</Label>
                <Input
                  value={itemForm.linkUrl}
                  onChange={(e) => setItemForm({ ...itemForm, linkUrl: e.target.value })}
                  placeholder="/contact"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">رابط الصورة (اختياري)</Label>
              <Input
                value={itemForm.imageUrl}
                onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                placeholder="/images/photo.webp"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemEditOpen(false)} className="text-xs">إلغاء</Button>
            <Button onClick={handleSaveItem} disabled={saving} className="text-xs bg-slate-600 hover:bg-slate-700">
              <Save className="size-3.5 ml-1" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== حوار إضافة عنصر ==================== */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-slate-600" />
              إضافة عنصر جديد
            </DialogTitle>
            <DialogDescription>
              إضافة عنصر جديد إلى قسم &quot;{sectionLabels[addItemSectionKey] || addItemSectionKey}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">العنوان (عربي) *</Label>
                <Input
                  value={itemForm.titleAr}
                  onChange={(e) => setItemForm({ ...itemForm, titleAr: e.target.value })}
                  placeholder="العنوان بالعربية"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">العنوان (إنجليزي) *</Label>
                <Input
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="Title in English"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">الوصف (عربي)</Label>
                <Textarea
                  value={itemForm.descriptionAr}
                  onChange={(e) => setItemForm({ ...itemForm, descriptionAr: e.target.value })}
                  placeholder="الوصف بالعربية"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">الوصف (إنجليزي)</Label>
                <Textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Description in English"
                  rows={3}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">اسم الأيقونة</Label>
                <Input
                  value={itemForm.iconName}
                  onChange={(e) => setItemForm({ ...itemForm, iconName: e.target.value })}
                  placeholder="Users, Bot, Heart..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">رابط (اختياري)</Label>
                <Input
                  value={itemForm.linkUrl}
                  onChange={(e) => setItemForm({ ...itemForm, linkUrl: e.target.value })}
                  placeholder="/contact"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)} className="text-xs">إلغاء</Button>
            <Button onClick={handleSaveNewItem} disabled={saving || !itemForm.title} className="text-xs bg-slate-600 hover:bg-slate-700">
              <Plus className="size-3.5 ml-1" />
              {saving ? 'جارٍ الإضافة...' : 'إضافة العنصر'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== حوار إعدادات الموقع ==================== */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-4 text-slate-600" />
              إعدادات الموقع العامة
            </DialogTitle>
            <DialogDescription>
              اللوجو، اسم الموقع، التجربة المجانية، الحقوق محفوظة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* اسم الموقع */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Globe className="size-4 text-slate-600" />
                اسم الموقع
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">اسم الموقع (عربي)</Label>
                  <Input
                    value={settingsForm.site_name_ar || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, site_name_ar: e.target.value })}
                    placeholder="نوتري كلينيك"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">اسم الموقع (إنجليزي)</Label>
                  <Input
                    value={settingsForm.site_name || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, site_name: e.target.value })}
                    placeholder="NutriClinic"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* الشعار */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="size-4 text-slate-600" />
                الشعار (اللوجو)
              </h4>
              <div className="space-y-2">
                <Label className="text-xs">رابط الشعار</Label>
                <Input
                  value={settingsForm.site_logo_url || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, site_logo_url: e.target.value })}
                  placeholder="/logo.png"
                  dir="ltr"
                />
                {/* File upload for logo */}
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50/50 transition-colors">
                    {logoUploading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin text-slate-600" />
                        <span className="text-xs text-slate-700">جارٍ الرفع...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="size-4 text-slate-600" />
                        <span className="text-xs text-slate-700">اضغط لاختيار شعار من الجهاز</span>
                        <span className="text-[10px] text-muted-foreground">JPG, PNG, WEBP, SVG — حد أقصى 2MB</span>
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                      disabled={logoUploading}
                      onChange={handleLogoUpload}
                    />
                  </label>
                </div>
                {settingsForm.site_logo_url && (
                  <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-3">
                    <img src={settingsForm.site_logo_url} alt="Logo Preview" className="h-10" />
                    <span className="text-xs text-muted-foreground">معاينة الشعار</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* التجربة المجانية */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Star className="size-4 text-slate-600" />
                التجربة المجانية
              </h4>
              <div className="flex items-center gap-3">
                <Switch
                  checked={settingsForm.free_trial_enabled === 'true'}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, free_trial_enabled: checked ? 'true' : 'false' })
                  }
                />
                <Label className="text-sm">تفعيل التجربة المجانية</Label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">مدة التجربة (بالأيام)</Label>
                <Input
                  type="number"
                  value={settingsForm.free_trial_days || '14'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, free_trial_days: e.target.value })}
                  placeholder="14"
                  dir="ltr"
                  className="w-32"
                />
              </div>
            </div>

            <Separator />

            {/* الحقوق محفوظة */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Copyright className="size-4 text-slate-600" />
                الحقوق محفوظة
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">نص الحقوق (عربي)</Label>
                  <Input
                    value={settingsForm.site_copyright_ar || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, site_copyright_ar: e.target.value })}
                    placeholder="© 2024 نوتري كلينيك. جميع الحقوق محفوظة."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">نص الحقوق (إنجليزي)</Label>
                  <Input
                    value={settingsForm.site_copyright || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, site_copyright: e.target.value })}
                    placeholder="© 2024 NutriClinic. All rights reserved."
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* بيانات التواصل */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="size-4 text-slate-600" />
                بيانات التواصل
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">رقم واتساب</Label>
                  <Input
                    value={settingsForm.whatsapp_number || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })}
                    placeholder="+201012345678"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">بريد الدعم</Label>
                  <Input
                    value={settingsForm.support_email || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, support_email: e.target.value })}
                    placeholder="support@nutriclinic.com"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)} className="text-xs">إلغاء</Button>
            <Button onClick={handleSaveSettings} disabled={saving} className="text-xs bg-slate-600 hover:bg-slate-700">
              <Save className="size-3.5 ml-1" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
