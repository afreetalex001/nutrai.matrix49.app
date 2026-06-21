// ============================================================
// db-init.js - تهيئة قاعدة بيانات MySQL من schema.sql
// يُشغّل عبر: npm run db:init
// ============================================================

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// parse mysql:// URL
function parseDatabaseUrl(url) {
  if (!url) return null;
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:/?#]+)(?::(\d+))?\/([^?]+)/);
  if (!match) return null;
  const [, user, password, host, port, database] = match;
  return { host, port: port ? parseInt(port) : 3306, user, password: decodeURIComponent(password), database };
}

async function main() {
  console.log('🌱 Initializing MySQL database schema...');

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  const config = parsed || {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'nutriclinic_saas',
  };

  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   DB:   ${config.database}`);
  console.log(`   User: ${config.user}`);

  // اتصال بدون تحديد database لإنشائها إن لم تكن موجودة
  const serverConfig = { ...config };
  delete serverConfig.database;

  let conn;
  try {
    conn = await mysql.createConnection(serverConfig);

    // إنشاء قاعدة البيانات إن لم تكن موجودة
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database '${config.database}' ready`);

    await conn.query(`USE \`${config.database}\``);

    // قراءة وتنفيذ schema.sql
    const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // تقسيم الـ SQL إلى statements منفصلة (حسب الفاصلة المنقوطة في نهاية السطر)
    // مع تجاهل الأسطر التي تبدأ بـ -- (تعليقات)
    const statements = schemaSql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.match(/^SET\s+/i));

    console.log(`📋 Executing ${statements.length} SQL statements...`);

    let success = 0;
    let skipped = 0;
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        success++;
      } catch (err) {
        // تخطي الجداول الموجودة (ER_TABLE_EXISTS_ERROR = 1050)
        if (err.errno === 1050) {
          skipped++;
        } else {
          console.error(`❌ SQL error: ${err.message}`);
          console.error(`   Statement: ${stmt.substring(0, 100)}...`);
          throw err;
        }
      }
    }

    console.log(`✅ Schema applied: ${success} statements executed, ${skipped} tables already existed`);

    // التحقق من الجداول
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [config.database]
    );
    console.log(`📊 Tables in '${config.database}':`);
    for (const t of tables) {
      console.log(`   - ${t.TABLE_NAME}`);
    }

    console.log('\n🎉 Database initialization complete!');
    console.log('\nNext steps:');
    console.log('  1. POST /api/setup with setupKey to seed default data');
    console.log('     curl -X POST https://your-domain/api/setup -H "Content-Type: application/json" -d \'{"setupKey":"nutriclinic-setup-2024"}\'');
  } catch (err) {
    console.error('\n❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
