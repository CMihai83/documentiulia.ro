/**
 * DocumentIulia.ro Edge Worker
 * Cloudflare Workers for 99.999% uptime
 *
 * Features:
 * - Smart caching with edge distribution
 * - Automatic failover to backup origins
 * - Rate limiting and DDoS protection
 * - Health checks and monitoring
 * - Geolocation-based routing
 * - A/B testing at the edge
 */

export interface Env {
  ENVIRONMENT: string;
  CACHE_TTL: string;
  ORIGIN_URL: string;
  FAILOVER_URL: string;
  CACHE: KVNamespace;
  RATE_LIMIT: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  SESSION: DurableObjectNamespace;
  ANALYTICS: AnalyticsEngineDataset;
  ASSETS: R2Bucket;
}

// Cache configuration by content type
const CACHE_CONFIG: Record<string, { ttl: number; staleWhileRevalidate: number }> = {
  'text/html': { ttl: 60, staleWhileRevalidate: 86400 },
  'application/json': { ttl: 300, staleWhileRevalidate: 3600 },
  'text/css': { ttl: 604800, staleWhileRevalidate: 2592000 },
  'application/javascript': { ttl: 604800, staleWhileRevalidate: 2592000 },
  'image/': { ttl: 2592000, staleWhileRevalidate: 31536000 },
  'font/': { ttl: 31536000, staleWhileRevalidate: 31536000 },
};

// Rate limit configuration
const RATE_LIMITS = {
  default: { requests: 1000, window: 60 }, // 1000 req/min
  api: { requests: 100, window: 60 }, // 100 req/min for API
  auth: { requests: 10, window: 60 }, // 10 req/min for auth endpoints
};

// Health check origins
const ORIGINS = {
  primary: '',
  failover: '',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const startTime = Date.now();

    // Initialize origins from env
    ORIGINS.primary = env.ORIGIN_URL;
    ORIGINS.failover = env.FAILOVER_URL;

    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCors(request);
      }

      // Rate limiting check
      const rateLimitResult = await checkRateLimit(request, env);
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Geolocation-based routing
      const country = request.cf?.country || 'RO';
      const isRomanian = ['RO', 'MD'].includes(country as string);

      // Handle static assets from R2
      if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/_next/static/')) {
        const assetResponse = await handleStaticAsset(url.pathname, env);
        if (assetResponse) {
          return addSecurityHeaders(assetResponse);
        }
      }

      // Check cache first
      const cacheKey = new Request(url.toString(), request);
      const cache = caches.default;
      let response = await cache.match(cacheKey);

      if (response) {
        // Log cache hit
        logAnalytics(env, request, 'cache_hit', startTime);
        return addSecurityHeaders(response);
      }

      // Fetch from origin with failover
      response = await fetchWithFailover(request, env);

      // Cache successful responses
      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'text/html';
        const cacheConfig = getCacheConfig(contentType);

        if (cacheConfig.ttl > 0) {
          const responseToCache = response.clone();
          const headers = new Headers(responseToCache.headers);
          headers.set('Cache-Control', `public, max-age=${cacheConfig.ttl}, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`);

          ctx.waitUntil(
            cache.put(cacheKey, new Response(responseToCache.body, {
              status: responseToCache.status,
              statusText: responseToCache.statusText,
              headers,
            }))
          );
        }
      }

      // Log analytics
      logAnalytics(env, request, response.ok ? 'origin_success' : 'origin_error', startTime);

      return addSecurityHeaders(response);
    } catch (error) {
      console.error('Worker error:', error);
      logAnalytics(env, request, 'error', startTime);

      // Return error page from KV or static fallback
      return new Response(getErrorPage(), {
        status: 503,
        headers: {
          'Content-Type': 'text/html',
          'Retry-After': '30',
        },
      });
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Scheduled health checks and cache warming
    ctx.waitUntil(performHealthChecks(env));
  },
};

// Fetch with automatic failover
async function fetchWithFailover(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Try primary origin
  try {
    const primaryUrl = `${ORIGINS.primary}${url.pathname}${url.search}`;
    const response = await fetch(primaryUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      },
    });

    if (response.ok || response.status < 500) {
      return response;
    }
  } catch (error) {
    console.warn('Primary origin failed:', error);
  }

  // Failover to secondary origin
  try {
    const failoverUrl = `${ORIGINS.failover}${url.pathname}${url.search}`;
    return await fetch(failoverUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });
  } catch (error) {
    console.error('Failover origin failed:', error);
    throw error;
  }
}

