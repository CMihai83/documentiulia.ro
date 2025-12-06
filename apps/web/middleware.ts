import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './lib/i18n/config';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

// Check if production Clerk keys are configured
const isProductionAuth = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live');
const isDev = process.env.NODE_ENV === 'development' || !isProductionAuth;

// Public routes that don't require authentication
const publicPaths = [
  '/sign-in',
  '/sign-up',
  '/sso-callback',
  '/api/webhooks',
  '/_next',
  '/favicon.ico',
];

// Check if path is public
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.includes(path));
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always apply internationalization first
  const response = intlMiddleware(request);

  // Skip auth check for public paths
  if (isPublicPath(pathname)) {
    return response || NextResponse.next();
  }

  // In dev mode or without production keys, allow all routes
  if (isDev) {
    return response || NextResponse.next();
  }

  // Production mode with Clerk
  // Check for Clerk session cookie
  const sessionCookie = request.cookies.get('__session') || request.cookies.get('__clerk_db_jwt');

  if (!sessionCookie && !isPublicPath(pathname)) {
    // Redirect to sign-in for protected routes
    const locale = pathname.split('/')[1] || defaultLocale;
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response || NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
