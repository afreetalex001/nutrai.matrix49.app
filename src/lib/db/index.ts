// ============================================================
// Prisma-Compatible Database Facade (Backed by mysql2)
// واجهة متوافقة مع Prisma مدعومة بـ mysql2
//
// هذه الواجهة تُترجم استدعاءات Prisma-style إلى استعلامات MySQL
// مُعلمة (Prepared Statements) لضمان الأمان التام ضد SQL Injection.
//
// تدعم:
// - findUnique / findFirst / findMany
// - create / createMany
// - update / updateMany
// - upsert
// - delete / deleteMany
// - count
// - groupBy / aggregate
// - include (with nested where, orderBy, take, skip, select)
// - select (column projection)
// - where operators: equals, OR, AND, NOT, in, notIn, contains, gte, gt, lte, lt, isNull, isNotNull
// - relation filters (e.g. { plan: { name: 'monthly' } })
// - orderBy (single field or array, asc/desc)
// - take / skip / distinct
// - _count, _sum, _avg aggregations
// ============================================================

import { randomBytes } from 'crypto';
import {
  query,
  queryRaw,
  execute,
  executeRaw,
  transaction,
  RowDataPacket,
  ResultSetHeader,
  PoolConnection,
} from '../mysql';

// ============ Helpers ============

/**
 * توليد معرف فريد بصيغة hex 24 حرف (متوافق مع cuid من حيث الطول)
 */
export function generateId(): string {
  return randomBytes(12).toString('hex');
}

/**
 * تحويل قيمة JS إلى قيمة MySQL
 * - boolean → 1/0
 * - Date → 'YYYY-MM-DD HH:MM:SS'
 * - undefined → null
 * - objects/arrays → JSON string
 */
function toDbValue(v: unknown): unknown {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v;
  if (Array.isArray(v) || (typeof v === 'object' && v !== null && !(v instanceof Date))) {
    return JSON.stringify(v);
  }
  return v;
}

/**
 * تحويل قيمة MySQL إلى قيمة JS بناءً على نوع الحقل
 */
function fromDbValue(v: unknown, fieldType?: 'boolean' | 'date' | 'json'): unknown {
  if (v === null || v === undefined) return null;
  if (fieldType === 'boolean') return v === 1 || v === true;
  if (fieldType === 'date') {
    if (v instanceof Date) return v;
    if (typeof v === 'string') return new Date(v);
    return v;
  }
  if (fieldType === 'json') {
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return v; }
    }
    return v;
  }
  return v;
}

/**
 * تحويل اسم حقل Prisma (camelCase) إلى اسم عمود MySQL
 * في الـ schema الخاص بنا، الأسماء متطابقة (Prisma لا يحول camelCase إلى snake_case تلقائياً)
 */
function col(name: string): string {
  // أسماء الحقول آمنة (تأتي من schema ثابت) - لكن نتحقق من أنها أحرف/أرقام فقط
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid column name: ${name}`);
  }
  return `\`${name}\``;
}

function table(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: ${name}`);
  }
  return `\`${name}\``;
}

// ============ Schema Metadata ============

type RelationType = 'one' | 'many';

interface RelationDef {
  type: RelationType;
  model: string;       // اسم الموديل المرتبط (lowercase)
  foreignKey: string;  // اسم عمود الـ FK
  owner: 'self' | 'related'; // self = FK على هذا الجدول، related = FK على الجدول المرتبط
}

interface ModelMeta {
  table: string;
  uniques?: string[];
  boolFields?: string[];
  dateFields?: string[];
  jsonFields?: string[];
  relations?: Record<string, RelationDef>;
}

