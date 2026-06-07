// ============================================================
// mysql2 Connection Module - Prepared Statements Only
// وحدة الاتصال بقاعدة البيانات MySQL باستخدام mysql2
// حماية مطلقة ضد SQL Injection عبر الاستعلامات المجهزة
// ============================================================

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ====== إعدادات الاتصال ======
const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'nutriclinic_saas',
  waitForConnections: true,
  connectionLimit: 20,        // حد أقصى للاتصالات المتزامنة
  queueLimit: 0,              // بدون حد لانتظار الاتصالات
  enableKeepAlive: true,      // الحفاظ على الاتصال حياً
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',        // دعم كامل للعربية والإيموجي
  timezone: '+00:00',        // UTC
};

// ====== Singleton Pool Pattern ======
let pool: Pool | null = null;

/**
 * الحصول على تجمع الاتصالات (Connection Pool)
 * يُنشأ مرة واحدة فقط ويُعاد استخدامه
 */
export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);

    // اختبار الاتصال عند الإنشاء
    pool.getConnection()
      .then((conn: PoolConnection) => {
        console.log('[MySQL] ✅ Pool connected successfully');
        conn.release();
      })
      .catch((err: Error) => {
        console.error('[MySQL] ❌ Pool connection failed:', err.message);
      });
  }
  return pool;
}

/**
 * تنفيذ استعلام آمن باستخدام Prepared Statements
 * يحظر تماماً دمج القيم مباشرة في SQL
 *
 * @param sql - الاستعلام مع علامات الاستفهام (?) كـ placeholders
 * @param params - القيم المراد ربطها بالاستعلام
 * @returns نتائج الاستعلام
 */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const pool = getPool();
  try {
    const [rows] = await pool.execute<T>(sql, params);
    return rows;
  } catch (error) {
    console.error('[MySQL] Query error:', { sql: sql.substring(0, 100), error });
    throw error;
  }
}

/**
 * تنفيذ استعلام INSERT/UPDATE/DELETE آمن
 *
 * @param sql - الاستعلام مع علامات الاستفهام (?) كـ placeholders
 * @param params - القيم المراد ربطها بالاستعلام
 * @returns معلومات النتيجة (insertId, affectedRows, etc.)
 */
export async function execute(
  sql: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const pool = getPool();
  try {
    const [result] = await pool.execute<ResultSetHeader>(sql, params);
    return result;
  } catch (error) {
    console.error('[MySQL] Execute error:', { sql: sql.substring(0, 100), error });
    throw error;
  }
}

/**
 * تنفيذ استعلام داخل معاملة (Transaction)
 * يضمن تكامل البيانات عند تنفيذ عمليات متعددة
 *
 * @param callback - دالة تحتوي على الاستعلامات المراد تنفيذها كمعاملة واحدة
 * @returns نتيجة المعاملة
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('[MySQL] Transaction rolled back:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * فحص صحة الاتصال بقاعدة البيانات
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query<RowDataPacket[]>('SELECT 1 AS health');
    return true;
  } catch {
    return false;
  }
}

// ====== أمثلة على الاستخدام الآمن ======

/**
 * مثال: إنشاء مستخدم جديد (Prepared Statement)
 */
export async function createUser(email: string, hashedPassword: string, name: string) {
  return execute(
    'INSERT INTO User (id, email, password, name, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
    [crypto.randomUUID(), email, hashedPassword, name, 'doctor', false]
  );
}

/**
 * مثال: البحث عن مستخدم بالبريد الإلكتروني (Prepared Statement)
 */
export async function findUserByEmail(email: string) {
  const rows = await query<RowDataPacket[]>(
    'SELECT * FROM User WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

/**
 * مثال: تحديث حالة تفعيل المستخدم (Prepared Statement)
 */
export async function activateUser(userId: string) {
  return execute(
    'UPDATE User SET isActive = ?, updatedAt = datetime("now") WHERE id = ?',
    [true, userId]
  );
}

/**
 * مثال: إنشاء مريض جديد مع حساب الماكروز (Transaction)
 */
export async function createPatientWithMacros(
  doctorId: string,
  patientData: {
    name: string; phone?: string; gender?: string;
    age?: number; height?: number; weight?: number;
    activityLevel?: string; goal?: string;
    caloriesTarget?: number; proteinTarget?: number;
    carbsTarget?: number; fatsTarget?: number;
  }
) {
  return transaction(async (conn) => {
    const patientId = crypto.randomUUID();

    // إدراج المريض
    await conn.execute(
      `INSERT INTO Patient (id, doctorId, name, phone, gender, age, height, weight,
       activityLevel, goal, caloriesTarget, proteinTarget, carbsTarget, fatsTarget,
       isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
      [patientId, doctorId, patientData.name, patientData.phone || null,
       patientData.gender || null, patientData.age || null,
       patientData.height || null, patientData.weight || null,
       patientData.activityLevel || null, patientData.goal || null,
       patientData.caloriesTarget || null, patientData.proteinTarget || null,
       patientData.carbsTarget || null, patientData.fatsTarget || null]
    );

    // إنشاء زيارة أولى
    await conn.execute(
      `INSERT INTO Visit (id, patientId, weight, height, visitDate, createdAt)
       VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))`,
      [crypto.randomUUID(), patientId, patientData.weight || null, patientData.height || null]
    );

    return { patientId };
  });
}

export default { getPool, query, execute, transaction, healthCheck };
