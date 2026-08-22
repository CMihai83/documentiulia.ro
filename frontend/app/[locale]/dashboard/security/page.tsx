'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { api, clearAuthData } from '@/lib/api';
import { toastFromAnywhere } from '@/lib/toast-bus';
import { localePrefixFromPath } from '@/lib/locale';
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  LogOut,
  History,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Info,
  Copy,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types — mirror the backend shapes (auth.service / mfa.service / audit-logs /
// security-audit / api-gateway). Nothing here is invented client-side.
// ---------------------------------------------------------------------------

/** GET /auth/sessions → one entry per live refresh token (= device session). */
interface BackendSession {
  tokenId: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
}

/** GET /mfa/status */
interface MfaStatus {
  enabled: boolean;
  backupCodesRemaining: number;
  enabledAt?: string;
}

/** GET /audit-logs → Prisma AuditLog rows for the current user only. */
interface AuditLogRow {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

/** GET /security/events (ADMIN only, platform-wide). */
interface SecurityEvent {
  id: string;
  type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'data_access' | 'config_change';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  source: string;
  ipAddress?: string;
  userId?: string;
  timestamp: string;
}

/** GET /security/events/summary (ADMIN only). */
interface SecurityEventsSummary {
  total: number;
  bySeverity: Record<SecurityEvent['severity'], number>;
  byType: Record<string, number>;
  recentCritical: SecurityEvent[];
}

/** GET /gateway/api-keys/tenant/:tenantId → { keys: [...] } (key is masked). */
interface GatewayApiKey {
  id: string;
  key: string;
  name: string;
  tenantId: string;
  status: 'active' | 'revoked' | 'expired' | 'suspended' | string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
  expiresAt?: string;
}

/** GET /auth/token-config (public). */
interface TokenConfig {
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  maxSessionsPerUser: number;
  tokenRotation: boolean;
}

/** GET /auth/me (subset we use). */
interface MeUser {
  id: string;
  email: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  role?: string;
  activeOrganizationId?: string | null;
}

type LoadStatus = 'loading' | 'ok' | 'error' | 'forbidden';

interface Loadable<T> {
  status: LoadStatus;
  data: T | null;
  error?: string;
}

const loading = <T,>(): Loadable<T> => ({ status: 'loading', data: null });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The current device's session = the tokenId inside the stored refresh JWT. */
function readCurrentTokenId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('refresh_token');
    if (!raw) return null;
    const payload = raw.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const parsed = JSON.parse(json) as { tokenId?: string };
    return parsed.tokenId ?? null;
  } catch {
    return null;
  }
}

function readStoredOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('current_organization_id');
  } catch {
    return null;
  }
}

/** Minimal UA parsing — derived from the real string, nothing guessed beyond it. */
function describeUserAgent(ua?: string): { browser: string; os: string } {
  if (!ua) return { browser: 'Client necunoscut', os: '' };
  let browser = 'Browser necunoscut';
  if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/curl|PostmanRuntime|axios|node-fetch|python-requests/i.test(ua)) browser = 'Client API';

  let os = '';
  if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return { browser, os };
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' });
}

function formatRelative(value?: string | null): string {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMin = Math.round((Date.now() - then) / 60000);
  if (diffMin < 1) return 'acum câteva secunde';
  if (diffMin < 60) return `acum ${diffMin} min`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `acum ${hours} ${hours === 1 ? 'oră' : 'ore'}`;
  const days = Math.round(hours / 24);
  return `acum ${days} ${days === 1 ? 'zi' : 'zile'}`;
}

/** Romanian labels for the audit actions the auth/mfa services actually write. */
const AUDIT_LABELS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  USER_LOGIN: { label: 'Autentificare reușită', tone: 'success' },
  LOGIN_MFA_REQUIRED: { label: 'Autentificare — cod 2FA solicitat', tone: 'neutral' },
  MFA_VERIFICATION_SUCCESS: { label: 'Cod 2FA verificat', tone: 'success' },
  MFA_VERIFICATION_FAILED: { label: 'Cod 2FA greșit', tone: 'danger' },
  MFA_BACKUP_CODE_USED: { label: 'Cod de rezervă 2FA folosit', tone: 'warning' },
  MFA_BACKUP_CODES_REGENERATED: { label: 'Coduri de rezervă 2FA regenerate', tone: 'warning' },
  MFA_ENABLED: { label: 'Autentificare 2FA activată', tone: 'success' },
  MFA_DISABLED: { label: 'Autentificare 2FA dezactivată', tone: 'danger' },
  TOKEN_REFRESH: { label: 'Sesiune reînnoită', tone: 'neutral' },
  PASSWORD_RESET: { label: 'Parolă resetată', tone: 'warning' },
  EMAIL_VERIFIED: { label: 'Adresă de e-mail verificată', tone: 'success' },
  PROFILE_UPDATED: { label: 'Profil actualizat', tone: 'neutral' },
};

