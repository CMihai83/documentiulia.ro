'use client';

/**
 * Live-site error logger. Captures window errors, unhandled promise rejections,
 * React error-boundary crashes and failed (5xx / network) API calls, batches
 * them and ships them to POST /api/v1/client-logs.
 *
 * Design constraints: never throw, never loop (ingest failures are swallowed and
 * the endpoint itself is excluded), dedupe repeats, cap batch + queue sizes.
 */

type LoggedError = {
  level?: 'error' | 'warning';
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const INGEST_PATH = '/client-logs';
const FLUSH_MS = 10_000;
const MAX_QUEUE = 20;

let queue: LoggedError[] = [];
let recent = new Map<string, number>(); // dedupe key -> last sent ts
let timer: ReturnType<typeof setInterval> | null = null;
let installed = false;

function dedupeKey(e: LoggedError): string {
  return `${e.message}|${(e.stack || '').slice(0, 120)}`;
}

export function logClientError(e: LoggedError): void {
  try {
    if (!e?.message) return;
    if (e.message.includes(INGEST_PATH)) return; // never log the logger
    const key = dedupeKey(e);
    const now = Date.now();
    const last = recent.get(key) ?? 0;
    if (now - last < 60_000) return; // same error within a minute -> drop
    recent.set(key, now);
    if (recent.size > 200) recent = new Map([...recent].slice(-100));
    queue.push({
      ...e,
      url: e.url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  } catch {
    /* never throw from the logger */
  }
}

function flush(useBeacon = false): void {
  if (!queue.length) return;
  const errors = queue.splice(0, MAX_QUEUE);
  const body = JSON.stringify({ errors });
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}${INGEST_PATH}`, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(`${API_BASE}${INGEST_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* swallow — logging must never break the app */
  }
}

export function installErrorLogger(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (ev) => {
    logClientError({
      message: ev.message || 'window.onerror',
      stack: ev.error?.stack,
      meta: { file: ev.filename, line: ev.lineno, col: ev.colno, kind: 'window.onerror' },
    });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const r: any = ev.reason;
    logClientError({
      message: r?.message ? `Unhandled rejection: ${r.message}` : `Unhandled rejection: ${String(r).slice(0, 300)}`,
      stack: r?.stack,
      meta: { kind: 'unhandledrejection' },
    });
  });

  // Mirror what the DevTools console shows: hook console.error (and warn) so
  // errors logged by React/app code are captured too — while still printing.
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    origError(...args);
    try {
      const first = args[0] as any;
      const message = first instanceof Error ? first.message : typeof first === 'string' ? first : JSON.stringify(first)?.slice(0, 300);
      const stack = first instanceof Error ? first.stack : (args.find((a: any) => a instanceof Error) as Error | undefined)?.stack;
      if (message) logClientError({ message: `console.error: ${message}`, stack, meta: { kind: 'console.error' } });
    } catch { /* never break console */ }
  };
  const origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    origWarn(...args);
    try {
      const first = args[0] as any;
      const message = typeof first === 'string' ? first : first instanceof Error ? first.message : undefined;
      if (message) logClientError({ message: `console.warn: ${message}`, level: 'warning', meta: { kind: 'console.warn' } });
    } catch { /* never break console */ }
  };

  window.addEventListener('pagehide', () => flush(true));
  timer = setInterval(() => flush(), FLUSH_MS);
  void timer;
}

/** Report a failed API call (wired in lib/api.ts for 5xx / network failures). */
export function logApiFailure(endpoint: string, status: number | 'network', message?: string): void {
  logClientError({
    message: `API ${status} on ${endpoint}${message ? `: ${String(message).slice(0, 200)}` : ''}`,
    level: 'error',
    meta: { kind: 'api', endpoint, status },
  });
}
