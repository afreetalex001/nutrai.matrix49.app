'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/auth-store';
import {
  Leaf, Users, Bot, ClipboardList, Dumbbell, BarChart3, Shield,
  Star, CheckCircle2, ChevronDown, Menu, X, ArrowLeft, Sparkles,
  Heart, Activity, Apple, Smartphone, MessageCircle, TrendingUp,
  Globe, Mail, Copyright, UserCircle2, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ==================== أيقونات ديناميكية ====================
const ICON_MAP: Record<string, React.ElementType> = {
  Users, Bot, ClipboardList, Dumbbell, BarChart3, Shield, Heart,
  Activity, Apple, Smartphone, Sparkles, TrendingUp, Star, Globe,
  Mail, MessageCircle, Leaf, CheckCircle2,
};

// ==================== أنواع بيانات CMS ====================
interface LandingItem {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  iconName: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
}

interface LandingSection {
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
}

interface SiteSettings {
  [key: string]: string;
}

// ==================== البيانات الافتراضية (احتياطية) ====================
const DEFAULT_FEATURES = [
  { icon: Users, title: 'إدارة المرضى المتكاملة', desc: 'ملفات مرضى شاملة مع بيانات InBody، التاريخ الطبي، ومؤشرات الجسم. تتبع كل مريض من أول زيارة حتى الوصول للهدف.' },
  { icon: Bot, title: 'مساعد ذكي بالذكاء الاصطناعي', desc: 'مساعد طبي مدعوم بالذكاء الاصطناعي يساعدك في وضع خطط التغذية والتمارين بذكاء. يدعم عدة مزودي AI مع نظام احتياطي تلقائي.' },
  { icon: ClipboardList, title: 'خطط التغذية الذكية', desc: 'حساب تلقائي للمكرونات (بروتين، كربوهيدرات، دهون) بناءً على BMR و TDEE. خطط أسبوعية تتكيف مع تقدم المريض.' },
  { icon: Dumbbell, title: 'خطط التمارين الرياضية', desc: 'أنشئ خطط تمارين مخصصة لكل مريض بناءً على حالته البدنية وأهدافه. تكامل كامل مع خطط التغذية لنتائج أفضل.' },
  { icon: BarChart3, title: 'تقارير وإحصائيات متقدمة', desc: 'لوحة تحكم تفاعلية مع إحصائيات شاملة. تتبع تقدم المرضى، معدل النجاح، وأداء العيادة بشكل لحظي.' },
  { icon: Shield, title: 'حماية وأمان متقدم', desc: 'تشفير كامل للبيانات مع Prepared Statements لحماية من SQL Injection. نظام صلاحيات متعدد المستويات.' },
];

const DEFAULT_STEPS = [
  { num: '١', title: 'سجّل حسابك', desc: 'أنشئ حسابك في أقل من دقيقة. ستحتاج فقط لاسمك وبريدك الإلكتروني.', icon: Smartphone },
  { num: '٢', title: 'أضف مرضاك', desc: 'سجّل بيانات المرضى الأولية والقياسات الجسدية وبيانات InBody.', icon: Users },
  { num: '٣', title: 'استخدم المساعد الذكي', desc: 'دع الذكاء الاصطناعي يساعدك في وضع الخطط الغذائية والرياضية المثلى.', icon: Sparkles },
  { num: '٤', title: 'تتبع التقدم', desc: 'تابع تحسن مرضاك وزياداتهم وقم بتعديل الخطط تلقائياً بناءً على النتائج.', icon: TrendingUp },
];

const DEFAULT_STATS = [
  { val: '+2,450', label: 'طبيب نشط', icon: Heart },
  { val: '+25,000', label: 'مريض مسجل', icon: Users },
  { val: '+15,000', label: 'خطة ذكية', icon: Sparkles },
  { val: '99.9%', label: 'وقت التشغيل', icon: Activity },
];

const DEFAULT_TESTIMONIALS = [
  { name: 'د. سارة أحمد', role: 'أخصائية تغذية علاجية', text: 'NutriClinic غيّر طريقة عملي بالكامل. المساعد الذكي يوفر عليّ ساعات في إعداد الخطط الغذائية، وأصبحت قادرة على متابعة المزيد من المرضى بجودة أعلى.', rating: 5 },
  { name: 'د. محمد العلي', role: 'استشاري السمنة والنحافة', text: 'أفضل منصة استخدمتها لإدارة العيادة. نظام المكرونات التلقائي دقيق جداً، والتقارير تساعدني في تقييم فعالية العلاج لكل مريض.', rating: 5 },
  { name: 'د. نورة الخالد', role: 'أخصائية تغذية رياضية', text: 'تكامل خطط التغذية مع خطط التمارين جعل حياتي أسهل كثيراً. المرضى سعداء بالنتائج وأنا سعيدة بالسهولة.', rating: 5 },
];

const DEFAULT_FAQS = [
  { q: 'هل يمكنني تجربة المنصة مجاناً؟', a: 'نعم! يمكنك التسجيل والبدء في استخدام المنصة مباشرة. نوفر فترة تجريبية تتيح لك استكشاف جميع المميزات قبل الاشتراك.' },
  { q: 'هل بيانات مرضاي آمنة؟', a: 'بالتأكيد. نستخدم أحدث تقنيات التشفير وحماية البيانات. جميع الاستعلامات محمية بـ Prepared Statements لمنع أي اختراق، وبياناتك مشفرة أثناء النقل والتخزين.' },
  { q: 'هل يمكنني إلغاء اشتراكي في أي وقت؟', a: 'نعم، يمكنك إلغاء اشتراكك في أي وقت بدون أي رسوم إضافية. ستظل بياناتك محفوظة لمدة 30 يوماً بعد الإلغاء.' },
  { q: 'كيف يعمل المساعد الذكي؟', a: 'المساعد الذكي يستخدم نماذج ذكاء اصطناعي متقدمة من عدة مزودين (OpenAI, Gemini, Claude) مع نظام احتياطي تلقائي. يمكنك من خلاله إنشاء خطط تغذية وتمارين بضغطة زر.' },
  { q: 'هل المنصة متوافقة مع الهواتف؟', a: 'نعم، المنصة مصممة لتعمل بكفاءة على جميع الأجهزة - الحاسوب والتابلت والهاتف. واجهة متجاوبة بالكامل تضمن تجربة ممتازة على أي شاشة.' },
];

/* ───────── Animated Section Wrapper ───────── */
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{ duration: 0.6, delay, ease: 'easeOut' }} className={className}>
      {children}
    </motion.div>
  );
}

