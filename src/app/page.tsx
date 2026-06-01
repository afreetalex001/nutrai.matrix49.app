'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/auth-store';
import {
  Leaf,
  Users,
  Bot,
  ClipboardList,
  Dumbbell,
  BarChart3,
  Shield,
  Zap,
  Star,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
  ArrowLeft,
  Sparkles,
  Heart,
  Activity,
  Apple,
  Smartphone,
  Globe,
  Clock,
  MessageCircle,
  TrendingUp,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ───────── Data ───────── */

const FEATURES = [
  {
    icon: Users,
    title: 'إدارة المرضى المتكاملة',
    desc: 'ملفات مرضى شاملة مع بيانات InBody، التاريخ الطبي، ومؤشرات الجسم. تتبع كل مريض من أول زيارة حتى الوصول للهدف.',
  },
  {
    icon: Bot,
    title: 'مساعد ذكي بالذكاء الاصطناعي',
    desc: 'مساعد طبي مدعوم بالذكاء الاصطناعي يساعدك في وضع خطط التغذية والتمارين بذكاء. يدعم عدة مزودي AI مع نظام احتياطي تلقائي.',
  },
  {
    icon: ClipboardList,
    title: 'خطط التغذية الذكية',
    desc: 'حساب تلقائي للمكرونات (بروتين، كربوهيدرات، دهون) بناءً على BMR و TDEE. خطط أسبوعية تتكيف مع تقدم المريض.',
  },
  {
    icon: Dumbbell,
    title: 'خطط التمارين الرياضية',
    desc: 'أنشئ خطط تمارين مخصصة لكل مريض بناءً على حالته البدنية وأهدافه. تكامل كامل مع خطط التغذية لنتائج أفضل.',
  },
  {
    icon: BarChart3,
    title: 'تقارير وإحصائيات متقدمة',
    desc: 'لوحة تحكم تفاعلية مع إحصائيات شاملة. تتبع تقدم المرضى، معدل النجاح، وأداء العيادة بشكل لحظي.',
  },
  {
    icon: Shield,
    title: 'حماية وأمان متقدم',
    desc: 'تشفير كامل للبيانات مع Prepared Statements لحماية من SQL Injection. نظام صلاحيات متعدد المستويات.',
  },
];

const STEPS = [
  {
    num: '١',
    title: 'سجّل حسابك',
    desc: 'أنشئ حسابك في أقل من دقيقة. ستحتاج فقط لاسمك وبريدك الإلكتروني.',
    icon: Smartphone,
  },
  {
    num: '٢',
    title: 'أضف مرضاك',
    desc: 'سجّل بيانات المرضى الأولية والقياسات الجسدية وبيانات InBody.',
    icon: Users,
  },
  {
    num: '٣',
    title: 'استخدم المساعد الذكي',
    desc: 'دع الذكاء الاصطناعي يساعدك في وضع الخطط الغذائية والرياضية المثلى.',
    icon: Sparkles,
  },
  {
    num: '٤',
    title: 'تتبع التقدم',
    desc: 'تابع تحسن مرضاك وزياداتهم وقم بتعديل الخطط تلقائياً بناءً على النتائج.',
    icon: TrendingUp,
  },
];

const TESTIMONIALS = [
  {
    name: 'د. سارة أحمد',
    role: 'أخصائية تغذية علاجية',
    text: 'NutriClinic غيّر طريقة عملي بالكامل. المساعد الذكي يوفر عليّ ساعات في إعداد الخطط الغذائية، وأصبحت قادرة على متابعة المزيد من المرضى بجودة أعلى.',
    rating: 5,
  },
  {
    name: 'د. محمد العلي',
    role: 'استشاري السمنة والنحافة',
    text: 'أفضل منصة استخدمتها لإدارة العيادة. نظام المكرونات التلقائي دقيق جداً، والتقارير تساعدني في تقييم فعالية العلاج لكل مريض.',
    rating: 5,
  },
  {
    name: 'د. نورة الخالد',
    role: 'أخصائية تغذية رياضية',
    text: 'تكامل خطط التغذية مع خطط التمارين جعل حياتي أسهل كثيراً. المرضى سعداء بالنتائج وأنا سعيدة بالسهولة.',
    rating: 5,
  },
];

const FAQS = [
  {
    q: 'هل يمكنني تجربة المنصة مجاناً؟',
    a: 'نعم! يمكنك التسجيل والبدء في استخدام المنصة مباشرة. نوفر فترة تجريبية تتيح لك استكشاف جميع المميزات قبل الاشتراك.',
  },
  {
    q: 'هل بيانات مرضاي آمنة؟',
    a: 'بالتأكيد. نستخدم أحدث تقنيات التشفير وحماية البيانات. جميع الاستعلامات محمية بـ Prepared Statements لمنع أي اختراق، وبياناتك مشفرة أثناء النقل والتخزين.',
  },
  {
    q: 'هل يمكنني إلغاء اشتراكي في أي وقت؟',
    a: 'نعم، يمكنك إلغاء اشتراكك في أي وقت بدون أي رسوم إضافية. ستظل بياناتك محفوظة لمدة 30 يوماً بعد الإلغاء.',
  },
  {
    q: 'كيف يعمل المساعد الذكي؟',
    a: 'المساعد الذكي يستخدم نماذج ذكاء اصطناعي متقدمة من عدة مزودين (OpenAI, Gemini, Claude) مع نظام احتياطي تلقائي. يمكنك من خلاله إنشاء خطط تغذية وتمارين بضغطة زر.',
  },
  {
    q: 'هل المنصة متوافقة مع الهواتف؟',
    a: 'نعم، المنصة مصممة لتعمل بكفاءة على جميع الأجهزة - الحاسوب والتابلت والهاتف. واجهة متجاوبة بالكامل تضمن تجربة ممتازة على أي شاشة.',
  },
];

/* ───────── Animated Section Wrapper ───────── */

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────── Pricing Card ───────── */

function PricingCard({
  plan,
  isPopular,
}: {
  plan: { nameAr: string; price: number; currency: string; durationDays: number; features: string[] };
  isPopular: boolean;
}) {
  const periodLabel = plan.durationDays >= 365 ? 'سنوياً' : 'شهرياً';
  const monthlyEquiv = plan.durationDays >= 365 ? Math.round(plan.price / 12) : null;

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card
        className={`relative overflow-hidden h-full flex flex-col ${
          isPopular
            ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/20'
            : 'border border-border'
        }`}
      >
        {isPopular && (
          <div className="absolute top-0 right-0 left-0 bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-center py-2 text-sm font-bold">
            الأكثر طلباً
          </div>
        )}
        <CardHeader className={`pt-8 pb-4 text-center ${isPopular ? 'pt-14' : ''}`}>
          <h3 className="text-2xl font-bold">{plan.nameAr}</h3>
          <div className="mt-4">
            <span className="text-5xl font-black text-emerald-600">{plan.price}</span>
            <span className="text-lg text-muted-foreground mr-1">{plan.currency}</span>
            <span className="text-muted-foreground"> / {periodLabel}</span>
          </div>
          {monthlyEquiv && (
            <p className="text-sm text-muted-foreground mt-1">
              أي ما يعادل {monthlyEquiv} {plan.currency} شهرياً — وفّر 17%
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-1 px-6">
          <ul className="space-y-3">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="p-6">
          <Button
            className={`w-full text-lg py-6 ${
              isPopular
                ? 'bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30'
                : ''
            }`}
            variant={isPopular ? 'default' : 'outline'}
            onClick={() => (window.location.href = '/register')}
          >
            ابدأ الآن
          </Button>
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
      <button
        className="w-full flex items-center justify-between py-5 text-right"
        onClick={() => setOpen(!open)}
      >
        <span className="text-lg font-semibold">{q}</span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-300 shrink-0 mr-4 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="text-muted-foreground pb-5 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => {
        if (data.plans?.length) setPlans(data.plans);
      })
      .catch(() => {});
  }, []);

  const displayPlans =
    plans.length > 0
      ? plans
      : [
          {
            nameAr: 'الاشتراك الشهري',
            price: 299,
            currency: 'EGP',
            durationDays: 30,
            features: [
              'عدد غير محدود من المرضى',
              'المساعد الذكي بالذكاء الاصطناعي',
              'خطط التغذية والتمارين',
              'التقارير والإحصائيات',
              'حساب المكرونات التلقائي',
              'الدعم الفني',
            ],
          },
          {
            nameAr: 'الاشتراك السنوي',
            price: 2999,
            currency: 'EGP',
            durationDays: 365,
            features: [
              'جميع مميزات الاشتراك الشهري',
              'دعم فني أولوية',
              'خصم 17% مقارنة بالشهري',
              'تحديثات ومميزات حصرية',
              'تقارير متقدمة',
              'تصدير البيانات',
            ],
          },
        ];

  const navCta = isAuthenticated()
    ? user?.role === 'admin'
      ? { label: 'لوحة الإدارة', href: '/admin' }
      : { label: 'لوحة التحكم', href: '/dashboard' }
    : { label: 'ابدأ مجاناً', href: '/register' };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/90 backdrop-blur-lg shadow-sm border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2">
              <div className="bg-gradient-to-bl from-emerald-600 to-teal-600 p-2 rounded-xl">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-black bg-gradient-to-l from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                NutriClinic
              </span>
            </a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                المميزات
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                كيف تعمل
              </a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                الأسعار
              </a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                آراء العملاء
              </a>
              <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                الأسئلة الشائعة
              </a>
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated() ? (
                <Button
                  onClick={() => router.push(navCta.href)}
                  className="bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20"
                >
                  {navCta.label}
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => router.push('/login')}>
                    تسجيل الدخول
                  </Button>
                  <Button
                    onClick={() => router.push('/register')}
                    className="bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20"
                  >
                    ابدأ مجاناً
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-background/95 backdrop-blur-lg border-b border-border"
            >
              <div className="px-4 py-4 space-y-3">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">المميزات</a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">كيف تعمل</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">الأسعار</a>
                <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">آراء العملاء</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-medium">الأسئلة الشائعة</a>
                <div className="pt-3 border-t border-border flex gap-3">
                  {isAuthenticated() ? (
                    <Button
                      className="w-full bg-gradient-to-l from-emerald-600 to-teal-600 text-white"
                      onClick={() => router.push(navCta.href)}
                    >
                      {navCta.label}
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" className="flex-1" onClick={() => router.push('/login')}>
                        دخول
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-l from-emerald-600 to-teal-600 text-white"
                        onClick={() => router.push('/register')}
                      >
                        تسجيل
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-300/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm bg-emerald-50 text-emerald-700 border-emerald-200">
                <Sparkles className="h-4 w-4 ml-2" />
                مدعوم بالذكاء الاصطناعي
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
                أدر عيادة التغذية
                <br />
                <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  بذكاء و سهولة
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
                منصة متكاملة لإدارة عيادات التغذية مدعومة بالذكاء الاصطناعي. أدر مرضاك، خطط التغذية
                والتمارين، وتابع التقدم — كل ذلك من مكان واحد.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                {isAuthenticated() ? (
                  <Button
                    size="lg"
                    className="text-lg px-8 py-7 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/25"
                    onClick={() => router.push(navCta.href)}
                  >
                    {navCta.label}
                    <ArrowLeft className="mr-2 h-5 w-5" />
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="text-lg px-8 py-7 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/25"
                      onClick={() => router.push('/register')}
                    >
                      ابدأ مجاناً
                      <ArrowLeft className="mr-2 h-5 w-5" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-lg px-8 py-7"
                      onClick={() => router.push('/login')}
                    >
                      تسجيل الدخول
                    </Button>
                  </>
                )}
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  لا حاجة لبطاقة ائتمان
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  إعداد في دقيقة
                </div>
              </div>
            </motion.div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-border">
                <Image
                  src="/hero-dashboard.webp"
                  alt="لوحة تحكم NutriClinic"
                  width={1344}
                  height={768}
                  className="w-full h-auto"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              {/* Floating cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-white dark:bg-card rounded-xl p-4 shadow-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">المرضى النشطون</p>
                    <p className="text-lg font-bold text-emerald-600">+2,450</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 bg-white dark:bg-card rounded-xl p-4 shadow-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg">
                    <Bot className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">خطط ذكية</p>
                    <p className="text-lg font-bold text-teal-600">+15,000</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="py-12 bg-gradient-to-l from-emerald-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
            {[
              { val: '+2,450', label: 'طبيب نشط', icon: Heart },
              { val: '+25,000', label: 'مريض مسجل', icon: Users },
              { val: '+15,000', label: 'خطة ذكية', icon: Sparkles },
              { val: '99.9%', label: 'وقت التشغيل', icon: Activity },
            ].map((s, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="flex flex-col items-center">
                  <s.icon className="h-8 w-8 mb-3 opacity-80" />
                  <p className="text-3xl sm:text-4xl font-black">{s.val}</p>
                  <p className="text-sm opacity-80 mt-1">{s.label}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">
              المميزات
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black">
              كل ما يحتاجه{' '}
              <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                طبيب التغذية
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              أدوات متكاملة ومتقدمة تجعل إدارة عيادتك أسهل وأكثر احترافية
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <AnimatedSection key={i} delay={i * 0.08}>
                <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <Card className="h-full border-border/50 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                    <CardContent className="pt-8">
                      <div className="bg-gradient-to-bl from-emerald-500 to-teal-500 w-14 h-14 rounded-xl flex items-center justify-center mb-5">
                        <f.icon className="h-7 w-7 text-white" />
                      </div>
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

      {/* ─── AI Showcase ─── */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-border">
                  <Image
                    src="/hero-ai.webp"
                    alt="المساعد الذكي NutriClinic"
                    width={1024}
                    height={1024}
                    className="w-full h-auto"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                <Bot className="h-4 w-4 ml-2" />
                الذكاء الاصطناعي
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                مساعد ذكي يفهم احتياجات
                <br />
                <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  كل مريض
                </span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                المساعد الذكي في NutriClinic يستخدم أحدث نماذج الذكاء الاصطناعي من OpenAI و Gemini و
                Claude مع نظام احتياطي تلقائي يضمن عدم توقف الخدمة. يمكنه إنشاء خطط تغذية وتمارين
                مخصصة لكل مريض بناءً على بياناته وأهدافه الصحية.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'نظام احتياطي ثلاثي (OpenAI → Gemini → Claude)',
                  'حساب تلقائي للمكرونات بناءً على BMR و TDEE',
                  'خطط أسبوعية تتكيف مع تقدم المريض',
                  'محادثة ذكية لاستفسارات التغذية',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-full">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">
              خطوات بسيطة
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black">
              كيف تعمل{' '}
              <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                NutriClinic
              </span>
              ؟
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              أربع خطوات فقط لبدء إدارة عيادتك بذكاء
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <AnimatedSection key={i} delay={i * 0.12}>
                <div className="text-center relative">
                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-0 w-full h-0.5 bg-gradient-to-l from-emerald-300 to-transparent -z-10" />
                  )}
                  <div className="bg-gradient-to-bl from-emerald-500 to-teal-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                    <span className="text-3xl font-black text-white">{s.num}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">
              الأسعار
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black">
              خطط تناسب{' '}
              <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                احتياجاتك
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              اختر الخطة المناسبة لك وابدأ في تحسين إدارة عيادتك اليوم
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {displayPlans.map((plan, i) => (
              <AnimatedSection key={i} delay={i * 0.15}>
                <PricingCard plan={plan} isPopular={i === 1} />
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={0.3} className="text-center mt-10">
            <p className="text-muted-foreground">
              جميع الأسعار شاملة الضريبة. يمكنك الإلغاء في أي وقت.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Doctor Showcase ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                <Apple className="h-4 w-4 ml-2" />
                خطط التغذية
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                خطط تغذية دقيقة
                <br />
                <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  لكل مريض
                </span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                نظام المكرونات التلقائي يحسب البروتين والكربوهيدرات والدهون بناءً على معدل الأيض
                الأساسي (BMR) ومستوى النشاط (TDEE). الخطط الأسبوعية تتكيف تلقائياً مع تقدم المريض
                وتحقيق أهدافه، مما يوفر لك وقتاً ثميناً ويضمن دقة النتائج.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {[
                  { icon: Activity, label: 'حساب BMR/TDEE' },
                  { icon: ClipboardList, label: 'خطط أسبوعية' },
                  { icon: Dumbbell, label: 'خطط تمارين' },
                  { icon: BarChart3, label: 'تتبع التقدم' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                    <item.icon className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-border">
                <Image
                  src="/hero-doctor.webp"
                  alt="طبيب يستخدم NutriClinic"
                  width={864}
                  height={1152}
                  className="w-full h-auto max-h-[500px] object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">
              آراء العملاء
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black">
              ماذا يقول{' '}
              <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                أطباؤنا
              </span>
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={i} delay={i * 0.12}>
                <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <Card className="h-full border-border/50">
                    <CardContent className="pt-8">
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: t.rating }).map((_, j) => (
                          <Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-foreground leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                      <div className="flex items-center gap-3 pt-4 border-t border-border">
                        <div className="bg-gradient-to-bl from-emerald-500 to-teal-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {t.name.charAt(0)}{t.name.split(' ')[1]?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 border-emerald-200">
              أسئلة شائعة
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black">الأسئلة الشائعة</h2>
          </AnimatedSection>

          <AnimatedSection>
            <Card className="border-border/50">
              <CardContent className="p-0 px-6">
                {FAQS.map((faq, i) => (
                  <FaqItem key={i} q={faq.q} a={faq.a} />
                ))}
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-emerald-600 to-teal-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
              جاهز لتحويل عيادتك
              <br />
              إلى المستقبل الرقمي؟
            </h2>
            <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto">
              انضم إلى أكثر من 2,450 طبيب يستخدمون NutriClinic لإدارة عياداتهم بذكاء.
              ابدأ مجاناً اليوم بدون بطاقة ائتمان.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="text-lg px-10 py-7 bg-white text-emerald-700 hover:bg-white/90 shadow-xl"
                onClick={() => router.push('/register')}
              >
                ابدأ مجاناً الآن
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-7 border-white/30 text-white hover:bg-white/10"
                onClick={() => {
                  const el = document.getElementById('pricing');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                شاهد الأسعار
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-16 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-bl from-emerald-600 to-teal-600 p-2 rounded-xl">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-black bg-gradient-to-l from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  NutriClinic
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                منصة متكاملة لإدارة عيادات التغذية مدعومة بالذكاء الاصطناعي. نساعد الأطباء على تقديم رعاية أفضل.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold mb-4">المنصة</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">المميزات</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">الأسعار</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">كيف تعمل</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">الأسئلة الشائعة</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">الدعم</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">مركز المساعدة</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">تواصل معنا</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">الشروط والأحكام</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">سياسة الخصوصية</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">تواصل معنا</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> واتساب</li>
                <li className="flex items-center gap-2"><Globe className="h-4 w-4" /> nutriclinic.matrix49.app</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4" /> دعم 24/7</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} NutriClinic. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>صُنع بـ</span>
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              <span>لأطباء التغذية</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
