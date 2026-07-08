export interface LandingItem {
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
  createdAt?: string;
  updatedAt?: string;
}

export interface LandingSection {
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
  items: LandingItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteSettings {
  [key: string]: string;
}

export interface LandingPageSection {
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
  createdAt?: string;
  updatedAt?: string;
  items: LandingPageItem[];
}

export interface LandingPageItem {
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
  createdAt?: string;
  updatedAt?: string;
}
