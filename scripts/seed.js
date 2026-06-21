// ============================================================
// seed.js - زرع البيانات الأولية في قاعدة البيانات
// يعادل استدعاء POST /api/setup لكن من سطر الأوامر
// يُشغّل عبر: npm run db:seed
// ============================================================

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function generateId() {
  return require('crypto').randomBytes(12).toString('hex');
}

function parseDatabaseUrl(url) {
  if (!url) return null;
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:/?#]+)(?::(\d+))?\/([^?]+)/);
  if (!match) return null;
  const [, user, password, host, port, database] = match;
  return { host, port: port ? parseInt(port) : 3306, user, password: decodeURIComponent(password), database };
}

async function main() {
  console.log('🌱 Seeding NutriClinic database...');

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  const config = parsed || {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'nutriclinic_saas',
  };

  const conn = await mysql.createConnection(config);

  try {
    // ===== 1. حساب الإدارة =====
    const [adminRows] = await conn.execute('SELECT id FROM User WHERE email = ? LIMIT 1', ['admin@nutriclinic.com']);
    if (adminRows.length === 0) {
      const hashedPassword = await bcrypt.hash('Admin@2024', 12);
      await conn.execute(
        'INSERT INTO User (id, email, password, name, role, isActive) VALUES (?, ?, ?, ?, ?, ?)',
        [generateId(), 'admin@nutriclinic.com', hashedPassword, 'مدير النظام', 'admin', 1]
      );
      console.log('✅ Admin account created: admin@nutriclinic.com / Admin@2024');
    } else {
      console.log('ℹ️  Admin account already exists');
    }

    // ===== 2. طبيب تجريبي =====
    const [doctorRows] = await conn.execute('SELECT id FROM User WHERE email = ? LIMIT 1', ['doctor@demo.com']);
    if (doctorRows.length === 0) {
      const hashedPassword = await bcrypt.hash('Doctor@2024', 12);
      await conn.execute(
        'INSERT INTO User (id, email, password, name, role, isActive, phone, specialization, clinicName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [generateId(), 'doctor@demo.com', hashedPassword, 'د. أحمد محمد', 'doctor', 1, '+201012345678', 'تغذية علاجية', 'عيادة التغذية الصحية']
      );
      console.log('✅ Demo doctor created: doctor@demo.com / Doctor@2024');
    } else {
      console.log('ℹ️  Demo doctor already exists');
    }

    // ===== 3. خطط الاشتراك =====
    const [planRows] = await conn.execute("SELECT id FROM SubscriptionPlan WHERE name = ? LIMIT 1", ['monthly']);
    if (planRows.length === 0) {
      const monthlyFeatures = JSON.stringify(['إدارة غير محدودة للمرضى', 'مساعد ذكي AI', 'خطط تغذية وتمارين', 'تقارير وتحليلات']);
      const yearlyFeatures = JSON.stringify(['إدارة غير محدودة للمرضى', 'مساعد ذكي AI', 'خطط تغذية وتمارين', 'تقارير وتحليلات', 'دعم فني أولوية', 'خصم 17% مقارنة بالشهري']);
      await conn.execute(
        'INSERT INTO SubscriptionPlan (id, name, nameAr, price, currency, durationDays, features, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [generateId(), 'monthly', 'اشتراك شهري', 299, 'EGP', 30, monthlyFeatures, 1]
      );
      await conn.execute(
        'INSERT INTO SubscriptionPlan (id, name, nameAr, price, currency, durationDays, features, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [generateId(), 'yearly', 'اشتراك سنوي', 2999, 'EGP', 365, yearlyFeatures, 1]
      );
      console.log('✅ Subscription plans created (monthly, yearly)');
    } else {
      console.log('ℹ️  Subscription plans already exist');
    }

    // ===== 4. مزودي AI =====
    const [providerRows] = await conn.execute("SELECT id FROM AiProvider WHERE name = ? LIMIT 1", ['openai']);
    if (providerRows.length === 0) {
      await conn.execute(
        'INSERT INTO AiProvider (id, name, displayName, priority, isActive) VALUES (?, ?, ?, ?, ?)',
        [generateId(), 'openai', 'OpenAI', 0, 1]
      );
      await conn.execute(
        'INSERT INTO AiProvider (id, name, displayName, priority, isActive) VALUES (?, ?, ?, ?, ?)',
        [generateId(), 'gemini', 'Google Gemini', 1, 1]
      );
      await conn.execute(
        'INSERT INTO AiProvider (id, name, displayName, priority, isActive) VALUES (?, ?, ?, ?, ?)',
        [generateId(), 'claude', 'Anthropic Claude', 2, 1]
      );
      console.log('✅ AI providers created (openai, gemini, claude)');
    } else {
      console.log('ℹ️  AI providers already exist');
    }

    console.log('\n🎉 Seeding complete!');
    console.log('\nDefault credentials:');
    console.log('  Admin:  admin@nutriclinic.com / Admin@2024');
    console.log('  Doctor: doctor@demo.com / Doctor@2024');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
