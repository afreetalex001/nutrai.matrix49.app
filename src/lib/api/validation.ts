import { z, type ZodTypeAny } from 'zod';
import { badRequest } from './errors';
import { NextResponse } from 'next/server';

export function validateBody<T extends ZodTypeAny>(
  schema: T,
  body: unknown
): { ok: true; data: z.infer<T> } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { ok: false, response: badRequest(message) };
  }
  return { ok: true, data: result.data };
}

export function validateQuery<T extends ZodTypeAny>(
  schema: T,
  params: URLSearchParams
): { ok: true; data: z.infer<T> } | { ok: false; response: NextResponse } {
  const obj: Record<string, unknown> = {};
  params.forEach((value, key) => {
    if (obj[key] === undefined) {
      obj[key] = value;
    } else if (Array.isArray(obj[key])) {
      (obj[key] as unknown[]).push(value);
    } else {
      obj[key] = [obj[key], value];
    }
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    const message = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { ok: false, response: badRequest(message) };
  }
  return { ok: true, data: result.data };
}
