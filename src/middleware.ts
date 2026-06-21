import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/activation-pending',
  '/portal', // صفحة دخول المريض
  '/download', // صفحة تنزيل APK
];

// Public path prefixes (anything under these is public)
const PUBLIC_PATH_PREFIXES = [
  '/portal/', // بوابة المريض - محمية بالتوكن في URL
];

// Public API paths that don't require authentication
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/plans',
  '/api/seed',
  '/api/setup',
  '/api/landing',
  '/api/patient-portal/', // كل البوابة محمية بالتوكن في URL
  '/api/analytics/visit', // تتبع زوار مجهول بدون بيانات حساسة
  '/api/errors/client', // تسجيل أخطاء الواجهة
  '/api/cron/', // مهام cron المجدولة (تُحمى بمفتاح في الـ URL)
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.includes('.') // static files have extensions
  ) {
    return NextResponse.next();
  }

  // Allow public pages (landing page, login, register)
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow public path prefixes (patient portal)
  if (PUBLIC_PATH_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // For API routes, let them handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For protected pages, check for auth token
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login for protected pages
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|images/|.*\\.webp|.*\\.png|.*\\.svg|.*\\.ico).*)',
  ],
};