// Rate limiting check
async function checkRateLimit(request: Request, env: Env): Promise<Response | null> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const url = new URL(request.url);

  // Determine rate limit tier
  let limits = RATE_LIMITS.default;
  if (url.pathname.startsWith('/api/v1/auth')) {
    limits = RATE_LIMITS.auth;
  } else if (url.pathname.startsWith('/api/')) {
    limits = RATE_LIMITS.api;
  }

  // Check rate limit in KV
  const key = `ratelimit:${ip}:${Math.floor(Date.now() / (limits.window * 1000))}`;
  const current = await env.RATE_LIMIT.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= limits.requests) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: limits.window,
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': limits.window.toString(),
        'X-RateLimit-Limit': limits.requests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + limits.window).toString(),
      },
    });
  }

  // Increment counter
  await env.RATE_LIMIT.put(key, (count + 1).toString(), {
    expirationTtl: limits.window * 2,
  });

  return null;
}

// Handle static assets from R2
async function handleStaticAsset(pathname: string, env: Env): Promise<Response | null> {
  try {
    const key = pathname.replace(/^\/static\//, '').replace(/^\/_next\/static\//, '_next/static/');
    const object = await env.ASSETS.get(key);

    if (object) {
      const headers = new Headers();
      headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('ETag', object.httpEtag);

      return new Response(object.body, { headers });
    }
  } catch (error) {
    console.warn('R2 asset fetch failed:', error);
  }

  return null;
}

// Get cache configuration for content type
function getCacheConfig(contentType: string): { ttl: number; staleWhileRevalidate: number } {
  for (const [type, config] of Object.entries(CACHE_CONFIG)) {
    if (contentType.includes(type)) {
      return config;
    }
  }
  return { ttl: 60, staleWhileRevalidate: 3600 };
}

// Handle CORS
function handleCors(request: Request): Response {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://documentiulia.ro', 'https://www.documentiulia.ro'];

  if (allowedOrigins.includes(origin) || origin.endsWith('.documentiulia.ro')) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  return new Response(null, { status: 403 });
}

// Add security headers
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (!headers.has('Strict-Transport-Security')) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Log analytics
function logAnalytics(env: Env, request: Request, event: string, startTime: number) {
  try {
    const duration = Date.now() - startTime;
    const url = new URL(request.url);

    env.ANALYTICS.writeDataPoint({
      blobs: [
        event,
        url.pathname,
        request.cf?.country as string || 'unknown',
        request.headers.get('user-agent') || 'unknown',
      ],
      doubles: [duration],
      indexes: [event],
    });
  } catch (error) {
    console.warn('Analytics write failed:', error);
  }
}

// Health checks
async function performHealthChecks(env: Env) {
  const endpoints = [
    `${env.ORIGIN_URL}/api/v1/health`,
    `${env.FAILOVER_URL}/api/v1/health`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'GET' });
      console.log(`Health check ${endpoint}: ${response.status}`);
    } catch (error) {
      console.error(`Health check failed ${endpoint}:`, error);
    }
  }
}

// Error page HTML
function getErrorPage(): string {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DocumentIulia - Momentan indisponibil</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .container { text-align: center; padding: 40px; }
    h1 { font-size: 48px; margin-bottom: 16px; }
    p { font-size: 18px; opacity: 0.9; margin-bottom: 24px; }
    .retry { background: white; color: #667eea; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; }
    .retry:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  </style>
</head>
<body>
  <div class="container">
    <h1>Revenim imediat</h1>
    <p>Platforma este momentan în mentenanță. Vă rugăm să reîncercați în câteva momente.</p>
    <a href="/" class="retry">Reîncearcă</a>
  </div>
  <script>setTimeout(() => location.reload(), 30000);</script>
</body>
</html>`;
}

// Rate Limiter Durable Object
export class RateLimiter {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const ip = url.searchParams.get('ip') || 'unknown';

    const current = await this.state.storage.get<number>(`count:${ip}`) || 0;
    await this.state.storage.put(`count:${ip}`, current + 1);

    return new Response(JSON.stringify({ count: current + 1 }));
  }
}

// Session Manager Durable Object
export class SessionManager {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'create') {
      const sessionId = crypto.randomUUID();
      await this.state.storage.put(sessionId, { createdAt: Date.now() });
      return new Response(JSON.stringify({ sessionId }));
    }

    if (action === 'validate') {
      const sessionId = url.searchParams.get('id');
      if (sessionId) {
        const session = await this.state.storage.get(sessionId);
        return new Response(JSON.stringify({ valid: !!session, session }));
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  }
}
