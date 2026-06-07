// ============================================================
// Seed Data - بيانات أولية للنظام
// ============================================================

import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // إنشاء حساب الإدارة الافتراضي
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
    console.log('✅ Admin account created');
  }

  // إنشاء خطط الاشتراك
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
    console.log('✅ Subscription plans created');
  }

  // إنشاء مزودي AI افتراضيين
  const openaiProvider = await db.aiProvider.findFirst({ where: { name: 'openai' } });
  if (!openaiProvider) {
    await db.aiProvider.createMany({
      data: [
        { name: 'openai', displayName: 'OpenAI', priority: 0, isActive: true },
        { name: 'gemini', displayName: 'Google Gemini', priority: 1, isActive: true },
        { name: 'claude', displayName: 'Anthropic Claude', priority: 2, isActive: true },
      ],
    });
    console.log('✅ AI providers created');
  }

  // إنشاء محتوى CMS افتراضي
  const heroContent = await db.cmsContent.findFirst({ where: { key: 'home_hero_title' } });
  if (!heroContent) {
    await db.cmsContent.createMany({
      data: [
        { key: 'home_hero_title', value: 'NutriClinic SaaS', valueAr: 'نوتري كلينيك', type: 'text', page: 'home' },
        { key: 'home_hero_subtitle', value: 'Smart Nutrition Clinic Management', valueAr: 'إدارة ذكية لعيادات التغذية', type: 'text', page: 'home' },
        { key: 'home_hero_description', value: 'AI-powered platform for nutrition professionals', valueAr: 'منصة مدعومة بالذكاء الاصطناعي لأخصائيي التغذية', type: 'text', page: 'home' },
      ],
    });
    console.log('✅ CMS content created');
  }

  // إنشاء طبيب تجريبي مفعل للاختبار
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
    console.log('✅ Demo doctor account created (doctor@demo.com / Doctor@2024)');
  }

  console.log('🎉 Seeding completed!');
}

seed().catch(console.error);
