import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
      <p className="text-sm text-muted-foreground">جارٍ تحميل لوحة الإدارة...</p>
    </div>
  );
}