/* ───────── Pricing Card ───────── */
function PricingCard({ plan, isPopular }: { plan: { nameAr: string; price: number; currency: string; durationDays: number; features: string[] }; isPopular: boolean }) {
  const periodLabel = plan.durationDays >= 365 ? 'سنوياً' : 'شهرياً';
  const monthlyEquiv = plan.durationDays >= 365 ? Math.round(plan.price / 12) : null;
  return (
    <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <Card className={`relative overflow-hidden h-full flex flex-col ${isPopular ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/20' : 'border border-border'}`}>
        {isPopular && <div className="absolute top-0 right-0 left-0 bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-center py-2 text-sm font-bold">الأكثر طلباً</div>}
        <CardHeader className={`pt-8 pb-4 text-center ${isPopular ? 'pt-14' : ''}`}>
          <h3 className="text-2xl font-bold">{plan.nameAr}</h3>
          <div className="mt-4">
            <span className="text-5xl font-black text-emerald-600">{plan.price}</span>
            <span className="text-lg text-muted-foreground mr-1">{plan.currency}</span>
            <span className="text-muted-foreground"> / {periodLabel}</span>
          </div>
          {monthlyEquiv && <p className="text-sm text-muted-foreground mt-1">أي ما يعادل {monthlyEquiv} {plan.currency} شهرياً — وفّر 17%</p>}
        </CardHeader>
        <CardContent className="flex-1 px-6">
          <ul className="space-y-3">
            {plan.features.map((f, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /><span className="text-sm">{f}</span></li>))}
          </ul>
        </CardContent>
        <CardFooter className="p-6">
          <Button className={`w-full text-lg py-6 ${isPopular ? 'bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30' : ''}`} variant={isPopular ? 'default' : 'outline'} onClick={() => (window.location.href = '/register')}>ابدأ الآن</Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

/* ───────── FAQ Item ───────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button className="w-full flex items-center justify-between py-5 text-right" onClick={() => setOpen(!open)}>
        <span className="text-lg font-semibold">{q}</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 shrink-0 mr-4 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>{open && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden"><p className="text-muted-foreground pb-5 leading-relaxed">{a}</p></motion.div>)}</AnimatePresence>
    </div>
  );
}

/* ───────── Main Landing Page ───────── */
export default function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [plans, setPlans] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cmsSections, setCmsSections] = useState<LandingSection[]>([]);
  const [cmsSettings, setCmsSettings] = useState<SiteSettings>({});

  // جلب البيانات من CMS
  useEffect(() => {
    fetch('/api/landing')
      .then((r) => r.json())
      .then((data) => {
        if (data.sections?.length) setCmsSections(data.sections);
        if (data.settings) setCmsSettings(data.settings);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => { if (data.plans?.length) setPlans(data.plans); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ==================== دوال مساعدة CMS ====================
  const getSection = (key: string) => cmsSections.find((s) => s.sectionKey === key);
  const isSectionVisible = (key: string) => {
    const section = getSection(key);
    return section ? section.isVisible : true; // افتراضي: ظاهر
  };
  const getItems = (key: string) => {
    const section = getSection(key);
    return section?.items?.filter((i) => i.isVisible) || [];
  };

  const siteName = cmsSettings.site_name_ar || cmsSettings.site_name || 'NutriClinic';
  const siteLogo = cmsSettings.site_logo_url || '';
  const copyrightText = cmsSettings.site_copyright_ar || cmsSettings.site_copyright || '© 2024 NutriClinic. جميع الحقوق محفوظة.';
  const freeTrialEnabled = cmsSettings.free_trial_enabled !== 'false';
  const freeTrialDays = cmsSettings.free_trial_days || '14';

  const displayPlans = plans.length > 0 ? plans : [
    { nameAr: 'الاشتراك الشهري', price: 299, currency: 'EGP', durationDays: 30, features: ['عدد غير محدود من المرضى', 'المساعد الذكي بالذكاء الاصطناعي', 'خطط التغذية والتمارين', 'التقارير والإحصائيات', 'حساب المكرونات التلقائي', 'الدعم الفني'] },
    { nameAr: 'الاشتراك السنوي', price: 2999, currency: 'EGP', durationDays: 365, features: ['جميع مميزات الاشتراك الشهري', 'دعم فني أولوية', 'خصم 17% مقارنة بالشهري', 'تحديثات ومميزات حصرية', 'تقارير متقدمة', 'تصدير البيانات'] },
  ];

  const navCta = isAuthenticated()
    ? user?.role === 'admin' ? { label: 'لوحة الإدارة', href: '/admin' } : { label: 'لوحة التحكم', href: '/dashboard' }
    : freeTrialEnabled ? { label: 'ابدأ مجاناً', href: '/register' } : { label: 'سجّل الآن', href: '/register' };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/90 backdrop-blur-lg shadow-sm border-b border-border' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <a href="/" className="flex items-center gap-2">
              {siteLogo ? (
                <img src={siteLogo} alt={siteName} className="h-8 w-auto" />
              ) : (
                <>
                  <div className="bg-gradient-to-bl from-emerald-600 to-teal-600 p-2 rounded-xl"><Leaf className="h-6 w-6 text-white" /></div>
                </>
              )}
              <span className="text-xl font-black bg-gradient-to-l from-emerald-600 to-teal-600 bg-clip-text text-transparent">{siteName}</span>
            </a>
            <div className="hidden md:flex items-center gap-8">
              {isSectionVisible('features') && <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">المميزات</a>}
              {isSectionVisible('how_it_works') && <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">كيف تعمل</a>}
              {isSectionVisible('pricing') && <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">الأسعار</a>}
              {isSectionVisible('testimonials') && <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">آراء العملاء</a>}
              {isSectionVisible('faq') && <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">الأسئلة الشائعة</a>}
            </div>
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated() ? (
                <Button onClick={() => router.push(navCta.href)} className="bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20">{navCta.label}</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => router.push('/portal')} className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                    <UserCircle2 className="size-4" />
                    دخول المريض
                  </Button>
                  <Button variant="ghost" onClick={() => router.push('/login')}>دخول الطبيب</Button>
                  <Button onClick={() => router.push('/register')} className="bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20">{navCta.label}</Button>
                </>
              )}
            </div>
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        <AnimatePresence>{mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-background/95 backdrop-blur-lg border-b border-border">
            <div className="px-4 py-4 space-y-3">
              {isSectionVisible('features') && <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">المميزات</a>}
              {isSectionVisible('how_it_works') && <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">كيف تعمل</a>}
              {isSectionVisible('pricing') && <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">الأسعار</a>}
              {isSectionVisible('testimonials') && <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">آراء العملاء</a>}
              {isSectionVisible('faq') && <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">الأسئلة الشائعة</a>}
              <div className="pt-3 border-t border-border space-y-2">
                {isAuthenticated() ? (
                  <Button className="w-full bg-gradient-to-l from-emerald-600 to-teal-600 text-white" onClick={() => router.push(navCta.href)}>{navCta.label}</Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full gap-1 border-emerald-300 text-emerald-700"
                      onClick={() => { router.push('/portal'); setMobileMenuOpen(false); }}
                    >
                      <UserCircle2 className="size-4" />
                      دخول المريض بالتوكن
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { router.push('/login'); setMobileMenuOpen(false); }}>دخول الطبيب</Button>
                      <Button className="flex-1 bg-gradient-to-l from-emerald-600 to-teal-600 text-white" onClick={() => { router.push('/register'); setMobileMenuOpen(false); }}>تسجيل</Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}</AnimatePresence>
      </nav>

      {/* ─── Hero Section ─── */}
      {isSectionVisible('hero') && (() => {
        const hero = getSection('hero');
        return (
          <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl" />
              <div className="absolute bottom-10 left-10 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-300/5 rounded-full blur-3xl" />
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}>
                  <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm bg-emerald-50 text-emerald-700 border-emerald-200"><Sparkles className="h-4 w-4 ml-2" />مدعوم بالذكاء الاصطناعي</Badge>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
                    {hero?.titleAr || 'أدر عيادة التغذية'}
                    <br />
                    <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                      {hero?.subtitleAr || 'بذكاء و سهولة'}
                    </span>
                  </h1>
                  <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
                    {hero?.contentAr || 'منصة متكاملة لإدارة عيادات التغذية مدعومة بالذكاء الاصطناعي. أدر مرضاك، خطط التغذية والتمارين، وتابع التقدم — كل ذلك من مكان واحد.'}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    {isAuthenticated() ? (
                      <Button size="lg" className="text-lg px-8 py-7 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/25" onClick={() => router.push(navCta.href)}>{navCta.label}<ArrowLeft className="mr-2 h-5 w-5" /></Button>
                    ) : (
                      <>
                        <Button size="lg" className="text-lg px-8 py-7 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/25" onClick={() => router.push('/register')}>{navCta.label}<ArrowLeft className="mr-2 h-5 w-5" /></Button>
                        <Button size="lg" variant="outline" className="text-lg px-8 py-7" onClick={() => router.push('/login')}>تسجيل دخول الطبيب</Button>
                      </>
                    )}
                  </div>

                  {/* بطاقة بارزة لدخول المريض */}
                  {!isAuthenticated() && (
                    <button
                      onClick={() => router.push('/portal')}
                      className="mt-6 w-full sm:w-auto flex items-center gap-3 p-4 bg-white border-2 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-2xl text-right transition-all shadow-sm hover:shadow-md group"
                    >
                      <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <KeyRound className="size-6 text-emerald-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base text-emerald-900">أنت مريض؟</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          ادخل برابط المتابعة من طبيبك
                        </p>
                      </div>
                      <ArrowLeft className="size-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                  {freeTrialEnabled && (
                    <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />لا حاجة لبطاقة ائتمان</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />إعداد في دقيقة</div>
                    </div>
                  )}
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }} className="relative">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-border">
                    <Image src={hero?.imageUrl || '/hero-dashboard.webp'} alt="لوحة تحكم NutriClinic" width={1344} height={768} className="w-full h-auto" priority sizes="(max-width: 1024px) 100vw, 50vw" />
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─── Stats Bar ─── */}
      {isSectionVisible('stats') && (() => {
        const statsItems = getItems('stats');
        const displayStats = statsItems.length > 0
          ? statsItems.map((item) => ({ val: item.description || '', label: item.titleAr || item.title, icon: ICON_MAP[item.iconName || ''] || Activity }))
          : DEFAULT_STATS;
        return (
          <section className="py-12 bg-gradient-to-l from-emerald-600 to-teal-600 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
                {displayStats.map((s, i) => (
                  <AnimatedSection key={i} delay={i * 0.1}>
                    <div className="flex flex-col items-center"><s.icon className="h-8 w-8 mb-3 opacity-80" /><p className="text-3xl sm:text-4xl font-black">{s.val}</p><p className="text-sm opacity-80 mt-1">{s.label}</p></div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─── Features ─── */}
      {isSectionVisible('features') && (() => {
        const featureSection = getSection('features');
        const featureItems = getItems('features');
        const displayFeatures = featureItems.length > 0
          ? featureItems.map((item) => ({ icon: ICON_MAP[item.iconName || ''] || Shield, title: item.titleAr || item.title, desc: item.descriptionAr || item.description || '' }))
          : DEFAULT_FEATURES;
        return (
          <section id="features" className="py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
                <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">المميزات</Badge>
                <h2 className="text-3xl sm:text-4xl font-black">كل ما يحتاجه <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">{featureSection?.subtitleAr || 'طبيب التغذية'}</span></h2>
                <p className="mt-4 text-lg text-muted-foreground">أدوات متكاملة ومتقدمة تجعل إدارة عيادتك أسهل وأكثر احترافية</p>
              </AnimatedSection>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayFeatures.map((f, i) => (
                  <AnimatedSection key={i} delay={i * 0.08}>
                    <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Card className="h-full border-border/50 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                        <CardContent className="pt-8">
                          <div className="bg-gradient-to-bl from-emerald-500 to-teal-500 w-14 h-14 rounded-xl flex items-center justify-center mb-5"><f.icon className="h-7 w-7 text-white" /></div>
                          <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─── AI Showcase ─── */}
      {isSectionVisible('ai_showcase') && (() => {
        const aiSection = getSection('ai_showcase');
        const aiItems = getItems('ai_showcase');
        return (
          <section className="py-20 sm:py-28 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <AnimatedSection>
                  <div className="rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-border">
                    <Image src={aiSection?.imageUrl || '/hero-ai.webp'} alt="المساعد الذكي" width={1024} height={1024} className="w-full h-auto" sizes="(max-width: 1024px) 100vw, 50vw" />
                  </div>
                </AnimatedSection>
                <AnimatedSection delay={0.2}>
                  <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200"><Bot className="h-4 w-4 ml-2" />الذكاء الاصطناعي</Badge>
                  <h2 className="text-3xl sm:text-4xl font-black leading-tight">{aiSection?.titleAr || 'مساعد ذكي يفهم احتياجات'}<br /><span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">{aiSection?.subtitleAr || 'كل مريض'}</span></h2>
                  <p className="mt-6 text-lg text-muted-foreground leading-relaxed">{aiSection?.contentAr || 'المساعد الذكي في NutriClinic يستخدم أحدث نماذج الذكاء الاصطناعي من OpenAI و Gemini و Claude مع نظام احتياطي تلقائي يضمن عدم توقف الخدمة.'}</p>
                  {aiItems.length > 0 && (
                    <ul className="mt-8 space-y-4">
                      {aiItems.map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-full"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                          <span className="text-foreground">{item.titleAr || item.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </AnimatedSection>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─── How It Works ─── */}
      {isSectionVisible('how_it_works') && (() => {
        const howSection = getSection('how_it_works');
        const howItems = getItems('how_it_works');
        const displaySteps = howItems.length > 0
          ? howItems.map((item, i) => ({ num: `${i + 1}`, title: item.titleAr || item.title, desc: item.descriptionAr || item.description || '', icon: ICON_MAP[item.iconName || ''] || Smartphone }))
          : DEFAULT_STEPS;
        return (
          <section id="how-it-works" className="py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
                <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">خطوات بسيطة</Badge>
                <h2 className="text-3xl sm:text-4xl font-black">كيف تعمل <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">NutriClinic</span>؟</h2>
                <p className="mt-4 text-lg text-muted-foreground">{howSection?.subtitleAr || 'أربع خطوات فقط لبدء إدارة عيادتك بذكاء'}</p>
              </AnimatedSection>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {displaySteps.map((s, i) => (
                  <AnimatedSection key={i} delay={i * 0.12}>
                    <div className="text-center relative">
                      {i < displaySteps.length - 1 && <div className="hidden lg:block absolute top-10 left-0 w-full h-0.5 bg-gradient-to-l from-emerald-300 to-transparent -z-10" />}
                      <div className="bg-gradient-to-bl from-emerald-500 to-teal-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                        <span className="text-3xl font-black text-white">{['١','٢','٣','٤','٥','٦'][i] || i + 1}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─── Pricing ─── */}
      {isSectionVisible('pricing') && (() => {
        const pricingSection = getSection('pricing');
        return (
          <section id="pricing" className="py-20 sm:py-28 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
                <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">الأسعار</Badge>
                <h2 className="text-3xl sm:text-4xl font-black">خطط تناسب <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">احتياجاتك</span></h2>
                <p className="mt-4 text-lg text-muted-foreground">{pricingSection?.subtitleAr || 'اختر الخطة المناسبة لك وابدأ في تحسين إدارة عيادتك اليوم'}</p>
              </AnimatedSection>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {displayPlans.map((plan, i) => (<AnimatedSection key={i} delay={i * 0.15}><PricingCard plan={plan} isPopular={i === 1} /></AnimatedSection>))}
              </div>
              <AnimatedSection delay={0.3} className="text-center mt-10"><p className="text-muted-foreground">جميع الأسعار شاملة الضريبة. يمكنك الإلغاء في أي وقت.</p></AnimatedSection>
            </div>
          </section>
        );
      })()}

      {/* ─── Nutrition Showcase ─── */}
      {isSectionVisible('nutrition_showcase') && (() => {
        const nutriSection = getSection('nutrition_showcase');
        const nutriItems = getItems('nutrition_showcase');
        const displayNutriItems = nutriItems.length > 0
          ? nutriItems.map((item) => ({ icon: ICON_MAP[item.iconName || ''] || Activity, label: item.titleAr || item.title }))
          : [{ icon: Activity, label: 'حساب BMR/TDEE' }, { icon: ClipboardList, label: 'خطط أسبوعية' }, { icon: Dumbbell, label: 'خطط تمارين' }, { icon: BarChart3, label: 'تتبع التقدم' }];
        return (
          <section className="py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <AnimatedSection>
                  <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200"><Apple className="h-4 w-4 ml-2" />خطط التغذية</Badge>
                  <h2 className="text-3xl sm:text-4xl font-black leading-tight">{nutriSection?.titleAr || 'خطط تغذية دقيقة'}<br /><span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">{nutriSection?.subtitleAr || 'لكل مريض'}</span></h2>
                  <p className="mt-6 text-lg text-muted-foreground leading-relaxed">{nutriSection?.contentAr || 'نظام المكرونات التلقائي يحسب البروتين والكربوهيدرات والدهون بناءً على معدل الأيض الأساسي (BMR) ومستوى النشاط (TDEE). الخطط الأسبوعية تتكيف تلقائياً مع تقدم المريض وتحقيق أهدافه.'}</p>
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    {displayNutriItems.map((item, i) => (<div key={i} className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg"><item.icon className="h-5 w-5 text-emerald-600 shrink-0" /><span className="text-sm font-medium">{item.label}</span></div>))}
                  </div>
                </AnimatedSection>
                <AnimatedSection delay={0.2}>
                  <div className="rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-border">
                    <Image src={nutriSection?.imageUrl || '/hero-doctor.webp'} alt="طبيب يستخدم NutriClinic" width={864} height={1152} className="w-full h-auto max-h-[500px] object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                  </div>
                </AnimatedSection>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─── Testimonials ─── */}
      {isSectionVisible('testimonials') && (() => {
        const testSection = getSection('testimonials');
        const testItems = getItems('testimonials');
        const displayTestimonials = testItems.length > 0
          ? testItems.map((item) => ({ name: item.titleAr || item.title, role: item.linkUrl || '', text: item.descriptionAr || item.description || '', rating: 5 }))
          : DEFAULT_TESTIMONIALS;
        return (
          <section id="testimonials" className="py-20 sm:py-28 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
                <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">آراء العملاء</Badge>
                <h2 className="text-3xl sm:text-4xl font-black">ماذا يقول <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">أطباؤنا</span></h2>
              </AnimatedSection>
              <div className="grid md:grid-cols-3 gap-8">
                {displayTestimonials.map((t, i) => (
                  <AnimatedSection key={i} delay={i * 0.12}>
                    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Card className="h-full border-border/50">
                        <CardContent className="pt-8">
                          <div className="flex gap-1 mb-4">{Array.from({ length: t.rating }).map((_, j) => (<Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />))}</div>
                          <p className="text-foreground leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                          <div className="flex items-center gap-3 pt-4 border-t border-border">
                            <div className="bg-gradient-to-bl from-emerald-500 to-teal-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm">{t.name.charAt(0)}{t.name.split(' ')[1]?.charAt(0)}</div>
                            <div><p className="font-semibold text-sm">{t.name}</p><p className="text-xs text-muted-foreground">{t.role}</p></div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─── FAQ ─── */}
      {isSectionVisible('faq') && (() => {
        const faqItems = getItems('faq');
        const displayFaqs = faqItems.length > 0
          ? faqItems.map((item) => ({ q: item.titleAr || item.title, a: item.descriptionAr || item.description || '' }))
          : DEFAULT_FAQS;
        return (
          <section id="faq" className="py-20 sm:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <AnimatedSection className="text-center mb-12">
                <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">أسئلة شائعة</Badge>
                <h2 className="text-3xl sm:text-4xl font-black">الأسئلة الشائعة</h2>
              </AnimatedSection>
              <AnimatedSection>
                <Card className="border-border/50">
                  <CardContent className="p-0 px-6">{displayFaqs.map((faq, i) => (<FaqItem key={i} q={faq.q} a={faq.a} />))}</CardContent>
                </Card>
              </AnimatedSection>
            </div>
          </section>
        );
      })()}

      {/* ─── CTA ─── */}
      {isSectionVisible('cta') && (() => {
        const ctaSection = getSection('cta');
        return (
          <section className="py-20 sm:py-28 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-bl from-emerald-600 to-teal-600" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
              <AnimatedSection>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">{ctaSection?.titleAr || 'جاهز لتحويل عيادتك إلى المستقبل الرقمي؟'}</h2>
                <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto">{ctaSection?.subtitleAr || 'انضم إلى أكثر من 2,450 طبيب يستخدمون NutriClinic لإدارة عياداتهم بذكاء. ابدأ مجاناً اليوم بدون بطاقة ائتمان.'}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button size="lg" className="text-lg px-10 py-7 bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl" onClick={() => router.push('/register')}>{freeTrialEnabled ? 'ابدأ مجاناً' : 'سجّل الآن'}<ArrowLeft className="mr-2 h-5 w-5" /></Button>
                  <Button size="lg" className="text-lg px-10 py-7 bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl" onClick={() => router.push('/login')}>دخول الطبيب</Button>
                  <Button size="lg" className="text-lg px-10 py-7 bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl gap-2" onClick={() => router.push('/portal')}>
                    <UserCircle2 className="h-5 w-5" />
                    دخول المريض
                  </Button>
                </div>
              </AnimatedSection>
            </div>
          </section>
        );
      })()}

      {/* ─── Footer ─── */}
      {isSectionVisible('footer') && (() => {
        const footerSection = getSection('footer');
        const footerItems = getItems('footer');
        return (
          <footer className="bg-[oklch(0.16_0.03_163)] text-emerald-100 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-4 gap-8">
                {/* العمود الأول: الشعار */}
                <div className="md:col-span-1">
                  <div className="flex items-center gap-2 mb-4">
                    {siteLogo ? <img src={siteLogo} alt={siteName} className="h-8" /> : <div className="bg-gradient-to-bl from-emerald-600 to-teal-600 p-2 rounded-xl"><Leaf className="h-6 w-6 text-white" /></div>}
                    <span className="text-xl font-black bg-gradient-to-l from-emerald-400 to-teal-400 bg-clip-text text-transparent">{siteName}</span>
                  </div>
                  <p className="text-sm text-emerald-300/70 leading-relaxed">
                    منصة متكاملة لإدارة عيادات التغذية مدعومة بالذكاء الاصطناعي
                  </p>
                </div>
                {/* أعمدة التذييل الديناميكية */}
                {footerItems.length > 0 ? footerItems.map((item, i) => (
                  <div key={i}>
                    <h4 className="font-bold mb-3 text-emerald-200">{item.titleAr || item.title}</h4>
                    <p className="text-sm text-emerald-300/70">{item.descriptionAr || item.description}</p>
                    {item.linkUrl && <a href={item.linkUrl} className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-block">{item.titleAr || item.title} ←</a>}
                  </div>
                )) : (
                  <>
                    <div><h4 className="font-bold mb-3 text-emerald-200">الدعم</h4><p className="text-sm text-emerald-300/70">تواصل مع فريق الدعم الفني في أي وقت</p></div>
                    <div><h4 className="font-bold mb-3 text-emerald-200">تواصل معنا</h4><p className="text-sm text-emerald-300/70">{cmsSettings.support_email || 'support@nutriclinic.com'}</p></div>
                    <div><h4 className="font-bold mb-3 text-emerald-200">المنصة</h4><p className="text-sm text-emerald-300/70">تعرف على المزيد عن NutriClinic</p></div>
                  </>
                )}
              </div>
              <div className="mt-8 pt-8 border-t border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-emerald-400/60">{copyrightText}</p>
                {freeTrialEnabled && (
                  <Button variant="outline" size="sm" className="border-emerald-700 text-emerald-300 hover:bg-emerald-800/40" onClick={() => router.push('/register')}>
                    تجربة مجانية {freeTrialDays} يوم
                  </Button>
                )}
              </div>
            </div>
          </footer>
        );
      })()}
    </div>
  );
}
