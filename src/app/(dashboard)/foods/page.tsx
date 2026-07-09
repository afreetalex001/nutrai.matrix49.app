'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, Search, Plus, Trash2 } from 'lucide-react';
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
}

export default function FoodsPage() {
  const { token, user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [listName, setListName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) loadFoods();
  }, [token]);

  const loadFoods = async () => {
    setLoading(true);
    try {
      // Admin sees global, Doctor sees global + their own custom
      const res = await fetch('/api/foods?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFoods(data.foods);
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
        headers: {
          Authorization: `Bearer ${token}`
        },
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
        toast.error('لا تملك صلاحية حذف هذا الصنف (قد يكون صنف عام)');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const filteredFoods = foods.filter(f => 
    f.nameAr.includes(search) || 
    (f.notes && f.notes.includes(search))
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إدارة قوائم الطعام</h1>
        <p className="text-muted-foreground mt-1">قم برفع وتعديل أصناف الطعام التي تظهر لك في منشئ الخطط.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>استيراد قائمة جديدة (Excel)</CardTitle>
          <CardDescription>ارفع ملف Excel يحتوي على الأصناف ليتم إضافتها لقاعدة البيانات الخاصة بك.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label>اسم القائمة (اختياري)</Label>
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
                تحميل النموذج (Template)
              </a>
            </Button>
          </div>
          {uploading && <p className="text-sm text-blue-600">جاري الاستيراد... يرجى الانتظار</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>الأصناف المتاحة لك</CardTitle>
            <div className="relative w-64">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث عن صنف أو اسم قائمة..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-8"
              />
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
                    <th className="p-3 font-medium">الاسم</th>
                    <th className="p-3 font-medium">التصنيف</th>
                    <th className="p-3 font-medium">السعرات</th>
                    <th className="p-3 font-medium">بروتين / كارب / دهون</th>
                    <th className="p-3 font-medium w-1/3">ملاحظات (اسم القائمة)</th>
                    <th className="p-3 font-medium text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredFoods.map(food => (
                    <tr key={food.id} className="hover:bg-muted/30">
                      <td className="p-3">{food.nameAr}</td>
                      <td className="p-3">{food.category}</td>
                      <td className="p-3">{food.caloriesPer100} kcal</td>
                      <td className="p-3" dir="ltr">
                        P: {food.proteinPer100}g | C: {food.carbsPer100}g | F: {food.fatsPer100}g
                      </td>
                      <td className="p-3 text-muted-foreground">{food.notes}</td>
                      <td className="p-3 text-left">
                        <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteFood(food.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