const MODELS: Record<string, ModelMeta> = {
  user: {
    table: 'User',
    uniques: ['email'],
    boolFields: ['isActive', 'emailVerified'],
    dateFields: ['emailVerifiedAt', 'createdAt', 'updatedAt'],
    relations: {
      subscription: { type: 'one', model: 'subscription', foreignKey: 'userId', owner: 'related' },
      patients: { type: 'many', model: 'patient', foreignKey: 'doctorId', owner: 'related' },
      aiConversations: { type: 'many', model: 'aiConversation', foreignKey: 'userId', owner: 'related' },
    },
  },
  subscriptionPlan: {
    table: 'SubscriptionPlan',
    boolFields: ['isActive'],
    dateFields: ['createdAt', 'updatedAt'],
    relations: {
      subscriptions: { type: 'many', model: 'subscription', foreignKey: 'planId', owner: 'related' },
    },
  },
  subscription: {
    table: 'Subscription',
    uniques: ['userId'],
    dateFields: ['startDate', 'endDate', 'createdAt', 'updatedAt'],
    relations: {
      user: { type: 'one', model: 'user', foreignKey: 'userId', owner: 'self' },
      plan: { type: 'one', model: 'subscriptionPlan', foreignKey: 'planId', owner: 'self' },
    },
  },
  patient: {
    table: 'Patient',
    boolFields: ['isActive'],
    dateFields: ['dateOfBirth', 'aiSummaryAt', 'createdAt', 'updatedAt'],
    jsonFields: ['inBodyData'],
    relations: {
      doctor: { type: 'one', model: 'user', foreignKey: 'doctorId', owner: 'self' },
      visits: { type: 'many', model: 'visit', foreignKey: 'patientId', owner: 'related' },
      nutritionPlans: { type: 'many', model: 'nutritionPlan', foreignKey: 'patientId', owner: 'related' },
      exercisePlans: { type: 'many', model: 'exercisePlan', foreignKey: 'patientId', owner: 'related' },
      shareTokens: { type: 'many', model: 'patientShareToken', foreignKey: 'patientId', owner: 'related' },
      selfReports: { type: 'many', model: 'patientSelfReport', foreignKey: 'patientId', owner: 'related' },
    },
  },
  patientShareToken: {
    table: 'PatientShareToken',
    uniques: ['token'],
    boolFields: ['canViewPlans', 'canSubmitWeight', 'canSubmitNote', 'isRevoked'],
    dateFields: ['expiresAt', 'lastAccessedAt', 'createdAt'],
    relations: {
      patient: { type: 'one', model: 'patient', foreignKey: 'patientId', owner: 'self' },
    },
  },
  patientSelfReport: {
    table: 'PatientSelfReport',
    boolFields: ['isRead'],
    dateFields: ['readAt', 'createdAt'],
    relations: {
      patient: { type: 'one', model: 'patient', foreignKey: 'patientId', owner: 'self' },
    },
  },
  visit: {
    table: 'Visit',
    dateFields: ['visitDate', 'createdAt'],
    relations: {
      patient: { type: 'one', model: 'patient', foreignKey: 'patientId', owner: 'self' },
    },
  },
  nutritionPlan: {
    table: 'NutritionPlan',
    boolFields: ['isAdaptive', 'isActive'],
    dateFields: ['createdAt', 'updatedAt'],
    relations: {
      patient: { type: 'one', model: 'patient', foreignKey: 'patientId', owner: 'self' },
    },
  },
  exercisePlan: {
    table: 'ExercisePlan',
    boolFields: ['isAdaptive', 'isActive'],
    dateFields: ['createdAt', 'updatedAt'],
    relations: {
      patient: { type: 'one', model: 'patient', foreignKey: 'patientId', owner: 'self' },
    },
  },
  foodItem: {
    table: 'FoodItem',
    boolFields: ['isVegetarian', 'isVegan', 'isGlutenFree', 'isHalal', 'isCustom', 'isActive'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  aiProvider: {
    table: 'AiProvider',
    boolFields: ['isActive', 'isDeleted'],
    dateFields: ['deletedAt', 'createdAt', 'updatedAt'],
    relations: {
      apiKeys: { type: 'many', model: 'aiApiKey', foreignKey: 'providerId', owner: 'related' },
      usageLogs: { type: 'many', model: 'aiUsageLog', foreignKey: 'providerId', owner: 'related' },
    },
  },
  aiApiKey: {
    table: 'AiApiKey',
    boolFields: ['isActive'],
    dateFields: ['quotaResetAt', 'lastErrorAt', 'createdAt', 'updatedAt'],
    relations: {
      provider: { type: 'one', model: 'aiProvider', foreignKey: 'providerId', owner: 'self' },
      usageLogs: { type: 'many', model: 'aiUsageLog', foreignKey: 'apiKeyId', owner: 'related' },
    },
  },
  aiUsageLog: {
    table: 'AiUsageLog',
    boolFields: ['isSuccess'],
    dateFields: ['createdAt'],
    relations: {
      apiKey: { type: 'one', model: 'aiApiKey', foreignKey: 'apiKeyId', owner: 'self' },
      provider: { type: 'one', model: 'aiProvider', foreignKey: 'providerId', owner: 'self' },
    },
  },
  aiConversation: {
    table: 'AiConversation',
    dateFields: ['createdAt', 'updatedAt'],
    relations: {
      user: { type: 'one', model: 'user', foreignKey: 'userId', owner: 'self' },
      messages: { type: 'many', model: 'aiMessage', foreignKey: 'conversationId', owner: 'related' },
    },
  },
  aiMessage: {
    table: 'AiMessage',
    dateFields: ['createdAt'],
    relations: {
      conversation: { type: 'one', model: 'aiConversation', foreignKey: 'conversationId', owner: 'self' },
    },
  },
  cmsContent: {
    table: 'CmsContent',
    uniques: ['key'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  landingPageSection: {
    table: 'LandingPageSection',
    uniques: ['sectionKey'],
    boolFields: ['isVisible'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  landingPageItem: {
    table: 'LandingPageItem',
    boolFields: ['isVisible'],
    dateFields: ['createdAt', 'updatedAt'],
  },
  systemSettings: {
    table: 'SystemSettings',
    uniques: ['key'],
    dateFields: ['createdAt', 'updatedAt'],
  },

  siteVisitor: {
    table: 'SiteVisitor',
    uniques: ['visitorId'],
    dateFields: ['firstSeenAt', 'lastSeenAt', 'createdAt', 'updatedAt'],
  },

  verificationCode: {
    table: 'VerificationCode',
    boolFields: [],
    dateFields: ['expiresAt', 'usedAt', 'createdAt', 'updatedAt'],
  },
  systemErrorLog: {
    table: 'SystemErrorLog',
    boolFields: ['isResolved'],
    dateFields: ['resolvedAt', 'createdAt', 'updatedAt'],
    jsonFields: ['metadata'],
    relations: {
      user: { type: 'one', model: 'user', foreignKey: 'userId', owner: 'self' },
    },
  },
};

// ============ Where Builder ============

interface BuiltWhere {
  sql: string;
  params: unknown[];
}

/**
 * بناء جملة WHERE من كائن Prisma-style
 *
 * يدعم:
 * - مساواة مباشرة: { field: value }
 * - عوامل: { field: { contains, in, notIn, gte, gt, lte, lt, equals, not } }
 * - منطقية: { AND: [...], OR: [...], NOT: {...} }
 * - فلاتر العلاقات: { relation: { field: value } } → EXISTS subquery
 */
function buildWhere(modelName: string, where: Record<string, unknown> | undefined): BuiltWhere {
  if (!where || Object.keys(where).length === 0) {
    return { sql: '', params: [] };
  }

  const meta = MODELS[modelName];
  const conditions: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (key === 'AND') {
      const subConditions: string[] = [];
      for (const subWhere of value as Record<string, unknown>[]) {
        const sub = buildWhere(modelName, subWhere);
        if (sub.sql) {
          subConditions.push(`(${sub.sql})`);
          params.push(...sub.params);
        }
      }
      if (subConditions.length > 0) {
        conditions.push(`(${subConditions.join(' AND ')})`);
      }
      continue;
    }

    if (key === 'OR') {
      const subConditions: string[] = [];
      for (const subWhere of value as Record<string, unknown>[]) {
        const sub = buildWhere(modelName, subWhere);
        if (sub.sql) {
          subConditions.push(`(${sub.sql})`);
          params.push(...sub.params);
        }
      }
      if (subConditions.length > 0) {
        conditions.push(`(${subConditions.join(' OR ')})`);
      }
      continue;
    }

    if (key === 'NOT') {
      const sub = buildWhere(modelName, value as Record<string, unknown>);
      if (sub.sql) {
        conditions.push(`NOT (${sub.sql})`);
        params.push(...sub.params);
      }
      continue;
    }

    // علاقة: { plan: { name: 'monthly' } }
    if (meta.relations?.[key]) {
      const rel = meta.relations[key];
      const sub = buildWhere(rel.model, value as Record<string, unknown>);
      if (sub.sql) {
        const relatedMeta = MODELS[rel.model];
        if (rel.owner === 'related') {
          // FK على الجدول المرتبط - استخدم EXISTS
          conditions.push(
            `EXISTS (SELECT 1 FROM ${table(relatedMeta.table)} AS r WHERE r.${col(rel.foreignKey)} = ${table(meta.table)}.${col('id')} AND ${sub.sql})`
          );
        } else {
          // FK على هذا الجدول - استخدم JOIN داخلي عبر EXISTS
          conditions.push(
            `EXISTS (SELECT 1 FROM ${table(relatedMeta.table)} AS r WHERE r.${col('id')} = ${table(meta.table)}.${col(rel.foreignKey)} AND ${sub.sql})`
          );
        }
        params.push(...sub.params);
      }
      continue;
    }

    // حقل عادي
    const column = col(key);

    // قيمة مباشرة (Equals)
    if (value === null) {
      conditions.push(`${column} IS NULL`);
      continue;
    }
    if (typeof value !== 'object' || value instanceof Date) {
      params.push(toDbValue(value));
      conditions.push(`${column} = ?`);
      continue;
    }

    // عوامل متقدمة: { contains, in, notIn, gte, gt, lte, lt, equals, not }
    const opObj = value as Record<string, unknown>;
    for (const [op, opVal] of Object.entries(opObj)) {
      switch (op) {
        case 'equals':
          if (opVal === null) {
            conditions.push(`${column} IS NULL`);
          } else {
            params.push(toDbValue(opVal));
            conditions.push(`${column} = ?`);
          }
          break;
        case 'not':
          if (opVal === null) {
            conditions.push(`${column} IS NOT NULL`);
          } else {
            params.push(toDbValue(opVal));
            conditions.push(`${column} != ?`);
          }
          break;
        case 'contains':
          params.push(`%${String(opVal)}%`);
          conditions.push(`${column} LIKE ?`);
          break;
        case 'startsWith':
          params.push(`${String(opVal)}%`);
          conditions.push(`${column} LIKE ?`);
          break;
        case 'endsWith':
          params.push(`%${String(opVal)}`);
          conditions.push(`${column} LIKE ?`);
          break;
        case 'in':
          if (Array.isArray(opVal) && opVal.length > 0) {
            const placeholders = opVal.map(() => '?').join(', ');
            params.push(...opVal.map((v) => toDbValue(v)));
            conditions.push(`${column} IN (${placeholders})`);
          } else {
            conditions.push('1=0'); // Empty IN → no matches
          }
          break;
        case 'notIn':
          if (Array.isArray(opVal) && opVal.length > 0) {
            const placeholders = opVal.map(() => '?').join(', ');
            params.push(...opVal.map((v) => toDbValue(v)));
            conditions.push(`${column} NOT IN (${placeholders})`);
          }
          break;
        case 'gt':
          params.push(toDbValue(opVal));
          conditions.push(`${column} > ?`);
          break;
        case 'gte':
          params.push(toDbValue(opVal));
          conditions.push(`${column} >= ?`);
          break;
        case 'lt':
          params.push(toDbValue(opVal));
          conditions.push(`${column} < ?`);
          break;
        case 'lte':
          params.push(toDbValue(opVal));
          conditions.push(`${column} <= ?`);
          break;
        case 'isNull':
          if (opVal) conditions.push(`${column} IS NULL`);
          else conditions.push(`${column} IS NOT NULL`);
          break;
        default:
          // عوامل غير مدعومة - تجاهل بأمان
          console.warn(`[db] Unsupported operator: ${op} on ${modelName}.${key}`);
      }
    }
  }

  if (conditions.length === 0) {
    return { sql: '', params: [] };
  }
  return { sql: conditions.join(' AND '), params };
}

// ============ OrderBy Builder ============

function buildOrderBy(orderBy: unknown): string {
  if (!orderBy) return '';
  const parts: string[] = [];

  if (Array.isArray(orderBy)) {
    for (const item of orderBy) {
      parts.push(buildOrderBy(item));
    }
    return parts.join(', ');
  }

  if (typeof orderBy === 'object' && orderBy !== null) {
    for (const [field, direction] of Object.entries(orderBy as Record<string, string>)) {
      const dir = direction === 'desc' ? 'DESC' : 'ASC';
      parts.push(`${col(field)} ${dir}`);
    }
  }

  return parts.join(', ');
}

// ============ Select Builder ============

function isScalarSelectValue(value: unknown): value is true {
  return value === true;
}

/**
 * Prisma-style select may contain relations, e.g.
 * { id: true, subscription: { select: { status: true } }, _count: {...} }.
 * Relations are NOT SQL columns, so they must never be projected directly.
 * If relations/_count are requested we select * internally, load relations,
 * then prune the result to the requested shape.
 */
function hasNestedSelect(select: Record<string, unknown> | undefined, meta: ModelMeta): boolean {
  if (!select) return false;
  return Object.entries(select).some(([key, value]) =>
    key === '_count' || Boolean(meta.relations?.[key]) || !isScalarSelectValue(value)
  );
}

function getScalarSelectFields(select: Record<string, unknown> | undefined, meta: ModelMeta): string[] {
  if (!select) return [];
  return Object.entries(select)
    .filter(([key, value]) => key !== '_count' && !meta.relations?.[key] && isScalarSelectValue(value))
    .map(([key]) => key);
}

function buildSelect(select: Record<string, unknown> | undefined, meta: ModelMeta): string {
  if (!select || Object.keys(select).length === 0) {
    return '*';
  }

  // Need id/FKs to resolve relations and _count; prune after includes.
  if (hasNestedSelect(select, meta)) return '*';

  const cols = getScalarSelectFields(select, meta);
  if (cols.length === 0) return '*';
  return cols.map((c) => col(c)).join(', ');
}

function selectToInclude(modelName: string, select: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!select) return undefined;
  const meta = MODELS[modelName];
  const include: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(select)) {
    if (key === '_count' || meta.relations?.[key]) include[key] = value === true ? {} : value;
  }
  return Object.keys(include).length ? include : undefined;
}

function pruneBySelect(modelName: string, row: any, select: Record<string, unknown> | undefined): any {
  if (!select || !row) return row;
  const meta = MODELS[modelName];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(select)) {
    if (key === '_count') {
      out._count = row._count;
      continue;
    }
    const rel = meta.relations?.[key];
    if (rel) {
      const relValue = row[key];
      if (value === true) {
        out[key] = relValue;
      } else {
        const nestedSelect = (value as { select?: Record<string, unknown> } | undefined)?.select;
        if (Array.isArray(relValue)) out[key] = relValue.map((r) => pruneBySelect(rel.model, r, nestedSelect));
        else out[key] = relValue ? pruneBySelect(rel.model, relValue, nestedSelect) : relValue;
      }
      continue;
    }
    if (value === true) out[key] = row[key];
  }
  return out;
}

// ============ Row Mapper ============

function mapRow(row: Record<string, unknown>, meta: ModelMeta, selectFields?: Set<string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (selectFields && !selectFields.has(key)) continue;

    let fieldType: 'boolean' | 'date' | 'json' | undefined;
    if (meta.boolFields?.includes(key)) fieldType = 'boolean';
    else if (meta.dateFields?.includes(key)) fieldType = 'date';
    else if (meta.jsonFields?.includes(key)) fieldType = 'json';

    result[key] = fromDbValue(value, fieldType);
  }

  return result;
}

// ============ Model Adapter ============

interface FindArgs {
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: unknown;
  skip?: number;
  take?: number;
  distinct?: string[];
}

interface CreateArgs {
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

interface CreateManyArgs {
  data: Record<string, unknown>[] | Record<string, unknown>;
  skipDuplicates?: boolean;
}

interface UpdateArgs {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

interface UpdateManyArgs {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
}

interface UpsertArgs {
  where: Record<string, unknown>;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

interface DeleteArgs {
  where: Record<string, unknown>;
  select?: Record<string, unknown>;
}

interface DeleteManyArgs {
  where: Record<string, unknown>;
}

interface CountArgs {
  where?: Record<string, unknown>;
}

interface GroupByArgs {
  by: string[];
  where?: Record<string, unknown>;
  _count?: Record<string, true>;
  _sum?: Record<string, true>;
  _avg?: Record<string, true>;
  _min?: Record<string, true>;
  _max?: Record<string, true>;
  orderBy?: unknown;
  take?: number;
  skip?: number;
}

interface AggregateArgs {
  where?: Record<string, unknown>;
  _count?: Record<string, true> | true;
  _sum?: Record<string, true>;
  _avg?: Record<string, true>;
  _min?: Record<string, true>;
  _max?: Record<string, true>;
}

class ModelAdapter {
  constructor(public name: string, private meta: ModelMeta) {}

  private get tableName(): string {
    return table(this.meta.table);
  }

  /**
   * تطبيق الـ include على صف واحد (تحميل العلاقات)
   */
  private async applyIncludes(
    row: Record<string, unknown> | null,
    include: Record<string, unknown> | undefined
  ): Promise<any> {
    if (!row || !include) return row;

    for (const [relName, relOpts] of Object.entries(include)) {
      // _count في include
      if (relName === '_count') {
        const countSelect = (relOpts as { select?: Record<string, true> }).select;
        if (countSelect) {
          const counts: Record<string, number> = {};
          for (const relField of Object.keys(countSelect)) {
            const rel = this.meta.relations?.[relField];
            if (rel) {
              const relatedMeta = MODELS[rel.model];
              const fkValue = rel.owner === 'self'
                ? row[rel.foreignKey]
                : row['id'];
              const whereCol = rel.owner === 'self' ? 'id' : rel.foreignKey;
              const countResult = await query<RowDataPacket[]>(
                `SELECT COUNT(*) AS cnt FROM ${table(relatedMeta.table)} WHERE ${col(whereCol)} = ?`,
                [fkValue]
              );
              counts[relField] = (countResult[0] as { cnt: number }).cnt;
            }
          }
          row._count = counts;
        }
        continue;
      }

      const rel = this.meta.relations?.[relName];
      if (!rel) {
        console.warn(`[db] Unknown relation: ${this.name}.${relName}`);
        continue;
      }

      const relatedMeta = MODELS[rel.model];
      const opts = (relOpts && typeof relOpts === 'object' ? relOpts : {}) as FindArgs;
      const relatedAdapter = new ModelAdapter(rel.model, relatedMeta);

      if (rel.type === 'one') {
        // تحميل علاقة one-to-one أو many-to-one
        const fkValue = rel.owner === 'self'
          ? row[rel.foreignKey]
          : row['id'];
        const whereCol = rel.owner === 'self' ? 'id' : rel.foreignKey;

        if (!fkValue) {
          row[relName] = null;
          continue;
        }

        const whereClause = buildWhere(rel.model, { ...opts.where, [whereCol]: fkValue });
        const selectClause = buildSelect(opts.select, relatedMeta);
        const sql = `SELECT ${selectClause} FROM ${table(relatedMeta.table)}`;
        const finalSql = whereClause.sql ? `${sql} WHERE ${whereClause.sql} LIMIT 1` : `${sql} LIMIT 1`;
        const rows = await query<RowDataPacket[]>(finalSql, whereClause.params);
        if (rows[0]) {
          const selectFields = opts.select && !hasNestedSelect(opts.select, relatedMeta)
            ? new Set(getScalarSelectFields(opts.select, relatedMeta))
            : undefined;
          let relRow: any = mapRow(rows[0] as Record<string, unknown>, relatedMeta, selectFields);
          relRow = await relatedAdapter.applyIncludes(relRow, opts.include);
          relRow = await relatedAdapter.applyIncludes(relRow, selectToInclude(rel.model, opts.select));
          row[relName] = pruneBySelect(rel.model, relRow, opts.select);
        } else {
          row[relName] = null;
        }
      } else {
        // تحميل علاقة one-to-many
        const fkValue = row['id'];
        if (!fkValue) {
          row[relName] = [];
          continue;
        }

        const whereClause = buildWhere(rel.model, { ...opts.where, [rel.foreignKey]: fkValue });
        const selectClause = buildSelect(opts.select, relatedMeta);
        const orderClause = buildOrderBy(opts.orderBy);
        const limit = opts.take ? `LIMIT ${Math.floor(opts.take)}` : '';
        const offset = opts.skip ? `OFFSET ${Math.floor(opts.skip)}` : '';

        let sql = `SELECT ${selectClause} FROM ${table(relatedMeta.table)}`;
        if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;
        if (orderClause) sql += ` ORDER BY ${orderClause}`;
        if (limit) sql += ` ${limit}`;
        if (offset) sql += ` ${offset}`;

        const rows = await query<RowDataPacket[]>(sql, whereClause.params);
        const selectFields = opts.select && !hasNestedSelect(opts.select, relatedMeta)
          ? new Set(getScalarSelectFields(opts.select, relatedMeta))
          : undefined;
        const relRows: any[] = [];
        for (const r of rows) {
          let relRow: any = mapRow(r as Record<string, unknown>, relatedMeta, selectFields);
          relRow = await relatedAdapter.applyIncludes(relRow, opts.include);
          relRow = await relatedAdapter.applyIncludes(relRow, selectToInclude(rel.model, opts.select));
          relRows.push(pruneBySelect(rel.model, relRow, opts.select));
        }
        row[relName] = relRows;
      }
    }

    return row;
  }

  async findUnique(args: FindArgs): Promise<any> {
    if (!args.where) {
      throw new Error(`findUnique on ${this.name} requires 'where'`);
    }

    // findUnique يدعم فقط المفاتيح الفريدة
    const whereClause = buildWhere(this.name, args.where);
    const selectClause = buildSelect(args.select, this.meta);
    let sql = `SELECT ${selectClause} FROM ${this.tableName}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;
    sql += ` LIMIT 1`;

    const rows = await query<RowDataPacket[]>(sql, whereClause.params);
    if (rows.length === 0) return null;

    const selectFields = args.select && !hasNestedSelect(args.select, this.meta)
      ? new Set(getScalarSelectFields(args.select, this.meta))
      : undefined;
    const row = mapRow(rows[0] as Record<string, unknown>, this.meta, selectFields);
    let result = await this.applyIncludes(row, args.include);
    result = await this.applyIncludes(result, selectToInclude(this.name, args.select));
    return pruneBySelect(this.name, result, args.select);
  }

  async findFirst(args: FindArgs = {}): Promise<any> {
    const whereClause = buildWhere(this.name, args.where);
    const selectClause = buildSelect(args.select, this.meta);
    const orderClause = buildOrderBy(args.orderBy);

    let sql = `SELECT ${selectClause} FROM ${this.tableName}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;
    if (orderClause) sql += ` ORDER BY ${orderClause}`;
    sql += ` LIMIT 1`;

    const rows = await query<RowDataPacket[]>(sql, whereClause.params);
    if (rows.length === 0) return null;

    const selectFields = args.select && !hasNestedSelect(args.select, this.meta)
      ? new Set(getScalarSelectFields(args.select, this.meta))
      : undefined;
    const row = mapRow(rows[0] as Record<string, unknown>, this.meta, selectFields);
    let result = await this.applyIncludes(row, args.include);
    result = await this.applyIncludes(result, selectToInclude(this.name, args.select));
    return pruneBySelect(this.name, result, args.select);
  }

  async findMany(args: FindArgs = {}): Promise<any[]> {
    const whereClause = buildWhere(this.name, args.where);
    const selectClause = buildSelect(args.select, this.meta);
    const orderClause = buildOrderBy(args.orderBy);
    const limit = args.take ? `LIMIT ${Math.floor(args.take)}` : '';
    const offset = args.skip ? `OFFSET ${Math.floor(args.skip)}` : '';

    let sql = `SELECT ${selectClause} FROM ${this.tableName}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;
    if (orderClause) sql += ` ORDER BY ${orderClause}`;
    if (limit) sql += ` ${limit}`;
    if (offset) sql += ` ${offset}`;

    // DISTINCT
    if (args.distinct && args.distinct.length > 0) {
      const distinctCols = args.distinct.map((d) => col(d)).join(', ');
      sql = `SELECT DISTINCT ${distinctCols} FROM ${this.tableName}`;
      if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;
      if (orderClause) sql += ` ORDER BY ${orderClause}`;
    }

    const rows = await query<RowDataPacket[]>(sql, whereClause.params);
    const selectFields = args.select && !hasNestedSelect(args.select, this.meta)
      ? new Set(getScalarSelectFields(args.select, this.meta))
      : undefined;
    const mapped = rows.map((r) => mapRow(r as Record<string, unknown>, this.meta, selectFields));

    // تطبيق includes و nested select relations
    if (args.include || args.select) {
      const withIncludes: any[] = [];
      const selectIncludes = selectToInclude(this.name, args.select);
      for (const row of mapped) {
        let item = row;
        item = (await this.applyIncludes(item, args.include))!;
        item = (await this.applyIncludes(item, selectIncludes))!;
        withIncludes.push(pruneBySelect(this.name, item, args.select));
      }
      return withIncludes;
    }

    return mapped;
  }

  async create(args: CreateArgs): Promise<any> {
    const data = { ...args.data };

    // توليد ID تلقائياً إذا لم يُحدد
    if (!data.id) {
      data.id = generateId();
    }

    // إضافة createdAt و updatedAt تلقائياً
    const now = new Date();
    if (!data.createdAt && this.meta.dateFields?.includes('createdAt')) {
      data.createdAt = now;
    }
    if (!data.updatedAt && this.meta.dateFields?.includes('updatedAt')) {
      data.updatedAt = now;
    }

    const columns: string[] = [];
    const placeholders: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      columns.push(col(key));
      placeholders.push('?');
      params.push(toDbValue(value));
    }

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    await execute(sql, params);

    // إرجاع الصف المنشأ
    const created = await this.findUnique({
      where: { id: data.id as string },
      select: args.select,
    });

    if (args.include && created) {
      return (await this.applyIncludes(created, args.include))!;
    }

    return created || data;
  }

  async createMany(args: CreateManyArgs): Promise<{ count: number }> {
    const dataArray = Array.isArray(args.data) ? args.data : [args.data];
    if (dataArray.length === 0) return { count: 0 };

    const now = new Date();
    // استخدام transaction للأداء
    const count = await transaction(async (conn: PoolConnection) => {
      let inserted = 0;

      for (const item of dataArray) {
        const data = { ...item };

        if (!data.id) {
          data.id = generateId();
        }
        if (!data.createdAt && this.meta.dateFields?.includes('createdAt')) {
          data.createdAt = now;
        }
        if (!data.updatedAt && this.meta.dateFields?.includes('updatedAt')) {
          data.updatedAt = now;
        }

        const columns: string[] = [];
        const placeholders: string[] = [];
        const params: unknown[] = [];

        for (const [key, value] of Object.entries(data)) {
          if (value === undefined) continue;
          columns.push(col(key));
          placeholders.push('?');
          params.push(toDbValue(value));
        }

        const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
        await conn.execute(sql, params);
        inserted++;
      }

      return inserted;
    });

    return { count };
  }

  async update(args: UpdateArgs): Promise<any> {
    if (!args.where) {
      throw new Error(`update on ${this.name} requires 'where'`);
    }

    const data = { ...args.data };

    // إضافة updatedAt تلقائياً
    if (this.meta.dateFields?.includes('updatedAt') && !data.updatedAt) {
      data.updatedAt = new Date();
    }

    const setParts: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;

      // عوامل Atomic: { increment, decrement, multiply, divide }
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const opObj = value as Record<string, number>;
        if ('increment' in opObj) {
          setParts.push(`${col(key)} = ${col(key)} + ?`);
          params.push(toDbValue(opObj.increment));
          continue;
        }
        if ('decrement' in opObj) {
          setParts.push(`${col(key)} = ${col(key)} - ?`);
          params.push(toDbValue(opObj.decrement));
          continue;
        }
        if ('multiply' in opObj) {
          setParts.push(`${col(key)} = ${col(key)} * ?`);
          params.push(toDbValue(opObj.multiply));
          continue;
        }
        if ('divide' in opObj) {
          setParts.push(`${col(key)} = ${col(key)} / ?`);
          params.push(toDbValue(opObj.divide));
          continue;
        }
      }

      setParts.push(`${col(key)} = ?`);
      params.push(toDbValue(value));
    }

    if (setParts.length === 0) {
      // لا يوجد شيء للتحديث - أرجع الصف الحالي
      return (await this.findUnique({ where: args.where, select: args.select }))!;
    }

    const whereClause = buildWhere(this.name, args.where);
    params.push(...whereClause.params);

    let sql = `UPDATE ${this.tableName} SET ${setParts.join(', ')}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;

    await execute(sql, params);

    const updated = await this.findUnique({
      where: args.where,
      select: args.select,
    });

    if (args.include && updated) {
      return (await this.applyIncludes(updated, args.include))!;
    }

    return updated!;
  }

  async updateMany(args: UpdateManyArgs): Promise<{ count: number }> {
    if (!args.where) {
      throw new Error(`updateMany on ${this.name} requires 'where'`);
    }

    const data = { ...args.data };
    if (this.meta.dateFields?.includes('updatedAt') && !data.updatedAt) {
      data.updatedAt = new Date();
    }

    const setParts: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;

      // عوامل Atomic
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const opObj = value as Record<string, number>;
        if ('increment' in opObj) {
          setParts.push(`${col(key)} = ${col(key)} + ?`);
          params.push(toDbValue(opObj.increment));
          continue;
        }
        if ('decrement' in opObj) {
          setParts.push(`${col(key)} = ${col(key)} - ?`);
          params.push(toDbValue(opObj.decrement));
          continue;
        }
        if ('multiply' in opObj) {
          setParts.push(`${col(key)} = ${col(key)} * ?`);
          params.push(toDbValue(opObj.multiply));
          continue;
        }
        if ('divide' in opObj) {
          setParts.push(`${col(key)} = ${col(key)} / ?`);
          params.push(toDbValue(opObj.divide));
          continue;
        }
      }

      setParts.push(`${col(key)} = ?`);
      params.push(toDbValue(value));
    }

    if (setParts.length === 0) {
      return { count: 0 };
    }

    const whereClause = buildWhere(this.name, args.where);
    params.push(...whereClause.params);

    let sql = `UPDATE ${this.tableName} SET ${setParts.join(', ')}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;

    const result = await execute(sql, params);
    return { count: result.affectedRows };
  }

  async upsert(args: UpsertArgs): Promise<any> {
    if (!args.where) {
      throw new Error(`upsert on ${this.name} requires 'where'`);
    }

    return await transaction(async (conn: PoolConnection) => {
      // محاولة العثور على الصف
      const whereClause = buildWhere(this.name, args.where);
      const selectSql = `SELECT * FROM ${this.tableName}${whereClause.sql ? ` WHERE ${whereClause.sql}` : ''} LIMIT 1`;
      const [rows] = await conn.query<RowDataPacket[]>(selectSql, whereClause.params);

      if (rows.length > 0) {
        // وجود - تحديث
        const data = { ...args.update };
        if (this.meta.dateFields?.includes('updatedAt') && !data.updatedAt) {
          data.updatedAt = new Date();
        }

        const setParts: string[] = [];
        const params: unknown[] = [];
        for (const [key, value] of Object.entries(data)) {
          if (value === undefined) continue;
          setParts.push(`${col(key)} = ?`);
          params.push(toDbValue(value));
        }

        if (setParts.length > 0) {
          const updateWhere = buildWhere(this.name, args.where);
          params.push(...updateWhere.params);
          let sql = `UPDATE ${this.tableName} SET ${setParts.join(', ')}`;
          if (updateWhere.sql) sql += ` WHERE ${updateWhere.sql}`;
          await conn.execute(sql, params);
        }

        // إرجاع الصف المُحدث
        const selectFields = args.select ? new Set(Object.keys(args.select)) : undefined;
        const updatedRow = mapRow(rows[0] as Record<string, unknown>, this.meta, selectFields);
        // إعادة قراءة لضمان الحصول على أحدث البيانات
        const [freshRows] = await conn.query<RowDataPacket[]>(selectSql, whereClause.params);
        const fresh = mapRow(freshRows[0] as Record<string, unknown>, this.meta, selectFields);
        return fresh;
      } else {
        // عدم وجود - إنشاء
        const createData = { ...args.create };
        if (!createData.id) {
          createData.id = generateId();
        }
        const now = new Date();
        if (!createData.createdAt && this.meta.dateFields?.includes('createdAt')) {
          createData.createdAt = now;
        }
        if (!createData.updatedAt && this.meta.dateFields?.includes('updatedAt')) {
          createData.updatedAt = now;
        }

        const columns: string[] = [];
        const placeholders: string[] = [];
        const params: unknown[] = [];
        for (const [key, value] of Object.entries(createData)) {
          if (value === undefined) continue;
          columns.push(col(key));
          placeholders.push('?');
          params.push(toDbValue(value));
        }

        const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
        await conn.execute(sql, params);

        // إرجاع الصف المنشأ
        const [newRows] = await conn.query<RowDataPacket[]>(selectSql, whereClause.params);
        const selectFields = args.select ? new Set(Object.keys(args.select)) : undefined;
        return mapRow(newRows[0] as Record<string, unknown>, this.meta, selectFields);
      }
    });
  }

  async delete(args: DeleteArgs): Promise<any> {
    if (!args.where) {
      throw new Error(`delete on ${this.name} requires 'where'`);
    }

    // إرجاع الصف قبل الحذف
    const existing = await this.findUnique({ where: args.where, select: args.select });

    const whereClause = buildWhere(this.name, args.where);
    let sql = `DELETE FROM ${this.tableName}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;

    await execute(sql, whereClause.params);
    return existing!;
  }

  async deleteMany(args: DeleteManyArgs): Promise<{ count: number }> {
    const whereClause = buildWhere(this.name, args.where || {});
    let sql = `DELETE FROM ${this.tableName}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;

    const result = await execute(sql, whereClause.params);
    return { count: result.affectedRows };
  }

  async count(args: CountArgs = {}): Promise<number> {
    const whereClause = buildWhere(this.name, args.where);
    let sql = `SELECT COUNT(*) AS cnt FROM ${this.tableName}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;

    const rows = await query<RowDataPacket[]>(sql, whereClause.params);
    return (rows[0] as { cnt: number }).cnt;
  }

  async groupBy(args: GroupByArgs): Promise<any[]> {
    const byCols = args.by.map((b) => col(b)).join(', ');
    const whereClause = buildWhere(this.name, args.where);

    const aggs: string[] = [];
    // _count
    if (args._count) {
      for (const field of Object.keys(args._count)) {
        aggs.push(`COUNT(${col(field)}) AS \`_count.${field}\``);
      }
    }
    if (args._sum) {
      for (const field of Object.keys(args._sum)) {
        aggs.push(`SUM(${col(field)}) AS \`_sum.${field}\``);
      }
    }
    if (args._avg) {
      for (const field of Object.keys(args._avg)) {
        aggs.push(`AVG(${col(field)}) AS \`_avg.${field}\``);
      }
    }
    if (args._min) {
      for (const field of Object.keys(args._min)) {
        aggs.push(`MIN(${col(field)}) AS \`_min.${field}\``);
      }
    }
    if (args._max) {
      for (const field of Object.keys(args._max)) {
        aggs.push(`MAX(${col(field)}) AS \`_max.${field}\``);
      }
    }

    let sql = `SELECT ${byCols}${aggs.length > 0 ? ', ' + aggs.join(', ') : ''} FROM ${this.tableName}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;
    sql += ` GROUP BY ${byCols}`;

    const orderClause = buildOrderBy(args.orderBy);
    if (orderClause) sql += ` ORDER BY ${orderClause}`;
    if (args.take) sql += ` LIMIT ${Math.floor(args.take)}`;
    if (args.skip) sql += ` OFFSET ${Math.floor(args.skip)}`;

    const rows = await queryRaw<RowDataPacket[]>(sql, whereClause.params);

    // إعادة تشكيل النتائج لتطابق بنية Prisma
    return rows.map((row) => {
      const result: Record<string, unknown> = {};
      const grouped: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        if (key.startsWith('_count.') || key.startsWith('_sum.') || key.startsWith('_avg.') || key.startsWith('_min.') || key.startsWith('_max.')) {
          const [agg, field] = key.split('.');
          if (!grouped[agg]) grouped[agg] = {};
          (grouped[agg] as Record<string, unknown>)[field] = value;
        } else {
          // تحويل التواريخ
          let val = value;
          if (this.meta.dateFields?.includes(key) && typeof val === 'string') {
            val = new Date(val);
          }
          result[key] = val;
        }
      }
      // دمج المجموعات
      for (const [agg, fields] of Object.entries(grouped)) {
        result[agg] = fields;
      }
      return result;
    });
  }

  async aggregate(args: AggregateArgs): Promise<any> {
    const whereClause = buildWhere(this.name, args.where);
    const aggs: string[] = [];

    if (args._count === true) {
      aggs.push(`COUNT(*) AS \`_count\``);
    } else if (args._count && typeof args._count === 'object') {
      for (const field of Object.keys(args._count)) {
        aggs.push(`COUNT(${col(field)}) AS \`_count.${field}\``);
      }
    }
    if (args._sum) {
      for (const field of Object.keys(args._sum)) {
        aggs.push(`SUM(${col(field)}) AS \`_sum.${field}\``);
      }
    }
    if (args._avg) {
      for (const field of Object.keys(args._avg)) {
        aggs.push(`AVG(${col(field)}) AS \`_avg.${field}\``);
      }
    }
    if (args._min) {
      for (const field of Object.keys(args._min)) {
        aggs.push(`MIN(${col(field)}) AS \`_min.${field}\``);
      }
    }
    if (args._max) {
      for (const field of Object.keys(args._max)) {
        aggs.push(`MAX(${col(field)}) AS \`_max.${field}\``);
      }
    }

    if (aggs.length === 0) {
      aggs.push(`COUNT(*) AS \`_count\``);
    }

    let sql = `SELECT ${aggs.join(', ')} FROM ${this.tableName}`;
    if (whereClause.sql) sql += ` WHERE ${whereClause.sql}`;

    const rows = await queryRaw<RowDataPacket[]>(sql, whereClause.params);
    const row = rows[0] as Record<string, unknown>;

    // إعادة تشكيل النتيجة
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === '_count') {
        result._count = value;
      } else if (key.startsWith('_count.') || key.startsWith('_sum.') || key.startsWith('_avg.') || key.startsWith('_min.') || key.startsWith('_max.')) {
        const [agg, field] = key.split('.');
        if (!result[agg]) result[agg] = {};
        (result[agg] as Record<string, unknown>)[field] = value;
      }
    }
    return result;
  }
}

