'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-lg font-semibold mb-2">حدث خطأ في لوحة التحكم</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {error.message || 'تعذر تحميل الصفحة. يمكنك المحاولة مرة أخرى.'}
      </p>
      <Button onClick={reset} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        إعادة المحاولة
      </Button>
    </div>
  );
}
