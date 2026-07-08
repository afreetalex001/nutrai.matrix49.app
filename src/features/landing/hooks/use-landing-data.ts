'use client';

import { useEffect, useState, useCallback } from 'react';
import { getLandingData } from '@/features/landing/services/landing.api';
import type { LandingSection, SiteSettings } from '@/types';

export function useLandingData() {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLandingData();
      setSections(data.sections as LandingSection[]);
      setSettings(data.settings as SiteSettings);
    } catch (err) {
      setError('تعذر تحميل محتوى الصفحة الرئيسية');
      console.error('Landing load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sections, settings, loading, error, refresh, setSections, setSettings };
}
