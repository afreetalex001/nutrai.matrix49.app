'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="text-center p-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-lg font-semibold mb-2">حدث خطأ</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6 mx-auto">
        {error.message || 'تعذر تحميل الصفحة. يمكنك المحاولة مرة أخرى.'}
      </p>
      <Button onClick={reset} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        إعادة المحاولة
      </Button>
    </div>
  );
}
