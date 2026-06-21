// ============================================================
// Setup API - إعداد قاعدة البيانات الأولي (مرة واحدة فقط)
// POST: إنشاء الجداول وبذر البيانات الافتراضية
// يتطلب مفتاح إعداد (SETUP_KEY) للأمان
// ============================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // التحقق من مفتاح الأمان
    const body = await request.json();
    const setupKey = body.setupKey || body.setup_key;
    const expectedKey = process.env.SETUP_KEY || 'nutriclinic-setup-2024';

    if (setupKey !== expectedKey) {
      return Response.json({ error: 'مفتاح الإعداد غير صحيح' }, { status: 403 });
    }

    const results: string[] = [];

    // ===== 1. دفع مخطط Prisma إلى قاعدة البيانات =====
    // ملاحظة: على cPanel مشترك، قد لا يعمل execSync بسبب قيود LVE.
    // الحل الموصى به: تشغيل `npx prisma db push` يدويًا من Terminal أولاً.
    try {
      const { execSync } = require('child_process');
      execSync('npx prisma db push --skip-generate', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 30000, // 30 ثانية كحد أقصى
      });
      results.push('Database schema pushed successfully');
    } catch (schemaError: any) {
      const errMsg = schemaError.message?.substring(0, 200) || 'see logs';
      results.push(`Schema push skipped (run "npx prisma db push" manually from terminal): ${errMsg}`);
      // لا نفشل الـ setup كامل — قد تكون الجداول موجودة بالفعل من تشغيل يدوي
    }

    // ===== 2. إنشاء حساب الإدارة =====
    const adminPassword = body.adminPassword || 'Admin@2024';
    const adminExists = await db.user.findUnique({ where: { email: 'admin@nutriclinic.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await db.user.create({
        data: {
          email: 'admin@nutriclinic.com',
          password: hashedPassword,
          name: 'مدير النظام',
          role: 'admin',
          isActive: true,
        },
      });
      results.push('Admin account created: admin@nutriclinic.com');
    } else {
      results.push('Admin account already exists');
    }

    // ===== 3. إنشاء حساب طبيب تجريبي =====
    const doctorPassword = body.doctorPassword || 'Doctor@2024';
    const demoDoctor = await db.user.findUnique({ where: { email: 'doctor@demo.com' } });
    if (!demoDoctor) {
      const hashedPassword = await bcrypt.hash(doctorPassword, 12);
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
      results.push('Demo doctor created: doctor@demo.com');
    } else {
      results.push('Demo doctor already exists');
    }

    // ===== 4. إنشاء خطط الاشتراك =====
    const monthlyPlan = await db.subscriptionPlan.findFirst({ where: { name: 'monthly' } });
    if (!monthlyPlan) {
      await db.subscriptionPlan.createMany({
        data: [
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
      results.push('Subscription plans created');
    } else {
      results.push('Subscription plans already exist');
    }

    // ===== 5. إنشاء مزودي AI =====
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

    // ===== 6. إنشاء أقسام الصفحة الرئيسية =====
    const existingSections = await db.landingPageSection.count();
    if (existingSections === 0) {
      await db.landingPageSection.createMany({
        data: [
          { sectionKey: 'hero', title: 'NutriClinic', titleAr: 'نوتري كلينيك', subtitle: 'Smart Nutrition Clinic Management Powered by AI', subtitleAr: 'أدر عيادة التغذية بذكاء وسهولة', content: 'Comprehensive platform for managing nutrition clinics powered by AI', contentAr: 'منصة متكاملة لإدارة عيادات التغذية مدعومة بالذكاء الاصطناعي. أدر مرضاك، خطط التغذية والتمارين، وتابع التقدم — كل ذلك من مكان واحد.', imageUrl: '/hero-dashboard.webp', isVisible: true, sortOrder: 1 },
          { sectionKey: 'stats', title: 'Statistics', titleAr: 'إحصائيات المنصة', isVisible: true, sortOrder: 2 },
          { sectionKey: 'features', title: 'Features', titleAr: 'المميزات', subtitle: 'Everything a nutritionist needs', subtitleAr: 'كل ما يحتاجه طبيب التغذية', isVisible: true, sortOrder: 3 },
          { sectionKey: 'ai_showcase', title: 'AI Assistant', titleAr: 'المساعد الذكي', subtitle: 'Smart assistant for every patient', subtitleAr: 'مساعد ذكي يفهم احتياجات كل مريض', contentAr: 'المساعد الذكي في NutriClinic يستخدم أحدث نماذج الذكاء الاصطناعي من OpenAI و Gemini و Claude مع نظام احتياطي تلقائي يضمن عدم توقف الخدمة.', imageUrl: '/hero-ai.webp', isVisible: true, sortOrder: 4 },
          { sectionKey: 'how_it_works', title: 'How It Works', titleAr: 'كيف تعمل', subtitleAr: 'أربع خطوات فقط لبدء إدارة عيادتك بذكاء', isVisible: true, sortOrder: 5 },
          { sectionKey: 'pricing', title: 'Pricing', titleAr: 'الأسعار', subtitleAr: 'خطط تناسب احتياجاتك', isVisible: true, sortOrder: 6 },
          { sectionKey: 'nutrition_showcase', title: 'Nutrition Plans', titleAr: 'خطط التغذية', subtitleAr: 'خطط تغذية دقيقة لكل مريض', imageUrl: '/hero-doctor.webp', isVisible: true, sortOrder: 7 },
          { sectionKey: 'testimonials', title: 'Testimonials', titleAr: 'آراء العملاء', subtitleAr: 'ماذا يقول أطباؤنا', isVisible: true, sortOrder: 8 },
          { sectionKey: 'faq', title: 'FAQ', titleAr: 'الأسئلة الشائعة', isVisible: true, sortOrder: 9 },
          { sectionKey: 'cta', title: 'Call to Action', titleAr: 'جاهز لتحويل عيادتك إلى المستقبل الرقمي؟', subtitleAr: 'انضم إلى أكثر من 2,450 طبيب يستخدمون NutriClinic لإدارة عياداتهم بذكاء. ابدأ مجاناً اليوم بدون بطاقة ائتمان.', isVisible: true, sortOrder: 10 },
          { sectionKey: 'free_trial', title: 'Free Trial', titleAr: 'تجربة مجانية', contentAr: 'ابدأ مجاناً اليوم بدون بطاقة ائتمان. إعداد في دقيقة واحدة فقط.', isVisible: true, sortOrder: 11 },
          { sectionKey: 'footer', title: 'Footer', titleAr: 'تذييل الموقع', isVisible: true, sortOrder: 12 },
        ],
      });
      results.push('Landing page sections created');
    } else {
      results.push('Landing page sections already exist');
    }

    // ===== 7. إنشاء عناصر الأقسام =====
    const existingItems = await db.landingPageItem.count();
    if (existingItems === 0) {
      await db.landingPageItem.createMany({
        data: [
          { sectionKey: 'features', title: 'Patient Management', titleAr: 'إدارة المرضى المتكاملة', descriptionAr: 'ملفات مرضى شاملة مع بيانات InBody، التاريخ الطبي، ومؤشرات الجسم.', iconName: 'Users', sortOrder: 1, isVisible: true },
          { sectionKey: 'features', title: 'AI Assistant', titleAr: 'مساعد ذكي بالذكاء الاصطناعي', descriptionAr: 'مساعد طبي مدعوم بالذكاء الاصطناعي يساعدك في وضع خطط التغذية والتمارين بذكاء.', iconName: 'Bot', sortOrder: 2, isVisible: true },
          { sectionKey: 'features', title: 'Smart Nutrition Plans', titleAr: 'خطط التغذية الذكية', descriptionAr: 'حساب تلقائي للمكرونات بناءً على BMR و TDEE. خطط أسبوعية تتكيف مع تقدم المريض.', iconName: 'ClipboardList', sortOrder: 3, isVisible: true },
          { sectionKey: 'features', title: 'Exercise Plans', titleAr: 'خطط التمارين الرياضية', descriptionAr: 'أنشئ خطط تمارين مخصصة لكل مريض بناءً على حالته البدنية وأهدافه.', iconName: 'Dumbbell', sortOrder: 4, isVisible: true },
          { sectionKey: 'features', title: 'Reports', titleAr: 'تقارير وإحصائيات متقدمة', descriptionAr: 'لوحة تحكم تفاعلية مع إحصائيات شاملة وتتبع لحظي.', iconName: 'BarChart3', sortOrder: 5, isVisible: true },
          { sectionKey: 'features', title: 'Security', titleAr: 'حماية وأمان متقدم', descriptionAr: 'تشفير كامل للبيانات مع Prepared Statements لحماية من SQL Injection.', iconName: 'Shield', sortOrder: 6, isVisible: true },
          { sectionKey: 'how_it_works', title: 'Register', titleAr: 'سجّل حسابك', descriptionAr: 'أنشئ حسابك في أقل من دقيقة.', iconName: 'Smartphone', sortOrder: 1, isVisible: true },
          { sectionKey: 'how_it_works', title: 'Add Patients', titleAr: 'أضف مرضاك', descriptionAr: 'سجّل بيانات المرضى الأولية والقياسات الجسدية.', iconName: 'Users', sortOrder: 2, isVisible: true },
          { sectionKey: 'how_it_works', title: 'Use AI', titleAr: 'استخدم المساعد الذكي', descriptionAr: 'دع الذكاء الاصطناعي يساعدك في وضع الخطط المثلى.', iconName: 'Sparkles', sortOrder: 3, isVisible: true },
          { sectionKey: 'how_it_works', title: 'Track', titleAr: 'تتبع التقدم', descriptionAr: 'تابع تحسن مرضاك وقم بتعديل الخطط تلقائياً.', iconName: 'TrendingUp', sortOrder: 4, isVisible: true },
          { sectionKey: 'testimonials', title: 'Dr. Sarah Ahmed', titleAr: 'د. سارة أحمد', descriptionAr: 'NutriClinic غيّر طريقة عملي بالكامل. المساعد الذكي يوفر عليّ ساعات في إعداد الخطط الغذائية.', linkUrl: 'أخصائية تغذية علاجية', sortOrder: 1, isVisible: true },
          { sectionKey: 'testimonials', title: 'Dr. Mohammed Al-Ali', titleAr: 'د. محمد العلي', descriptionAr: 'أفضل منصة استخدمتها لإدارة العيادة. نظام المكرونات التلقائي دقيق جداً.', linkUrl: 'استشاري السمنة والنحافة', sortOrder: 2, isVisible: true },
          { sectionKey: 'testimonials', title: 'Dr. Noura Al-Khalid', titleAr: 'د. نورة الخالد', descriptionAr: 'تكامل خطط التغذية مع خطط التمارين جعل حياتي أسهل كثيراً.', linkUrl: 'أخصائية تغذية رياضية', sortOrder: 3, isVisible: true },
          { sectionKey: 'faq', title: 'Free trial?', titleAr: 'هل يمكنني تجربة المنصة مجاناً؟', descriptionAr: 'نعم! يمكنك التسجيل والبدء في استخدام المنصة مباشرة.', sortOrder: 1, isVisible: true },
          { sectionKey: 'faq', title: 'Data safety?', titleAr: 'هل بيانات مرضاي آمنة؟', descriptionAr: 'بالتأكيد. نستخدم أحدث تقنيات التشفير وحماية البيانات.', sortOrder: 2, isVisible: true },
          { sectionKey: 'faq', title: 'Cancel anytime?', titleAr: 'هل يمكنني إلغاء اشتراكي في أي وقت؟', descriptionAr: 'نعم، يمكنك الإلغاء في أي وقت بدون رسوم إضافية.', sortOrder: 3, isVisible: true },
          { sectionKey: 'faq', title: 'How AI works?', titleAr: 'كيف يعمل المساعد الذكي؟', descriptionAr: 'يستخدم نماذج AI متقدمة من OpenAI, Gemini, Claude مع نظام احتياطي تلقائي.', sortOrder: 4, isVisible: true },
          { sectionKey: 'faq', title: 'Mobile friendly?', titleAr: 'هل المنصة متوافقة مع الهواتف؟', descriptionAr: 'نعم، المنصة مصممة لتعمل بكفاءة على جميع الأجهزة.', sortOrder: 5, isVisible: true },
          { sectionKey: 'stats', title: 'Active Doctors', titleAr: 'طبيب نشط', description: '+2,450', iconName: 'Heart', sortOrder: 1, isVisible: true },
          { sectionKey: 'stats', title: 'Registered Patients', titleAr: 'مريض مسجل', description: '+25,000', iconName: 'Users', sortOrder: 2, isVisible: true },
          { sectionKey: 'stats', title: 'Smart Plans', titleAr: 'خطة ذكية', description: '+15,000', iconName: 'Sparkles', sortOrder: 3, isVisible: true },
          { sectionKey: 'stats', title: 'Uptime', titleAr: 'وقت التشغيل', description: '99.9%', iconName: 'Activity', sortOrder: 4, isVisible: true },
          { sectionKey: 'ai_showcase', title: 'Triple fallback', titleAr: 'نظام احتياطي ثلاثي (OpenAI → Gemini → Claude)', sortOrder: 1, isVisible: true },
          { sectionKey: 'ai_showcase', title: 'Auto macros', titleAr: 'حساب تلقائي للمكرونات بناءً على BMR و TDEE', sortOrder: 2, isVisible: true },
          { sectionKey: 'ai_showcase', title: 'Adaptive plans', titleAr: 'خطط أسبوعية تتكيف مع تقدم المريض', sortOrder: 3, isVisible: true },
          { sectionKey: 'ai_showcase', title: 'Smart chat', titleAr: 'محادثة ذكية لاستفسارات التغذية', sortOrder: 4, isVisible: true },
          { sectionKey: 'nutrition_showcase', title: 'BMR/TDEE', titleAr: 'حساب BMR/TDEE', iconName: 'Activity', sortOrder: 1, isVisible: true },
          { sectionKey: 'nutrition_showcase', title: 'Weekly Plans', titleAr: 'خطط أسبوعية', iconName: 'ClipboardList', sortOrder: 2, isVisible: true },
          { sectionKey: 'nutrition_showcase', title: 'Exercise Plans', titleAr: 'خطط تمارين', iconName: 'Dumbbell', sortOrder: 3, isVisible: true },
          { sectionKey: 'nutrition_showcase', title: 'Progress', titleAr: 'تتبع التقدم', iconName: 'BarChart3', sortOrder: 4, isVisible: true },
          { sectionKey: 'footer', title: 'Support', titleAr: 'الدعم', descriptionAr: 'تواصل مع فريق الدعم الفني في أي وقت', iconName: 'MessageCircle', sortOrder: 1, isVisible: true },
          { sectionKey: 'footer', title: 'Contact Us', titleAr: 'تواصل معنا', descriptionAr: 'نحن هنا لمساعدتك', iconName: 'Mail', linkUrl: '/contact', sortOrder: 2, isVisible: true },
          { sectionKey: 'footer', title: 'Platform', titleAr: 'المنصة', descriptionAr: 'تعرف على المزيد عن NutriClinic', iconName: 'Globe', linkUrl: '/about', sortOrder: 3, isVisible: true },
        ],
      });
      results.push('Landing page items created');
    } else {
      results.push('Landing page items already exist');
    }

    // ===== 8. إنشاء إعدادات الموقع =====
    const siteSettings = await db.systemSettings.findFirst({ where: { key: 'site_name' } });
    if (!siteSettings) {
      await db.systemSettings.createMany({
        data: [
          { key: 'site_name', value: 'NutriClinic' },
          { key: 'site_name_ar', value: 'نوتري كلينيك' },
          { key: 'site_logo_url', value: '/logo.png' },
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

    // ===== 9. إنشاء محتوى CMS =====
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

    return Response.json({
      success: true,
      message: 'تم إعداد قاعدة البيانات بنجاح',
      results,
      credentials: {
        admin: { email: 'admin@nutriclinic.com', password: adminPassword },
        doctor: { email: 'doctor@demo.com', password: doctorPassword },
      },
    });
  } catch (error) {
    console.error('Setup error:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء الإعداد';
    return Response.json({ error: message }, { status: 500 });
  }
}
