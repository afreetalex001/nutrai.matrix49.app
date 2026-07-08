import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api-error';

export function unauthorized(message = 'غير مخول بالوصول') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'ليس لديك صلاحية لهذا الإجراء') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message = 'طلب غير صالح') {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = 'غير موجود') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function createdResponse<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.error('Unknown API Error:', error);
  return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
}

export function logApiError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
}
