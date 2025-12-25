import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

// Security headers for production hardening
const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Enable XSS filter
  'X-XSS-Protection': '1; mode=block',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(self)',
  // DNS prefetch control
  'X-DNS-Prefetch-Control': 'on',
  // Download options
  'X-Download-Options': 'noopen',
  // Permitted cross-domain policies
  'X-Permitted-Cross-Domain-Policies': 'none',
};

// Protected routes that require authentication
const protectedPaths = [
  '/dashboard',
  '/onboarding',
  '/invoices',
  '/settings',
  '/finance',
  '/documents',
  '/hr',
  '/ro/dashboard',
  '/ro/onboarding',
  '/ro/invoices',
  '/ro/settings',
  '/ro/finance',
  '/ro/documents',
  '/ro/hr',
  '/en/dashboard',
  '/en/onboarding',
  '/en/invoices',
  '/en/settings',
  '/en/finance',
  '/en/documents',
  '/en/hr',
  '/de/dashboard',
  '/de/onboarding',
  '/de/invoices',
  '/de/settings',
  '/de/finance',
  '/de/documents',
  '/de/hr',
];

// Apply security headers to response
function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Handle OPTIONS preflight requests for CORS
  if (method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        ...securityHeaders,
      },
    });
  }

  // Block suspicious POST requests to root path (bot/scanner protection)
  // These cause "Server Action not found" errors in logs
  if (method === 'POST' && (pathname === '/' || pathname === '')) {
    // Return 405 Method Not Allowed for POST to root
    return new NextResponse(null, {
      status: 405,
      statusText: 'Method Not Allowed',
      headers: {
        'Allow': 'GET, HEAD, OPTIONS',
        ...securityHeaders,
      },
    });
  }

  // Rate limiting check (basic implementation)
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Check if path is protected
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtectedPath) {
    // Check for auth token in cookies
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      // Redirect to login with return URL
      const locale = pathname.startsWith('/ro') ? 'ro' : pathname.startsWith('/de') ? 'de' : 'en';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      const response = NextResponse.redirect(loginUrl);
      return applySecurityHeaders(response);
    }
  }

  // Apply i18n middleware for all routes
  const response = intlMiddleware(request);

  // Apply security headers to all responses
  return applySecurityHeaders(response);
}

export const config = {
  // Exclude API routes, _next, _vercel, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
