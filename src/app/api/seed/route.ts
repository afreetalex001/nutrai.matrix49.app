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

    // Create subscription plans
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