// ============ db Object (Prisma-compatible surface) ============

export const db = {
  user: new ModelAdapter('user', MODELS.user),
  subscriptionPlan: new ModelAdapter('subscriptionPlan', MODELS.subscriptionPlan),
  subscription: new ModelAdapter('subscription', MODELS.subscription),
  patient: new ModelAdapter('patient', MODELS.patient),
  patientShareToken: new ModelAdapter('patientShareToken', MODELS.patientShareToken),
  patientSelfReport: new ModelAdapter('patientSelfReport', MODELS.patientSelfReport),
  visit: new ModelAdapter('visit', MODELS.visit),
  nutritionPlan: new ModelAdapter('nutritionPlan', MODELS.nutritionPlan),
  exercisePlan: new ModelAdapter('exercisePlan', MODELS.exercisePlan),
  foodItem: new ModelAdapter('foodItem', MODELS.foodItem),
  aiProvider: new ModelAdapter('aiProvider', MODELS.aiProvider),
  aiApiKey: new ModelAdapter('aiApiKey', MODELS.aiApiKey),
  aiUsageLog: new ModelAdapter('aiUsageLog', MODELS.aiUsageLog),
  aiConversation: new ModelAdapter('aiConversation', MODELS.aiConversation),
  aiMessage: new ModelAdapter('aiMessage', MODELS.aiMessage),
  cmsContent: new ModelAdapter('cmsContent', MODELS.cmsContent),
  landingPageSection: new ModelAdapter('landingPageSection', MODELS.landingPageSection),
  landingPageItem: new ModelAdapter('landingPageItem', MODELS.landingPageItem),
  systemSettings: new ModelAdapter('systemSettings', MODELS.systemSettings),
  siteVisitor: new ModelAdapter('siteVisitor', MODELS.siteVisitor),
  systemErrorLog: new ModelAdapter('systemErrorLog', MODELS.systemErrorLog),
  verificationCode: new ModelAdapter('verificationCode', MODELS.verificationCode),
};

export { query, queryRaw, execute, executeRaw, transaction, generateId };
export type { ModelAdapter, ModelMeta, RelationDef };