function describeAudit(row: AuditLogRow): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  const known = AUDIT_LABELS[row.action];
  if (known) return known;
  const pretty = row.action.toLowerCase().replace(/_/g, ' ');
  const tone = /FAIL|DENIED|REVOKED|DELETE/.test(row.action) ? 'danger' : 'neutral';
  return { label: `${pretty} (${row.entity})`, tone };
}

const TONE_CLASSES: Record<'success' | 'warning' | 'danger' | 'neutral', string> = {
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  danger: 'bg-red-100 text-red-600',
  neutral: 'bg-muted text-muted-foreground',
};

const SEVERITY_BADGE: Record<SecurityEvent['severity'], string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
  info: 'bg-muted text-muted-foreground',
};

const SECURITY_EVENT_TYPE_LABEL: Record<SecurityEvent['type'], string> = {
  auth_failure: 'Autentificare eșuată',
  rate_limit: 'Limită de cereri depășită',
  suspicious_activity: 'Activitate suspectă',
  data_access: 'Acces la date',
  config_change: 'Modificare configurare',
};

function SectionError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Nu s-au putut încărca datele</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>{message || 'Eroare de comunicare cu serverul.'}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reîncearcă
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SecurityPage() {
  const pathname = usePathname();
  const router = useRouter();
  const localePrefix = localePrefixFromPath(pathname || '/');

  const [activeTab, setActiveTab] = useState('overview');

  const [me, setMe] = useState<Loadable<MeUser>>(loading<MeUser>());
  const [mfa, setMfa] = useState<Loadable<MfaStatus>>(loading<MfaStatus>());
  const [sessions, setSessions] = useState<Loadable<BackendSession[]>>(loading<BackendSession[]>());
  const [audit, setAudit] = useState<Loadable<AuditLogRow[]>>(loading<AuditLogRow[]>());
  const [secSummary, setSecSummary] = useState<Loadable<SecurityEventsSummary>>(loading<SecurityEventsSummary>());
  const [secEvents, setSecEvents] = useState<Loadable<SecurityEvent[]>>(loading<SecurityEvent[]>());
  const [apiKeys, setApiKeys] = useState<Loadable<GatewayApiKey[]>>(loading<GatewayApiKey[]>());
  const [tokenConfig, setTokenConfig] = useState<Loadable<TokenConfig>>(loading<TokenConfig>());

  const [currentTokenId, setCurrentTokenId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);

  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [freshKey, setFreshKey] = useState<{ name: string; key: string } | null>(null);
  const [revokingKey, setRevokingKey] = useState<string | null>(null);

  // ----- loaders ------------------------------------------------------------

  const loadMe = useCallback(async () => {
    setMe(loading<MeUser>());
    const r = await api.get<MeUser | { user: MeUser }>('/auth/me');
    if (r.data) {
      const u = (r.data as { user?: MeUser }).user ?? (r.data as MeUser);
      setMe({ status: 'ok', data: u });
    } else {
      setMe({ status: r.status === 403 ? 'forbidden' : 'error', data: null, error: r.error });
    }
  }, []);

  const loadMfa = useCallback(async () => {
    setMfa(loading<MfaStatus>());
    const r = await api.get<MfaStatus>('/mfa/status');
    if (r.data) setMfa({ status: 'ok', data: r.data });
    else setMfa({ status: r.status === 403 ? 'forbidden' : 'error', data: null, error: r.error });
  }, []);

  const loadSessions = useCallback(async () => {
    setSessions(loading<BackendSession[]>());
    setCurrentTokenId(readCurrentTokenId());
    const r = await api.get<BackendSession[]>('/auth/sessions');
    if (r.data && Array.isArray(r.data)) {
      const sorted = [...r.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessions({ status: 'ok', data: sorted });
    } else {
      setSessions({ status: r.status === 403 ? 'forbidden' : 'error', data: null, error: r.error });
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAudit(loading<AuditLogRow[]>());
    const r = await api.get<AuditLogRow[]>('/audit-logs', { params: { limit: 100 } });
    if (r.data && Array.isArray(r.data)) setAudit({ status: 'ok', data: r.data });
    else setAudit({ status: r.status === 403 ? 'forbidden' : 'error', data: null, error: r.error });
  }, []);

  const loadSecurityEvents = useCallback(async () => {
    setSecSummary(loading<SecurityEventsSummary>());
    setSecEvents(loading<SecurityEvent[]>());
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    // These endpoints are ADMIN-only and platform-wide (no per-user filter on
    // the backend). A 403 is the normal answer for regular users → section hidden.
    const [s, e] = await Promise.all([
      api.get<SecurityEventsSummary>('/security/events/summary', { params: { since }, retry: { maxRetries: 0 } }),
      api.get<SecurityEvent[]>('/security/events', { params: { since, limit: 25 }, retry: { maxRetries: 0 } }),
    ]);
    if (s.data) setSecSummary({ status: 'ok', data: s.data });
    else setSecSummary({ status: s.status === 403 ? 'forbidden' : 'error', data: null, error: s.error });
    if (e.data && Array.isArray(e.data)) setSecEvents({ status: 'ok', data: e.data });
    else setSecEvents({ status: e.status === 403 ? 'forbidden' : 'error', data: null, error: e.error });
  }, []);

  const loadApiKeys = useCallback(async () => {
    const tenant = readStoredOrgId();
    setOrgId(tenant);
    if (!tenant) {
      setApiKeys({ status: 'ok', data: [] });
      return;
    }
    setApiKeys(loading<GatewayApiKey[]>());
    const r = await api.get<{ keys: GatewayApiKey[] }>(`/gateway/api-keys/tenant/${encodeURIComponent(tenant)}`);
    if (r.data && Array.isArray(r.data.keys)) setApiKeys({ status: 'ok', data: r.data.keys });
    else setApiKeys({ status: r.status === 403 ? 'forbidden' : 'error', data: null, error: r.error });
  }, []);

  const loadTokenConfig = useCallback(async () => {
    setTokenConfig(loading<TokenConfig>());
    const r = await api.get<TokenConfig>('/auth/token-config', { skipAuth: true, retry: { maxRetries: 0 } });
    if (r.data) setTokenConfig({ status: 'ok', data: r.data });
    else setTokenConfig({ status: 'error', data: null, error: r.error });
  }, []);

  const loadAll = useCallback(async () => {
    setRefreshingAll(true);
    await Promise.all([loadMe(), loadMfa(), loadSessions(), loadAudit(), loadSecurityEvents(), loadApiKeys(), loadTokenConfig()]);
    setRefreshingAll(false);
  }, [loadMe, loadMfa, loadSessions, loadAudit, loadSecurityEvents, loadApiKeys, loadTokenConfig]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ----- derived -------------------------------------------------------------

  const sessionList = sessions.data ?? [];
  const otherSessions = sessionList.filter((s) => s.tokenId !== currentTokenId);
  const auditRows = audit.data ?? [];

  const lastLogin = useMemo(() => auditRows.find((r) => r.action === 'USER_LOGIN') ?? null, [auditRows]);

  const failedLast30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return auditRows.filter(
      (r) => r.action === 'MFA_VERIFICATION_FAILED' && new Date(r.createdAt).getTime() >= cutoff,
    ).length;
  }, [auditRows]);

  // Orientative score from real signals only; shown as such.
  const score = useMemo(() => {
    if (mfa.status !== 'ok' || me.status !== 'ok') return null;
    let s = 0;
    if (mfa.data?.enabled) s += 50;
    if (me.data?.emailVerified) s += 25;
    if (audit.status === 'ok' && failedLast30 === 0) s += 15;
    if (sessions.status === 'ok' && otherSessions.length <= 2) s += 10;
    return s;
  }, [mfa, me, audit.status, failedLast30, sessions.status, otherSessions.length]);

  // ----- actions -------------------------------------------------------------

  const revokeSession = async (tokenId: string) => {
    setRevoking(tokenId);
    const r = await api.delete(`/auth/sessions/${encodeURIComponent(tokenId)}`);
    setRevoking(null);
    if (r.error) {
      toastFromAnywhere('error', 'Sesiunea nu a putut fi deconectată', r.error);
      return;
    }
    toastFromAnywhere('success', 'Sesiune deconectată');
    setSessions((prev) => (prev.data ? { ...prev, data: prev.data.filter((s) => s.tokenId !== tokenId) } : prev));
  };

  const revokeOtherSessions = async () => {
    if (otherSessions.length === 0) return;
    setRevokingAll(true);
    // There is no "revoke all except current" on /auth; POST /auth/logout-all
    // would also end this session. Revoke the others one by one instead.
    const results = await Promise.all(
      otherSessions.map((s) => api.delete(`/auth/sessions/${encodeURIComponent(s.tokenId)}`)),
    );
    setRevokingAll(false);
    const failed = results.filter((r) => r.error).length;
    if (failed === 0) toastFromAnywhere('success', `${otherSessions.length} sesiuni deconectate`);
    else toastFromAnywhere('warning', 'Deconectare parțială', `${failed} din ${otherSessions.length} sesiuni nu au putut fi deconectate.`);
    void loadSessions();
  };

  const logoutEverywhere = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Veți fi deconectat de pe toate dispozitivele, inclusiv acesta. Continuați?')) return;
    setRevokingAll(true);
    const r = await api.post('/auth/logout-all');
    setRevokingAll(false);
    if (r.error) {
      toastFromAnywhere('error', 'Deconectarea nu a reușit', r.error);
      return;
    }
    clearAuthData();
    if (typeof window !== 'undefined') window.location.href = `${localePrefix}/login`;
  };

  const createApiKey = async () => {
    const name = newKeyName.trim();
    if (!name) {
      toastFromAnywhere('warning', 'Denumire lipsă', 'Introduceți un nume pentru cheia API.');
      return;
    }
    if (!orgId || !me.data?.id) {
      toastFromAnywhere('warning', 'Organizație lipsă', 'Selectați o organizație activă înainte de a crea chei API.');
      return;
    }
    setCreatingKey(true);
    const r = await api.post<GatewayApiKey>('/gateway/api-keys', { name, tenantId: orgId, createdBy: me.data.id });
    setCreatingKey(false);
    if (r.error || !r.data) {
      toastFromAnywhere('error', 'Cheia API nu a putut fi creată', r.error);
      return;
    }
    setFreshKey({ name: r.data.name, key: r.data.key });
    setNewKeyName('');
    toastFromAnywhere('success', 'Cheie API creată', 'Copiați cheia acum — nu va mai fi afișată integral.');
    void loadApiKeys();
  };

  const revokeApiKey = async (keyId: string) => {
    setRevokingKey(keyId);
    const r = await api.post<{ success?: boolean; error?: string }>(`/gateway/api-keys/${encodeURIComponent(keyId)}/revoke`);
    setRevokingKey(null);
    if (r.error || r.data?.error) {
      toastFromAnywhere('error', 'Cheia nu a putut fi revocată', r.error || r.data?.error);
      return;
    }
    toastFromAnywhere('success', 'Cheie API revocată');
    void loadApiKeys();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastFromAnywhere('success', 'Copiat în clipboard');
    } catch {
      toastFromAnywhere('warning', 'Nu s-a putut copia', 'Selectați și copiați manual cheia.');
    }
  };

  // ----- render helpers --------------------------------------------------------

  const showSecuritySection = secSummary.status !== 'forbidden' || secEvents.status !== 'forbidden';

  const renderScoreCard = () => {
    if (mfa.status === 'loading' || me.status === 'loading') {
      return <Skeleton className="h-28 w-full" />;
    }
    if (score === null) {
      return (
        <Card>
          <CardContent className="pt-6">
            <SectionError message={mfa.error || me.error} onRetry={() => { void loadMfa(); void loadMe(); }} />
          </CardContent>
        </Card>
      );
    }
    const good = score >= 75;
    const mid = score >= 50 && score < 75;
    const cardClass = good
      ? 'bg-gradient-to-r from-green-500/10 via-green-500/5 to-background border-green-500/20'
      : mid
        ? 'bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-background border-yellow-500/20'
        : 'bg-gradient-to-r from-red-500/10 via-red-500/5 to-background border-red-500/20';
    const Icon = good ? ShieldCheck : ShieldAlert;
    return (
      <Card className={cardClass}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-full p-4 ${good ? 'bg-green-100' : mid ? 'bg-yellow-100' : 'bg-red-100'}`}>
                <Icon className={`h-8 w-8 ${good ? 'text-green-600' : mid ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Scor securitate: {score}%</h2>
                <p className="text-muted-foreground">
                  {good ? 'Contul este bine protejat' : mid ? 'Contul poate fi protejat mai bine' : 'Contul este expus — vezi recomandările'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scor orientativ calculat din: 2FA, e-mail verificat, coduri 2FA greșite (30 zile), număr sesiuni.
                </p>
              </div>
            </div>
            <div className="w-full md:w-48">
              <Progress value={score} className="h-3" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>Slab</span>
                <span>Excelent</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRecommendations = () => {
    const items: Array<{ tone: 'success' | 'warning' | 'danger'; title: string; text: string; action?: React.ReactNode }> = [];
    if (mfa.status === 'ok' && mfa.data) {
      if (mfa.data.enabled) {
        items.push({ tone: 'success', title: 'Autentificare 2FA activată', text: 'Contul este protejat cu verificare în doi pași.' });
        if (mfa.data.backupCodesRemaining <= 2) {
          items.push({
            tone: 'warning',
            title: 'Puține coduri de rezervă 2FA',
            text: `Mai aveți ${mfa.data.backupCodesRemaining} coduri de rezervă. Regenerați-le din Setări › Securitate.`,
            action: (
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => router.push(`${localePrefix}/dashboard/settings/security`)}>Regenerează</Button>
            ),
          });
        }
      } else {
        items.push({
          tone: 'danger',
          title: 'Autentificare 2FA dezactivată',
          text: 'Activați verificarea în doi pași pentru a proteja contul.',
          action: (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => router.push(`${localePrefix}/dashboard/settings/security`)}>Activează</Button>
          ),
        });
      }
    }
    if (me.status === 'ok' && me.data) {
      if (me.data.emailVerified) {
        items.push({ tone: 'success', title: 'Adresă de e-mail verificată', text: 'Recuperarea contului prin e-mail este disponibilă.' });
      } else {
        items.push({ tone: 'warning', title: 'Adresă de e-mail neverificată', text: 'Verificați adresa de e-mail pentru a putea recupera contul.' });
      }
    }
    if (sessions.status === 'ok' && otherSessions.length > 2) {
      items.push({
        tone: 'warning',
        title: `${otherSessions.length} alte sesiuni active`,
        text: 'Verificați dispozitivele conectate și deconectați-le pe cele necunoscute.',
        action: (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setActiveTab('sessions')}>
            Vezi sesiunile
          </Button>
        ),
      });
    }
    if (audit.status === 'ok' && failedLast30 > 0) {
      items.push({
        tone: 'danger',
        title: `${failedLast30} coduri 2FA greșite în ultimele 30 zile`,
        text: 'Dacă nu le recunoașteți, schimbați parola și verificați sesiunile.',
      });
    }

    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Recomandările apar după încărcarea stării 2FA și a profilului.
        </p>
      );
    }
    const bg = { success: 'bg-green-50', warning: 'bg-yellow-50', danger: 'bg-red-50' };
    const fg = { success: 'text-green-600', warning: 'text-yellow-600', danger: 'text-red-600' };
    return (
      <div className="space-y-3">
        {items.map((it, i) => {
          const Icon = it.tone === 'success' ? CheckCircle : AlertTriangle;
          return (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${bg[it.tone]}`}>
              <Icon className={`h-5 w-5 shrink-0 ${fg[it.tone]}`} />
              <div>
                <p className="font-medium">{it.title}</p>
                <p className="text-sm text-muted-foreground">{it.text}</p>
              </div>
              {it.action}
            </div>
          );
        })}
      </div>
    );
  };

  const renderAuditRow = (row: AuditLogRow, compact = false) => {
    const { label, tone } = describeAudit(row);
    const Icon = tone === 'danger' ? AlertTriangle : tone === 'success' ? CheckCircle : tone === 'warning' ? Key : Clock;
    return (
      <div key={row.id} className={compact ? 'flex items-center gap-3' : 'flex items-start gap-4 rounded-lg border p-4'}>
        <div className={`rounded-full p-2 ${TONE_CLASSES[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={compact ? 'text-sm font-medium' : 'font-medium'}>{label}</p>
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
            <span>{formatDateTime(row.createdAt)}</span>
            {row.ipAddress && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {row.ipAddress}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ----- JSX ---------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Securitate</h1>
          <p className="text-muted-foreground">Gestionare securitate cont și acces</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('activity')}>
            <History className="mr-2 h-4 w-4" />
            Jurnal activitate
          </Button>
          <Button onClick={() => void loadAll()} disabled={refreshingAll}>
            {refreshingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Verificare securitate
          </Button>
        </div>
      </div>

      {/* Security Score */}
      {renderScoreCard()}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Prezentare</TabsTrigger>
          <TabsTrigger value="sessions">Sesiuni</TabsTrigger>
          <TabsTrigger value="activity">Activitate</TabsTrigger>
          <TabsTrigger value="api">Chei API</TabsTrigger>
          <TabsTrigger value="settings">Setări</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 2FA */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Stare 2FA</CardTitle>
                <Smartphone className={`h-4 w-4 ${mfa.data?.enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                {mfa.status === 'loading' && <Skeleton className="h-6 w-24" />}
                {mfa.status === 'ok' && mfa.data && (
                  <>
                    <div className="flex items-center gap-2">
                      {mfa.data.enabled ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-medium text-green-600">Activat</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <span className="font-medium text-red-600">Dezactivat</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mfa.data.enabled
                        ? `Aplicație Authenticator · ${mfa.data.backupCodesRemaining} coduri de rezervă`
                        : 'Recomandat: activați verificarea în doi pași'}
                    </p>
                  </>
                )}
                {(mfa.status === 'error' || mfa.status === 'forbidden') && (
                  <Button variant="outline" size="sm" onClick={() => void loadMfa()}>
                    <RefreshCw className="mr-2 h-3 w-3" /> Reîncearcă
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Sessions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Sesiuni active</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {sessions.status === 'loading' && <Skeleton className="h-8 w-12" />}
                {sessions.status === 'ok' && (
                  <>
                    <div className="text-2xl font-bold">{sessionList.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {sessionList.length === 1 ? 'dispozitiv conectat' : 'dispozitive conectate'}
                      {otherSessions.length > 0 && ` · ${otherSessions.length} în afara acestuia`}
                    </p>
                  </>
                )}
                {(sessions.status === 'error' || sessions.status === 'forbidden') && (
                  <Button variant="outline" size="sm" onClick={() => void loadSessions()}>
                    <RefreshCw className="mr-2 h-3 w-3" /> Reîncearcă
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Last login */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ultima autentificare</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {audit.status === 'loading' && <Skeleton className="h-6 w-28" />}
                {audit.status === 'ok' && (
                  lastLogin ? (
                    <>
                      <div className="text-lg font-medium">{formatRelative(lastLogin.createdAt)}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(lastLogin.createdAt)}
                        {lastLogin.ipAddress ? ` · IP ${lastLogin.ipAddress}` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nicio autentificare înregistrată în jurnal</p>
                  )
                )}
                {(audit.status === 'error' || audit.status === 'forbidden') && (
                  <Button variant="outline" size="sm" onClick={() => void loadAudit()}>
                    <RefreshCw className="mr-2 h-3 w-3" /> Reîncearcă
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Failed MFA */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Coduri 2FA greșite</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${failedLast30 > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                {audit.status === 'loading' && <Skeleton className="h-8 w-12" />}
                {audit.status === 'ok' && (
                  <>
                    <div className={`text-2xl font-bold ${failedLast30 > 0 ? 'text-yellow-600' : ''}`}>{failedLast30}</div>
                    <p className="text-xs text-muted-foreground">ultimele 30 zile, din jurnalul contului</p>
                  </>
                )}
                {(audit.status === 'error' || audit.status === 'forbidden') && (
                  <Button variant="outline" size="sm" onClick={() => void loadAudit()}>
                    <RefreshCw className="mr-2 h-3 w-3" /> Reîncearcă
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recomandări securitate</CardTitle>
              </CardHeader>
              <CardContent>{renderRecommendations()}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activitate recentă</CardTitle>
                <CardDescription>Ultimele intrări din jurnalul contului</CardDescription>
              </CardHeader>
              <CardContent>
                {audit.status === 'loading' && <SectionSkeleton rows={4} />}
                {audit.status === 'error' && <SectionError message={audit.error} onRetry={() => void loadAudit()} />}
                {audit.status === 'forbidden' && (
                  <p className="text-sm text-muted-foreground">Jurnalul nu este disponibil pentru acest cont.</p>
                )}
                {audit.status === 'ok' && auditRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">Niciun eveniment de securitate</p>
                )}
                {audit.status === 'ok' && auditRows.length > 0 && (
                  <div className="space-y-3">{auditRows.slice(0, 5).map((row) => renderAuditRow(row, true))}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Sesiuni active</CardTitle>
                  <CardDescription>
                    Dispozitive conectate la cont
                    {tokenConfig.data && ` · max. ${tokenConfig.data.maxSessionsPerUser} sesiuni, valabile ${tokenConfig.data.refreshTokenExpiry}`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void revokeOtherSessions()}
                    disabled={revokingAll || sessions.status !== 'ok' || otherSessions.length === 0}
                  >
                    {revokingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                    Deconectează celelalte
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => void logoutEverywhere()} disabled={revokingAll}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Deconectează toate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.status === 'loading' && <SectionSkeleton rows={3} />}
              {(sessions.status === 'error' || sessions.status === 'forbidden') && (
                <SectionError message={sessions.error} onRetry={() => void loadSessions()} />
              )}
              {sessions.status === 'ok' && sessionList.length === 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Nicio sesiune înregistrată</AlertTitle>
                  <AlertDescription>
                    Serverul nu are nicio sesiune activă pentru acest cont (sesiunile sunt păstrate în memoria serverului și se pierd la repornirea acestuia).
                  </AlertDescription>
                </Alert>
              )}
              {sessions.status === 'ok' && sessionList.length > 0 && (
                <div className="space-y-4">
                  {!currentTokenId && (
                    <p className="text-xs text-muted-foreground">
                      Sesiunea curentă nu a putut fi identificată pe acest dispozitiv; verificați lista cu atenție înainte de a deconecta.
                    </p>
                  )}
                  {otherSessions.length === 0 && currentTokenId && (
                    <p className="text-sm text-muted-foreground">Nicio sesiune activă în afara celei curente</p>
                  )}
                  {sessionList.map((session) => {
                    const isCurrent = session.tokenId === currentTokenId;
                    const ua = describeUserAgent(session.userAgent);
                    return (
                      <div key={session.tokenId} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`rounded-full p-3 ${isCurrent ? 'bg-green-100' : 'bg-muted'}`}>
                            <Monitor className={`h-5 w-5 ${isCurrent ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{ua.os ? `${ua.browser} · ${ua.os}` : ua.browser}</p>
                              {isCurrent && <Badge>Sesiune curentă</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground break-all" title={session.userAgent}>
                              {session.userAgent ? session.userAgent.slice(0, 90) + (session.userAgent.length > 90 ? '…' : '') : 'User-agent neînregistrat'}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {session.ipAddress || 'IP neînregistrat'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Începută {formatDateTime(session.createdAt)} · expiră {formatDateTime(session.expiresAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void revokeSession(session.tokenId)}
                            disabled={revoking === session.tokenId || revokingAll}
                          >
                            {revoking === session.tokenId ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <LogOut className="h-4 w-4 mr-1" />}
                            Deconectează
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Jurnal securitate</CardTitle>
              <CardDescription>Evenimente de autentificare și securitate înregistrate pentru contul dvs.</CardDescription>
            </CardHeader>
            <CardContent>
              {audit.status === 'loading' && <SectionSkeleton rows={5} />}
              {(audit.status === 'error' || audit.status === 'forbidden') && (
                <SectionError message={audit.error} onRetry={() => void loadAudit()} />
              )}
              {audit.status === 'ok' && auditRows.length === 0 && (
                <p className="text-sm text-muted-foreground">Niciun eveniment de securitate</p>
              )}
              {audit.status === 'ok' && auditRows.length > 0 && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-3">{auditRows.map((row) => renderAuditRow(row))}</div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Platform-wide security events: ADMIN only; hidden entirely on 403. */}
          {showSecuritySection && (
            <Card>
              <CardHeader>
                <CardTitle>Evenimente de securitate — platformă</CardTitle>
                <CardDescription>Vizibile doar administratorilor · ultimele 30 zile, toți utilizatorii</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {secSummary.status === 'loading' && <Skeleton className="h-16 w-full" />}
                {secSummary.status === 'error' && <SectionError message={secSummary.error} onRetry={() => void loadSecurityEvents()} />}
                {secSummary.status === 'ok' && secSummary.data && (
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{secSummary.data.total}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Autentificări eșuate</p>
                      <p className="text-xl font-bold">{secSummary.data.byType.auth_failure ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Critice</p>
                      <p className="text-xl font-bold text-red-600">{secSummary.data.bySeverity.critical}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Ridicate</p>
                      <p className="text-xl font-bold text-red-500">{secSummary.data.bySeverity.high}</p>
                    </div>
                  </div>
                )}

                {secEvents.status === 'loading' && <SectionSkeleton rows={3} />}
                {secEvents.status === 'error' && <SectionError message={secEvents.error} onRetry={() => void loadSecurityEvents()} />}
                {secEvents.status === 'ok' && (secEvents.data?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground">Niciun eveniment de securitate</p>
                )}
                {secEvents.status === 'ok' && (secEvents.data?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    {secEvents.data!.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <Badge className={SEVERITY_BADGE[ev.severity] ?? ''}>{ev.severity}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {SECURITY_EVENT_TYPE_LABEL[ev.type] ?? ev.type} — {ev.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(ev.timestamp)} · {ev.source}
                            {ev.ipAddress ? ` · ${ev.ipAddress}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Chei API</CardTitle>
                  <CardDescription>Acces programatic pentru organizația curentă</CardDescription>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Denumire cheie (ex. Integrare contabilitate)"
                    className="px-3 py-2 border rounded-md text-sm w-64"
                    aria-label="Denumire cheie API"
                    disabled={!orgId || creatingKey}
                  />
                  <Button onClick={() => void createApiKey()} disabled={!orgId || creatingKey}>
                    {creatingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                    Cheie nouă
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {freshKey && (
                <Alert variant="success">
                  <Key className="h-4 w-4" />
                  <AlertTitle>Cheia „{freshKey.name}” a fost creată</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2">Copiați cheia acum — din motive de securitate nu va mai fi afișată integral.</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded break-all">{freshKey.key}</code>
                      <Button variant="outline" size="sm" onClick={() => void copyToClipboard(freshKey.key)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setFreshKey(null)}>Am copiat</Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!orgId && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Nicio organizație activă</AlertTitle>
                  <AlertDescription>
                    Cheile API sunt legate de organizație. Selectați o organizație din Setări › Organizație pentru a le gestiona.
                  </AlertDescription>
                </Alert>
              )}

              {orgId && apiKeys.status === 'loading' && <SectionSkeleton rows={2} />}
              {orgId && (apiKeys.status === 'error' || apiKeys.status === 'forbidden') && (
                <SectionError message={apiKeys.error} onRetry={() => void loadApiKeys()} />
              )}
              {orgId && apiKeys.status === 'ok' && (apiKeys.data?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Nicio cheie API creată pentru această organizație.</p>
              )}
              {orgId && apiKeys.status === 'ok' && (apiKeys.data?.length ?? 0) > 0 && (
                <div className="space-y-4">
                  {apiKeys.data!.map((key) => (
                    <div key={key.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{key.name}</span>
                            <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                              {key.status === 'active' ? 'activă' : key.status === 'revoked' ? 'revocată' : key.status}
                            </Badge>
                          </div>
                          <code className="text-sm bg-muted px-2 py-1 rounded">{key.key}</code>
                          {key.scopes?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {key.scopes.map((scope) => (
                                <Badge key={scope} variant="secondary" className="text-xs">{scope}</Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Creată: {formatDateTime(key.createdAt)}
                            {key.lastUsedAt ? ` · Ultima utilizare: ${formatDateTime(key.lastUsedAt)}` : ' · Neutilizată încă'}
                            {typeof key.usageCount === 'number' ? ` · ${key.usageCount} cereri` : ''}
                          </p>
                        </div>
                        {key.status === 'active' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void revokeApiKey(key.id)}
                            disabled={revokingKey === key.id}
                          >
                            {revokingKey === key.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                            Revocă
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setări securitate</CardTitle>
              <CardDescription>Configurare protecție cont</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Autentificare 2FA</p>
                    <p className="text-sm text-muted-foreground">
                      {mfa.status === 'loading' && 'Se verifică…'}
                      {mfa.status === 'ok' && mfa.data?.enabled && `Activată${mfa.data.enabledAt ? ` din ${formatDateTime(mfa.data.enabledAt)}` : ''} · ${mfa.data.backupCodesRemaining} coduri de rezervă`}
                      {mfa.status === 'ok' && !mfa.data?.enabled && 'Dezactivată — verificare suplimentară la autentificare'}
                      {(mfa.status === 'error' || mfa.status === 'forbidden') && 'Starea nu a putut fi încărcată'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push(`${localePrefix}/dashboard/settings/security`)}>{mfa.data?.enabled ? 'Gestionează 2FA' : 'Activează 2FA'}</Button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Durată sesiune</p>
                    <p className="text-sm text-muted-foreground">
                      {tokenConfig.status === 'loading' && 'Se încarcă…'}
                      {tokenConfig.status === 'ok' && tokenConfig.data &&
                        `Token de acces ${tokenConfig.data.accessTokenExpiry}, sesiune ${tokenConfig.data.refreshTokenExpiry}, maxim ${tokenConfig.data.maxSessionsPerUser} dispozitive${tokenConfig.data.tokenRotation ? ', rotație token activă' : ''}`}
                      {tokenConfig.status === 'error' && 'Configurația nu a putut fi încărcată'}
                    </p>
                  </div>
                  {tokenConfig.status === 'error' && (
                    <Button variant="outline" size="sm" onClick={() => void loadTokenConfig()}>
                      <RefreshCw className="mr-2 h-3 w-3" /> Reîncearcă
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Dispozitive conectate</p>
                    <p className="text-sm text-muted-foreground">
                      {sessions.status === 'ok' ? `${sessionList.length} sesiuni active` : 'Vezi și deconectează sesiunile'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('sessions')}>Gestionează</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schimbare parolă</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Schimbarea parolei din cont nu este încă disponibilă</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Până atunci, puteți reseta parola prin e-mail: veți primi un link de resetare la adresa contului.
                  </span>
                  <Button variant="outline" size="sm" onClick={() => router.push(`${localePrefix}/forgot-password`)}>Resetează parola prin e-mail</Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
