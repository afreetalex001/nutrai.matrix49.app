// ============================================================
// mysql2 Connection Module
// وحدة الاتصال بقاعدة البيانات MySQL باستخدام mysql2
// حماية مطلقة ضد SQL Injection عبر Prepared Statements
// ============================================================

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ====== إعدادات الاتصال ======
// نقرأ DATABASE_URL أولاً (mysql://user:pass@host:port/db) ثم نسقط للمتغيرات المنفصلة
function parseDatabaseUrl(url: string | undefined) {
  if (!url) return null;
  // mysql://user:pass@host:port/db?ssl=true
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:/?#]+)(?::(\d+))?\/([^?]+)/);
  if (!match) return null;
  const [, user, password, host, port, database] = match;
  return {
    host,
    port: port ? parseInt(port) : 3306,
    user,
    password: decodeURIComponent(password),
    database,
  };
}

const parsedUrl = parseDatabaseUrl(process.env.DATABASE_URL);

const DB_CONFIG = {
  host: parsedUrl?.host || process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(parsedUrl?.port ? String(parsedUrl.port) : (process.env.MYSQL_PORT || process.env.DB_PORT || '3306')),
  user: parsedUrl?.user || process.env.MYSQL_USER || process.env.DB_USER || 'root',
  password: parsedUrl?.password || process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: parsedUrl?.database || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'nutriclinic_saas',
  waitForConnections: true,
  connectionLimit: 20,        // حد أقصى للاتصالات المتزامنة
  queueLimit: 0,              // بدون حد لانتظار الاتصالات
  enableKeepAlive: true,      // الحفاظ على الاتصال حياً
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',         // دعم كامل للعربية والإيموجي
  timezone: '+00:00',         // UTC
  dateStrings: false,         // إرجاع التواريخ كـ Date objects
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
        console.log('[MySQL] Pool connected successfully');
        conn.release();
      })
      .catch((err: Error) => {
        console.error('[MySQL] Pool connection failed:', err.message);
      });
  }
  return pool;
}

/**
 * تنفيذ استعلام SELECT آمن باستخدام Prepared Statements
 * يحظر تماماً دمج القيم مباشرة في SQL
 *
 * @param sql - الاستعلام مع علامات الاستفهام (?) كـ placeholders
 * @param params - القيم المراد ربطها بالاستعلام
 * @returns نتائج الاستعلام (array of rows)
 */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const p = getPool();
  try {
    const [rows] = await p.execute<T>(sql, params);
    return rows;
  } catch (error) {
    console.error('[MySQL] Query error:', { sql: sql.substring(0, 200), error: (error as Error)?.message });
    throw error;
  }
}

/**
 * تنفيذ استعلام SELECT آمن باستخدام query() (بدل execute) لدعم PLACEHOLDERS ديناميكية
 * يُستخدم عندما يكون عدد الـ placeholders متغيراً (مثل IN (?, ?, ?))
 *
 * @param sql - الاستعلام مع علامات الاستفهام (?) كـ placeholders
 * @param params - القيم المراد ربطها بالاستعلام
 * @returns نتائج الاستعلام (array of rows)
 */
export async function queryRaw<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const p = getPool();
  try {
    const [rows] = await p.query<T>(sql, params);
    return rows;
  } catch (error) {
    console.error('[MySQL] QueryRaw error:', { sql: sql.substring(0, 200), error: (error as Error)?.message });
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
  const p = getPool();
  try {
    const [result] = await p.execute<ResultSetHeader>(sql, params);
    return result;
  } catch (error) {
    console.error('[MySQL] Execute error:', { sql: sql.substring(0, 200), error: (error as Error)?.message });
    throw error;
  }
}

/**
 * تنفيذ استعلام INSERT/UPDATE/DELETE مع placeholders ديناميكية
 */
export async function executeRaw(
  sql: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const p = getPool();
  try {
    const [result] = await p.query<ResultSetHeader>(sql, params);
    return result;
  } catch (error) {
    console.error('[MySQL] ExecuteRaw error:', { sql: sql.substring(0, 200), error: (error as Error)?.message });
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
  const p = getPool();
  const connection = await p.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('[MySQL] Transaction rolled back:', (error as Error)?.message);
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

/**
 * إغلاق تجمع الاتصالات (للاختبارات فقط)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export { RowDataPacket, ResultSetHeader, PoolConnection };
export default { getPool, query, queryRaw, execute, executeRaw, transaction, healthCheck, closePool };
