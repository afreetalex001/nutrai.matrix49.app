'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Search, Plus, Trash2, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';

interface FoodItem {
  id: string;
  nameAr: string;
  category: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatsPer100: number;
  notes?: string;
  createdById?: string | null;
}

export default function FoodsPage() {
  const { token, user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [listName, setListName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editFood, setEditFood] = useState<FoodItem | null>(null);

  useEffect(() => {
    if (token) loadFoods();
  }, [token]);

  const loadFoods = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/foods?limit=2000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFoods(data.foods);
        setSelectedIds(new Set());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (listName) formData.append('listName', listName);

    try {
      const res = await fetch('/api/foods/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        loadFoods();
      } else {
        toast.error(data.error || 'فشل استيراد الملف');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الاستيراد');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteFood = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    try {
      const res = await fetch(`/api/foods/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('تم الحذف بنجاح');
        setFoods(foods.filter(f => f.id !== id));
      } else {
        toast.error('لا تملك صلاحية حذف هذا الصنف (صنف عام للادمن)');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} صنف محدد؟`)) return;
    try {
      const res = await fetch('/api/foods/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        toast.success('تم حذف الأصناف بنجاح');
        loadFoods();
      } else {
        toast.error('حدث خطأ أثناء الحذف');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('تحذير: هل أنت متأكد من حذف جـمـيـع الأصناف المسموح لك بحذفها؟ (لا يمكن التراجع)')) return;
    try {
      const res = await fetch('/api/foods/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deleteAll: true })
      });
      if (res.ok) {
        toast.success('تم مسح الأصناف بنجاح');
        loadFoods();
      } else {
        toast.error('حدث خطأ');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const saveEdit = async () => {
    if (!editFood) return;
    try {
      const res = await fetch(`/api/foods/${editFood.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editFood)
      });
      if (res.ok) {
        toast.success('تم تعديل الصنف بنجاح');
        setEditFood(null);
        loadFoods();
      } else {
        toast.error('لا تملك صلاحية تعديل هذا الصنف');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التعديل');
    }
  };

  const filteredFoods = foods.filter(f => 
    f.nameAr.includes(search) || 
    (f.notes && f.notes.includes(search))
  );

  const deletableFoods = filteredFoods.filter(f => user?.role === 'admin' || f.createdById === user?.id);
  const allSelected = deletableFoods.length > 0 && deletableFoods.every(f => selectedIds.has(f.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletableFoods.map(f => f.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إدارة قوائم الطعام</h1>
        <p className="text-muted-foreground mt-1">قم برفع وتعديل أصناف الطعام التي تظهر لك في منشئ الخطط.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>استيراد قائمة جديدة (Excel)</CardTitle>
          <CardDescription>
            ارفع ملف Excel. سيتم <strong>دمج الأصناف المكررة تلقائياً</strong> (لن يتم التكرار إذا كان الاسم موجوداً).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label>اسم القائمة (اختياري - سيظهر كملاحظة)</Label>
              <Input 
                placeholder="مثال: أطعمة الكيتو، قائمة شهر مايو..." 
                value={listName} 
                onChange={e => setListName(e.target.value)} 
              />
            </div>
            <div className="flex-1 space-y-2 w-full">
              <Label>ملف Excel (.xlsx)</Label>
              <Input 
                type="file" 
                accept=".xlsx" 
                ref={fileInputRef} 
                onChange={handleUpload} 
                disabled={uploading}
              />
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <a href="/foods-template.xlsx" download>
                <Download className="size-4 ml-2" />
                تحميل النموذج
              </a>
            </Button>
          </div>
          {uploading && <p className="text-sm text-blue-600">جاري الاستيراد وفحص التكرارات... يرجى الانتظار</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
            <CardTitle>الأصناف المتاحة لك</CardTitle>
            
            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64 min-w-[200px]">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="ابحث عن صنف أو قائمة..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-8"
                />
              </div>

              {selectedIds.size > 0 && (
                <Button variant="destructive" onClick={handleBulkDelete} className="whitespace-nowrap">
                  <Trash2 className="size-4 ml-1" />
                  حذف المحدد ({selectedIds.size})
                </Button>
              )}
              
              {foods.length > 0 && (
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDeleteAll}>
                  <Trash className="size-4 ml-1" />
                  حذف الكل
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4 text-muted-foreground">جاري التحميل...</p>
          ) : filteredFoods.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">لا توجد أصناف تطابق بحثك</p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="size-4 rounded border-gray-300"
                        checked={allSelected} 
                        onChange={toggleSelectAll} 
                      />
                    </th>
                    <th className="p-3 font-medium">الاسم</th>
                    <th className="p-3 font-medium">التصنيف</th>
                    <th className="p-3 font-medium">السعرات (100g)</th>
                    <th className="p-3 font-medium">P / C / F</th>
                    <th className="p-3 font-medium w-1/4">ملاحظات</th>
                    <th className="p-3 font-medium text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredFoods.map(food => {
                    const canEditDelete = user?.role === 'admin' || food.createdById === user?.id;
                    return (
                      <tr key={food.id} className="hover:bg-muted/30">
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox" 
                            className="size-4 rounded border-gray-300"
                            checked={selectedIds.has(food.id)} 
                            onChange={() => toggleSelect(food.id)}
                            disabled={!canEditDelete}
                            title={!canEditDelete ? 'لا يمكنك تحديد صنف عام' : ''}
                          />
                        </td>
                        <td className="p-3 font-medium">{food.nameAr}</td>
                        <td className="p-3 text-muted-foreground">{food.category}</td>
                        <td className="p-3">{food.caloriesPer100} kcal</td>
                        <td className="p-3" dir="ltr">
                          {food.proteinPer100} / {food.carbsPer100} / {food.fatsPer100}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{food.notes}</td>
                        <td className="p-3 text-left">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-blue-500 hover:bg-blue-50" 
                              onClick={() => setEditFood(food)} 
                              disabled={!canEditDelete}
                              title={!canEditDelete ? 'لا يمكنك تعديل صنف عام' : 'تعديل الصنف'}
                            >
                              <Edit className="size-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-red-500 hover:bg-red-50 hover:text-red-600" 
                              onClick={() => deleteFood(food.id)} 
                              disabled={!canEditDelete}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة التعديل */}
      <Dialog open={!!editFood} onOpenChange={(o) => !o && setEditFood(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل الصنف</DialogTitle>
          </DialogHeader>
          {editFood && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الصنف</Label>
                  <Input 
                    value={editFood.nameAr} 
                    onChange={e => setEditFood({...editFood, nameAr: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>التصنيف</Label>
                  <Input 
                    value={editFood.category} 
                    onChange={e => setEditFood({...editFood, category: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>السعرات (لكل 100g)</Label>
                  <Input 
                    type="number" 
                    value={editFood.caloriesPer100} 
                    onChange={e => setEditFood({...editFood, caloriesPer100: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>البروتين (g)</Label>
                  <Input 
                    type="number" 
                    value={editFood.proteinPer100} 
                    onChange={e => setEditFood({...editFood, proteinPer100: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الكارب (g)</Label>
                  <Input 
                    type="number" 
                    value={editFood.carbsPer100} 
                    onChange={e => setEditFood({...editFood, carbsPer100: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>الدهون (g)</Label>
                  <Input 
                    type="number" 
                    value={editFood.fatsPer100} 
                    onChange={e => setEditFood({...editFood, fatsPer100: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>ملاحظات (يظهر بها اسم القائمة)</Label>
                <Input 
                  value={editFood.notes || ''} 
                  onChange={e => setEditFood({...editFood, notes: e.target.value})} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFood(null)}>إلغاء</Button>
            <Button onClick={saveEdit}>حفظ التعديلات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
