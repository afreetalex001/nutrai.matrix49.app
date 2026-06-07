'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  FileText,
  Plus,
  Edit2,
  Search,
  Filter,
  RefreshCw,
  Globe,
  Type,
  Code,
  Image,
  Save,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';

interface CmsContentItem {
  id: string;
  key: string;
  value: string;
  valueAr: string | null;
  type: string;
  page: string | null;
  createdAt: string;
  updatedAt: string;
}

const typeIcons: Record<string, React.ElementType> = {
  text: Type,
  html: Code,
  image: Image,
  json: Code,
};

const typeLabels: Record<string, string> = {
  text: 'نص',
  html: 'HTML',
  image: 'صورة',
  json: 'JSON',
};

const pageLabels: Record<string, string> = {
  home: 'الرئيسية',
  about: 'من نحن',
  pricing: 'الأسعار',
  contact: 'تواصل معنا',
  login: 'تسجيل الدخول',
  register: 'التسجيل',
};

export default function AdminCmsPage() {
  const { token } = useAuthStore();
  const [content, setContent] = useState<CmsContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CmsContentItem | null>(null);

  const [form, setForm] = useState({
    key: '',
    value: '',
    valueAr: '',
    type: 'text',
    page: '',
  });

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (pageFilter && pageFilter !== 'all') params.set('page', pageFilter);

      const res = await fetch(`/api/admin/cms?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
      }
    } catch (error) {
      console.error('Error fetching CMS content:', error);
    } finally {
      setLoading(false);
    }
  }, [token, pageFilter]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleEdit = (item: CmsContentItem) => {
    setEditingItem(item);
    setForm({
      key: item.key,
      value: item.value,
      valueAr: item.valueAr || '',
      type: item.type,
      page: item.page || '',
    });
    setEditOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setForm({
      key: '',
      value: '',
      valueAr: '',
      type: 'text',
      page: '',
    });
    setAddOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId: editingItem.id,
          value: form.value,
          valueAr: form.valueAr || undefined,
          type: form.type,
          page: form.page || undefined,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        setEditingItem(null);
        fetchContent();
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء تحديث المحتوى');
      }
    } catch (error) {
      console.error('Error updating content:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: form.key,
          value: form.value,
          valueAr: form.valueAr || undefined,
          type: form.type,
          page: form.page || undefined,
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        fetchContent();
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء إضافة المحتوى');
      }
    } catch (error) {
      console.error('Error adding content:', error);
    } finally {
      setSaving(false);
    }
  };

  // Filter by search
  const filteredContent = content.filter((item) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.key.toLowerCase().includes(searchLower) ||
      item.value.toLowerCase().includes(searchLower) ||
      (item.valueAr && item.valueAr.toLowerCase().includes(searchLower))
    );
  });

  const getTypeBadge = (type: string) => {
    const Icon = typeIcons[type] || Type;
    return (
      <Badge
        variant="outline"
        className="text-[11px] gap-1"
      >
        <Icon className="size-2.5" />
        {typeLabels[type] || type}
      </Badge>
    );
  };

  const getPageBadge = (page: string | null) => {
    if (!page) return <span className="text-xs text-muted-foreground">عام</span>;
    return (
      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[11px]">
        <Globe className="size-2.5 ml-0.5" />
        {pageLabels[page] || page}
      </Badge>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-slate-600/10">
            <FileText className="size-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">إدارة المحتوى</h1>
            <p className="text-sm text-muted-foreground">
              تعديل محتوى صفحات الموقع والنصوص
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContent}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" />
            تحديث
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            className="gap-1.5 text-xs bg-slate-600 hover:bg-slate-700"
          >
            <Plus className="size-3.5" />
            إضافة محتوى
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالمفتاح أو القيمة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 h-9 text-sm"
              />
            </div>
            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                <Filter className="size-3.5 ml-1.5 text-muted-foreground" />
                <SelectValue placeholder="الصفحة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الصفحات</SelectItem>
                <SelectItem value="home">الرئيسية</SelectItem>
                <SelectItem value="about">من نحن</SelectItem>
                <SelectItem value="pricing">الأسعار</SelectItem>
                <SelectItem value="contact">تواصل معنا</SelectItem>
                <SelectItem value="login">تسجيل الدخول</SelectItem>
                <SelectItem value="register">التسجيل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold">المفتاح</TableHead>
                  <TableHead className="text-xs font-semibold">القيمة (عربي)</TableHead>
                  <TableHead className="text-xs font-semibold">النوع</TableHead>
                  <TableHead className="text-xs font-semibold">الصفحة</TableHead>
                  <TableHead className="text-xs font-semibold text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredContent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <FileText className="size-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">
                        لا يوجد محتوى مطابق
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContent.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {item.key}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <p className="text-sm truncate">
                          {item.valueAr || item.value}
                        </p>
                        {item.valueAr && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.value}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(item.type)}</TableCell>
                      <TableCell>{getPageBadge(item.page)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredContent.length > 0 && (
            <div className="p-4 border-t">
              <p className="text-xs text-muted-foreground">
                {filteredContent.length} عنصر محتوى
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Content Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-4 text-slate-600" />
              تعديل المحتوى
            </DialogTitle>
            <DialogDescription>
              تعديل محتوى العنصر &quot;{editingItem?.key}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">المفتاح</Label>
              <Input value={form.key} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">القيمة (بالعربية)</Label>
              {form.type === 'html' || form.type === 'json' ? (
                <Textarea
                  value={form.valueAr}
                  onChange={(e) =>
                    setForm({ ...form, valueAr: e.target.value })
                  }
                  rows={5}
                  className="text-sm font-mono"
                  dir={form.type === 'json' ? 'ltr' : 'rtl'}
                />
              ) : (
                <Input
                  value={form.valueAr}
                  onChange={(e) =>
                    setForm({ ...form, valueAr: e.target.value })
                  }
                />
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">القيمة (بالإنجليزية)</Label>
              {form.type === 'html' || form.type === 'json' ? (
                <Textarea
                  value={form.value}
                  onChange={(e) =>
                    setForm({ ...form, value: e.target.value })
                  }
                  rows={5}
                  className="text-sm font-mono"
                  dir="ltr"
                />
              ) : (
                <Input
                  value={form.value}
                  onChange={(e) =>
                    setForm({ ...form, value: e.target.value })
                  }
                  dir="ltr"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">النوع</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">نص</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="image">صورة</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">الصفحة</Label>
                <Select
                  value={form.page || '_none'}
                  onValueChange={(value) =>
                    setForm({ ...form, page: value === '_none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">عام</SelectItem>
                    <SelectItem value="home">الرئيسية</SelectItem>
                    <SelectItem value="about">من نحن</SelectItem>
                    <SelectItem value="pricing">الأسعار</SelectItem>
                    <SelectItem value="contact">تواصل معنا</SelectItem>
                    <SelectItem value="login">تسجيل الدخول</SelectItem>
                    <SelectItem value="register">التسجيل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="text-xs bg-slate-600 hover:bg-slate-700"
            >
              <Save className="size-3.5 ml-1" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Content Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-slate-600" />
              إضافة محتوى جديد
            </DialogTitle>
            <DialogDescription>
              أضف عنصر محتوى جديد لاستخدامه في الموقع
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">المفتاح</Label>
              <Input
                placeholder="مثال: home_hero_title"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                dir="ltr"
              />
              <p className="text-[11px] text-muted-foreground">
                استخدم تنسيق: page_section_element
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">القيمة (بالعربية)</Label>
              <Input
                value={form.valueAr}
                onChange={(e) =>
                  setForm({ ...form, valueAr: e.target.value })
                }
                placeholder="القيمة باللغة العربية"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">القيمة (بالإنجليزية)</Label>
              <Input
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="Value in English"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">النوع</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">نص</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="image">صورة</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">الصفحة</Label>
                <Select
                  value={form.page || '_none'}
                  onValueChange={(value) =>
                    setForm({ ...form, page: value === '_none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">عام</SelectItem>
                    <SelectItem value="home">الرئيسية</SelectItem>
                    <SelectItem value="about">من نحن</SelectItem>
                    <SelectItem value="pricing">الأسعار</SelectItem>
                    <SelectItem value="contact">تواصل معنا</SelectItem>
                    <SelectItem value="login">تسجيل الدخول</SelectItem>
                    <SelectItem value="register">التسجيل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveAdd}
              disabled={saving || !form.key || !form.value}
              className="text-xs bg-slate-600 hover:bg-slate-700"
            >
              <Plus className="size-3.5 ml-1" />
              {saving ? 'جارٍ الإضافة...' : 'إضافة المحتوى'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
