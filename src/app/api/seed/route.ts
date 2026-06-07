// ============================================================
// Seed API - بذر قاعدة البيانات (للتطوير فقط)
// GET: تنفيذ بذر البيانات الأولية
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden, isAdmin } from '@/lib/api-auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    // Only allow in development or for admin users
    const user = await getAuthUser(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden();

    const results: string[] = [];

    // Create admin account
    const adminExists = await db.user.findUnique({ where: { email: 'admin@nutriclinic.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@2024', 12);
      await db.user.create({
        data: {
          email: 'admin@nutriclinic.com',
          password: hashedPassword,
          name: 'مدير النظام',
          role: 'admin',
          isActive: true,
        },
      });
      results.push('Admin account created');
    } else {
      results.push('Admin account already exists');
    }

    // Create subscription plans (including free/trial plan)
    const monthlyPlan = await db.subscriptionPlan.findFirst({ where: { name: 'monthly' } });
    if (!monthlyPlan) {
      await db.subscriptionPlan.createMany({
        data: [
          {
            name: 'free',
            nameAr: 'تجربة مجانية',
            price: 0,
            currency: 'EGP',
            durationDays: 14, // default free trial duration
            features: JSON.stringify(['إدارة غير محدودة للمرضى', 'مساعد ذكي AI', 'خطط تغذية وتمارين', 'تقارير وتحليلات', 'تجربة مجانية']),
            isActive: true,
          },
          {
            name: 'monthly',
            nameAr: 'اشتراك شهري',
            price: 299,
            currency: 'EGP',
            durationDays: 30,
            features: JSON.stringify(['إدارة غير محدودة للمرضى', 'مساعد ذكي AI', 'خطط تغذية وتمارين', 'تقارير وتحليلات']),
            isActive: true,
          },
          {
            name: 'yearly',
            nameAr: 'اشتراك سنوي',
            price: 2999,
            currency: 'EGP',
            durationDays: 365,
            features: JSON.stringify(['إدارة غير محدودة للمرضى', 'مساعد ذكي AI', 'خطط تغذية وتمارين', 'تقارير وتحليلات', 'دعم فني أولوية', 'خصم 17% مقارنة بالشهري']),
            isActive: true,
          },
        ],
      });
      results.push('Subscription plans created (including free plan)');
    } else {
      // Check if free plan exists
      const freePlan = await db.subscriptionPlan.findFirst({ where: { name: 'free' } });
      if (!freePlan) {
        await db.subscriptionPlan.create({
          data: {
            name: 'free',
            nameAr: 'تجربة مجانية',
            price: 0,
            currency: 'EGP',
            durationDays: 14,
            features: JSON.stringify(['إدارة غير محدودة للمرضى', 'مساعد ذكي AI', 'خطط تغذية وتمارين', 'تقارير وتحليلات', 'تجربة مجانية']),
            isActive: true,
          },
        });
        results.push('Free plan added');
      } else {
        results.push('Subscription plans already exist');
      }
    }

    // Create AI providers
    const openaiProvider = await db.aiProvider.findFirst({ where: { name: 'openai' } });
    if (!openaiProvider) {
      await db.aiProvider.createMany({
        data: [
          { name: 'openai', displayName: 'OpenAI', priority: 0, isActive: true },
          { name: 'gemini', displayName: 'Google Gemini', priority: 1, isActive: true },
          { name: 'claude', displayName: 'Anthropic Claude', priority: 2, isActive: true },
        ],
      });
      results.push('AI providers created');
    } else {
      results.push('AI providers already exist');
    }

    // Create CMS content
    const heroContent = await db.cmsContent.findFirst({ where: { key: 'home_hero_title' } });
    if (!heroContent) {
      await db.cmsContent.createMany({
        data: [
          { key: 'home_hero_title', value: 'NutriClinic SaaS', valueAr: 'نوتري كلينيك', type: 'text', page: 'home' },
          { key: 'home_hero_subtitle', value: 'Smart Nutrition Clinic Management', valueAr: 'إدارة ذكية لعيادات التغذية', type: 'text', page: 'home' },
          { key: 'home_hero_description', value: 'AI-powered platform for nutrition professionals', valueAr: 'منصة مدعومة بالذكاء الاصطناعي لأخصائيي التغذية', type: 'text', page: 'home' },
        ],
      });
      results.push('CMS content created');
    } else {
      results.push('CMS content already exists');
    }

    // Create demo doctor
    const demoDoctor = await db.user.findUnique({ where: { email: 'doctor@demo.com' } });
    if (!demoDoctor) {
      const hashedPassword = await bcrypt.hash('Doctor@2024', 12);
      await db.user.create({
        data: {
          email: 'doctor@demo.com',
          password: hashedPassword,
          name: 'د. أحمد محمد',
          role: 'doctor',
          isActive: true,
          phone: '+201012345678',
          specialization: 'تغذية علاجية',
          clinicName: 'عيادة التغذية الصحية',
        },
      });
      results.push('Demo doctor created (doctor@demo.com / Doctor@2024)');
    } else {
      results.push('Demo doctor already exists');
    }

    // ==================== بذر أقسام الصفحة الرئيسية ====================
    const existingSections = await db.landingPageSection.count();
    if (existingSections === 0) {
      await db.landingPageSection.createMany({
        data: [
          {
            sectionKey: 'hero',
            title: 'NutriClinic',
            titleAr: 'نوتري كلينيك',
            subtitle: 'Smart Nutrition Clinic Management Powered by AI',
            subtitleAr: 'أدر عيادة التغذية بذكاء وسهولة',
            content: 'منصة متكاملة لإدارة عيادات التغذية مدعومة بالذكاء الاصطناعي. أدر مرضاك، خطط التغذية والتمارين، وتابع التقدم — كل ذلك من مكان واحد.',
            contentAr: 'منصة متكاملة لإدارة عيادات التغذية مدعومة بالذكاء الاصطناعي. أدر مرضاك، خطط التغذية والتمارين، وتابع التقدم — كل ذلك من مكان واحد.',
            imageUrl: '/hero-dashboard.webp',
            isVisible: true,
            sortOrder: 1,
          },
          {
            sectionKey: 'stats',
            title: 'Platform Statistics',
            titleAr: 'إحصائيات المنصة',
            isVisible: true,
            sortOrder: 2,
          },
          {
            sectionKey: 'features',
            title: 'Features',
            titleAr: 'المميزات',
            subtitle: 'Everything a nutritionist needs',
            subtitleAr: 'كل ما يحتاجه طبيب التغذية',
            isVisible: true,
            sortOrder: 3,
          },
          {
            sectionKey: 'ai_showcase',
            title: 'AI Assistant',
            titleAr: 'المساعد الذكي',
            subtitle: 'Smart assistant that understands every patient',
            subtitleAr: 'مساعد ذكي يفهم احتياجات كل مريض',
            content: 'المساعد الذكي في NutriClinic يستخدم أحدث نماذج الذكاء الاصطناعي من OpenAI و Gemini و Claude مع نظام احتياطي تلقائي يضمن عدم توقف الخدمة.',
            contentAr: 'المساعد الذكي في NutriClinic يستخدم أحدث نماذج الذكاء الاصطناعي من OpenAI و Gemini و Claude مع نظام احتياطي تلقائي يضمن عدم توقف الخدمة.',
            imageUrl: '/hero-ai.webp',
            isVisible: true,
            sortOrder: 4,
          },
          {
            sectionKey: 'how_it_works',
            title: 'How It Works',
            titleAr: 'كيف تعمل',
            subtitle: 'Four simple steps to manage your clinic smartly',
            subtitleAr: 'أربع خطوات فقط لبدء إدارة عيادتك بذكاء',
            isVisible: true,
            sortOrder: 5,
          },
          {
            sectionKey: 'pricing',
            title: 'Pricing Plans',
            titleAr: 'الأسعار',
            subtitle: 'Choose the plan that suits your needs',
            subtitleAr: 'خطط تناسب احتياجاتك',
            isVisible: true,
            sortOrder: 6,
          },
          {
            sectionKey: 'nutrition_showcase',
            title: 'Nutrition Plans',
            titleAr: 'خطط التغذية',
            subtitle: 'Accurate nutrition plans for every patient',
            subtitleAr: 'خطط تغذية دقيقة لكل مريض',
            imageUrl: '/hero-doctor.webp',
            isVisible: true,
            sortOrder: 7,
          },
          {
            sectionKey: 'testimonials',
            title: 'Testimonials',
            titleAr: 'آراء العملاء',
            subtitle: 'What our doctors say',
            subtitleAr: 'ماذا يقول أطباؤنا',
            isVisible: true,
            sortOrder: 8,
          },
          {
            sectionKey: 'faq',
            title: 'FAQ',
            titleAr: 'الأسئلة الشائعة',
            isVisible: true,
            sortOrder: 9,
          },
          {
            sectionKey: 'cta',
            title: 'Call to Action',
            titleAr: 'جاهز لتحويل عيادتك إلى المستقبل الرقمي؟',
            subtitle: 'Join over 2,450 doctors using NutriClinic',
            subtitleAr: 'انضم إلى أكثر من 2,450 طبيب يستخدمون NutriClinic لإدارة عياداتهم بذكاء. ابدأ مجاناً اليوم بدون بطاقة ائتمان.',
            isVisible: true,
            sortOrder: 10,
          },
          {
            sectionKey: 'free_trial',
            title: 'Free Trial',
            titleAr: 'تجربة مجانية',
            content: 'Start your free trial today, no credit card required. Setup in just one minute.',
            contentAr: 'ابدأ مجاناً اليوم بدون بطاقة ائتمان. إعداد في دقيقة واحدة فقط.',
            isVisible: true,
            sortOrder: 11,
          },
          {
            sectionKey: 'footer',
            title: 'Footer',
            titleAr: 'تذييل الموقع',
            isVisible: true,
            sortOrder: 12,
          },
        ],
      });
      results.push('Landing page sections created');
    } else {
      results.push('Landing page sections already exist');
    }

    // بذر عناصر الأقسام
    const existingItems = await db.landingPageItem.count();
    if (existingItems === 0) {
      await db.landingPageItem.createMany({
        data: [
          // المميزات
          { sectionKey: 'features', title: 'Patient Management', titleAr: 'إدارة المرضى المتكاملة', description: 'Comprehensive patient files with InBody data, medical history, and body metrics.', descriptionAr: 'ملفات مرضى شاملة مع بيانات InBody، التاريخ الطبي، ومؤشرات الجسم. تتبع كل مريض من أول زيارة حتى الوصول للهدف.', iconName: 'Users', sortOrder: 1, isVisible: true },
          { sectionKey: 'features', title: 'AI Assistant', titleAr: 'مساعد ذكي بالذكاء الاصطناعي', description: 'AI-powered medical assistant for nutrition and exercise plans with automatic fallback.', descriptionAr: 'مساعد طبي مدعوم بالذكاء الاصطناعي يساعدك في وضع خطط التغذية والتمارين بذكاء. يدعم عدة مزودي AI مع نظام احتياطي تلقائي.', iconName: 'Bot', sortOrder: 2, isVisible: true },
          { sectionKey: 'features', title: 'Smart Nutrition Plans', titleAr: 'خطط التغذية الذكية', description: 'Automatic macro calculation based on BMR and TDEE with adaptive weekly plans.', descriptionAr: 'حساب تلقائي للمكرونات (بروتين، كربوهيدرات، دهون) بناءً على BMR و TDEE. خطط أسبوعية تتكيف مع تقدم المريض.', iconName: 'ClipboardList', sortOrder: 3, isVisible: true },
          { sectionKey: 'features', title: 'Exercise Plans', titleAr: 'خطط التمارين الرياضية', description: 'Custom exercise plans for each patient based on fitness level and goals.', descriptionAr: 'أنشئ خطط تمارين مخصصة لكل مريض بناءً على حالته البدنية وأهدافه. تكامل كامل مع خطط التغذية لنتائج أفضل.', iconName: 'Dumbbell', sortOrder: 4, isVisible: true },
          { sectionKey: 'features', title: 'Reports & Statistics', titleAr: 'تقارير وإحصائيات متقدمة', description: 'Interactive dashboard with comprehensive statistics and real-time tracking.', descriptionAr: 'لوحة تحكم تفاعلية مع إحصائيات شاملة. تتبع تقدم المرضى، معدل النجاح، وأداء العيادة بشكل لحظي.', iconName: 'BarChart3', sortOrder: 5, isVisible: true },
          { sectionKey: 'features', title: 'Security & Protection', titleAr: 'حماية وأمان متقدم', description: 'Full data encryption with Prepared Statements for SQL Injection protection.', descriptionAr: 'تشفير كامل للبيانات مع Prepared Statements لحماية من SQL Injection. نظام صلاحيات متعدد المستويات.', iconName: 'Shield', sortOrder: 6, isVisible: true },

          // كيف تعمل
          { sectionKey: 'how_it_works', title: 'Register', titleAr: 'سجّل حسابك', description: 'Create your account in less than a minute. You only need your name and email.', descriptionAr: 'أنشئ حسابك في أقل من دقيقة. ستحتاج فقط لاسمك وبريدك الإلكتروني.', iconName: 'Smartphone', sortOrder: 1, isVisible: true },
          { sectionKey: 'how_it_works', title: 'Add Patients', titleAr: 'أضف مرضاك', description: 'Record initial patient data, physical measurements, and InBody data.', descriptionAr: 'سجّل بيانات المرضى الأولية والقياسات الجسدية وبيانات InBody.', iconName: 'Users', sortOrder: 2, isVisible: true },
          { sectionKey: 'how_it_works', title: 'Use AI Assistant', titleAr: 'استخدم المساعد الذكي', description: 'Let AI help you create optimal nutrition and exercise plans.', descriptionAr: 'دع الذكاء الاصطناعي يساعدك في وضع الخطط الغذائية والرياضية المثلى.', iconName: 'Sparkles', sortOrder: 3, isVisible: true },
          { sectionKey: 'how_it_works', title: 'Track Progress', titleAr: 'تتبع التقدم', description: 'Monitor patient improvements and automatically adjust plans based on results.', descriptionAr: 'تابع تحسن مرضاك وزياداتهم وقم بتعديل الخطط تلقائياً بناءً على النتائج.', iconName: 'TrendingUp', sortOrder: 4, isVisible: true },

          // آراء العملاء
          { sectionKey: 'testimonials', title: 'Dr. Sarah Ahmed', titleAr: 'د. سارة أحمد', description: 'NutriClinic completely changed how I work. The AI assistant saves me hours in preparing nutrition plans, and I can follow up with more patients at higher quality.', descriptionAr: 'NutriClinic غيّر طريقة عملي بالكامل. المساعد الذكي يوفر عليّ ساعات في إعداد الخطط الغذائية، وأصبحت قادرة على متابعة المزيد من المرضى بجودة أعلى.', iconName: 'Star', linkUrl: 'أخصائية تغذية علاجية', sortOrder: 1, isVisible: true },
          { sectionKey: 'testimonials', title: 'Dr. Mohammed Al-Ali', titleAr: 'د. محمد العلي', description: 'The best platform I have used for clinic management. The automatic macro system is very accurate, and the reports help me evaluate treatment effectiveness for each patient.', descriptionAr: 'أفضل منصة استخدمتها لإدارة العيادة. نظام المكرونات التلقائي دقيق جداً، والتقارير تساعدني في تقييم فعالية العلاج لكل مريض.', iconName: 'Star', linkUrl: 'استشاري السمنة والنحافة', sortOrder: 2, isVisible: true },
          { sectionKey: 'testimonials', title: 'Dr. Noura Al-Khalid', titleAr: 'د. نورة الخالد', description: 'The integration of nutrition plans with exercise plans made my life much easier. Patients are happy with the results and I am happy with the simplicity.', descriptionAr: 'تكامل خطط التغذية مع خطط التمارين جعل حياتي أسهل كثيراً. المرضى سعداء بالنتائج وأنا سعيدة بالسهولة.', iconName: 'Star', linkUrl: 'أخصائية تغذية رياضية', sortOrder: 3, isVisible: true },

          // الأسئلة الشائعة
          { sectionKey: 'faq', title: 'Can I try the platform for free?', titleAr: 'هل يمكنني تجربة المنصة مجاناً؟', description: 'Yes! You can register and start using the platform immediately. We offer a trial period that allows you to explore all features before subscribing.', descriptionAr: 'نعم! يمكنك التسجيل والبدء في استخدام المنصة مباشرة. نوفر فترة تجريبية تتيح لك استكشاف جميع المميزات قبل الاشتراك.', sortOrder: 1, isVisible: true },
          { sectionKey: 'faq', title: 'Is my patient data safe?', titleAr: 'هل بيانات مرضاي آمنة؟', description: 'Absolutely. We use the latest encryption and data protection technologies. All queries are protected with Prepared Statements to prevent any breach.', descriptionAr: 'بالتأكيد. نستخدم أحدث تقنيات التشفير وحماية البيانات. جميع الاستعلامات محمية بـ Prepared Statements لمنع أي اختراق، وبياناتك مشفرة أثناء النقل والتخزين.', sortOrder: 2, isVisible: true },
          { sectionKey: 'faq', title: 'Can I cancel my subscription anytime?', titleAr: 'هل يمكنني إلغاء اشتراكي في أي وقت؟', description: 'Yes, you can cancel your subscription at any time without any additional fees. Your data will be kept for 30 days after cancellation.', descriptionAr: 'نعم، يمكنك إلغاء اشتراكك في أي وقت بدون أي رسوم إضافية. ستظل بياناتك محفوظة لمدة 30 يوماً بعد الإلغاء.', sortOrder: 3, isVisible: true },
          { sectionKey: 'faq', title: 'How does the AI assistant work?', titleAr: 'كيف يعمل المساعد الذكي؟', description: 'The AI assistant uses advanced AI models from multiple providers (OpenAI, Gemini, Claude) with automatic fallback. You can create nutrition and exercise plans with one click.', descriptionAr: 'المساعد الذكي يستخدم نماذج ذكاء اصطناعي متقدمة من عدة مزودين (OpenAI, Gemini, Claude) مع نظام احتياطي تلقائي. يمكنك من خلاله إنشاء خطط تغذية وتمارين بضغطة زر.', sortOrder: 4, isVisible: true },
          { sectionKey: 'faq', title: 'Is the platform mobile-friendly?', titleAr: 'هل المنصة متوافقة مع الهواتف؟', description: 'Yes, the platform is designed to work efficiently on all devices - desktop, tablet, and mobile. A fully responsive interface ensures an excellent experience on any screen.', descriptionAr: 'نعم، المنصة مصممة لتعمل بكفاءة على جميع الأجهزة - الحاسوب والتابلت والهاتف. واجهة متجاوبة بالكامل تضمن تجربة ممتازة على أي شاشة.', sortOrder: 5, isVisible: true },

          // الإحصائيات
          { sectionKey: 'stats', title: 'Active Doctors', titleAr: 'طبيب نشط', description: '+2,450', iconName: 'Heart', sortOrder: 1, isVisible: true },
          { sectionKey: 'stats', title: 'Registered Patients', titleAr: 'مريض مسجل', description: '+25,000', iconName: 'Users', sortOrder: 2, isVisible: true },
          { sectionKey: 'stats', title: 'Smart Plans', titleAr: 'خطة ذكية', description: '+15,000', iconName: 'Sparkles', sortOrder: 3, isVisible: true },
          { sectionKey: 'stats', title: 'Uptime', titleAr: 'وقت التشغيل', description: '99.9%', iconName: 'Activity', sortOrder: 4, isVisible: true },

          // الذكاء الاصطناعي - مميزات القائمة
          { sectionKey: 'ai_showcase', title: 'Triple fallback system (OpenAI → Gemini → Claude)', titleAr: 'نظام احتياطي ثلاثي (OpenAI → Gemini → Claude)', sortOrder: 1, isVisible: true },
          { sectionKey: 'ai_showcase', title: 'Automatic macro calculation based on BMR and TDEE', titleAr: 'حساب تلقائي للمكرونات بناءً على BMR و TDEE', sortOrder: 2, isVisible: true },
          { sectionKey: 'ai_showcase', title: 'Weekly plans that adapt to patient progress', titleAr: 'خطط أسبوعية تتكيف مع تقدم المريض', sortOrder: 3, isVisible: true },
          { sectionKey: 'ai_showcase', title: 'Smart chat for nutrition queries', titleAr: 'محادثة ذكية لاستفسارات التغذية', sortOrder: 4, isVisible: true },

          // خطط التغذية - عناصر
          { sectionKey: 'nutrition_showcase', title: 'BMR/TDEE Calculation', titleAr: 'حساب BMR/TDEE', iconName: 'Activity', sortOrder: 1, isVisible: true },
          { sectionKey: 'nutrition_showcase', title: 'Weekly Plans', titleAr: 'خطط أسبوعية', iconName: 'ClipboardList', sortOrder: 2, isVisible: true },
          { sectionKey: 'nutrition_showcase', title: 'Exercise Plans', titleAr: 'خطط تمارين', iconName: 'Dumbbell', sortOrder: 3, isVisible: true },
          { sectionKey: 'nutrition_showcase', title: 'Progress Tracking', titleAr: 'تتبع التقدم', iconName: 'BarChart3', sortOrder: 4, isVisible: true },

          // التذييل
          { sectionKey: 'footer', title: 'Support', titleAr: 'الدعم', description: 'Contact our support team anytime', descriptionAr: 'تواصل مع فريق الدعم الفني في أي وقت', iconName: 'MessageCircle', sortOrder: 1, isVisible: true },
          { sectionKey: 'footer', title: 'Contact Us', titleAr: 'تواصل معنا', description: 'We are here to help you', descriptionAr: 'نحن هنا لمساعدتك', iconName: 'Mail', linkUrl: '/contact', sortOrder: 2, isVisible: true },
          { sectionKey: 'footer', title: 'Platform', titleAr: 'المنصة', description: 'Learn more about NutriClinic', descriptionAr: 'تعرف على المزيد عن NutriClinic', iconName: 'Globe', linkUrl: '/about', sortOrder: 3, isVisible: true },
        ],
      });
      results.push('Landing page items created');
    } else {
      results.push('Landing page items already exist');
    }

    // إعدادات الموقع الأساسية
    const siteSettings = await db.systemSettings.findFirst({ where: { key: 'site_logo_url' } });
    if (!siteSettings) {
      await db.systemSettings.createMany({
        data: [
          { key: 'site_name', value: 'NutriClinic' },
          { key: 'site_name_ar', value: 'نوتري كلينيك' },
          { key: 'site_logo_url', value: '/logo.svg' },
          { key: 'site_copyright', value: '© 2024 NutriClinic. All rights reserved.' },
          { key: 'site_copyright_ar', value: '© 2024 نوتري كلينيك. جميع الحقوق محفوظة.' },
          { key: 'free_trial_days', value: '14' },
          { key: 'free_trial_enabled', value: 'true' },
          { key: 'whatsapp_number', value: '+201012345678' },
          { key: 'support_email', value: 'support@nutriclinic.com' },
        ],
      });
      results.push('Site settings created');
    } else {
      results.push('Site settings already exist');
    }

    return Response.json({
      message: 'تم بذر البيانات بنجاح',
      results,
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء بذر البيانات';
    return Response.json({ error: message }, { status: 500 });
  }
}
