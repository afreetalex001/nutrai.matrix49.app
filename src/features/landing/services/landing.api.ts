import { apiClient } from '@/lib/api-client';
import type { LandingSection, SiteSettings } from '@/types';

export function getLandingData() {
  return apiClient.get<{ sections: LandingSection[]; settings: SiteSettings }>('/api/landing');
}
