import { Loader2 } from 'lucide-react';

export default function AuthLoading() {
  return (
    <div className="text-center p-6">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3 mx-auto" />
      <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
    </div>
  );
}
