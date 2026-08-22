'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { toastFromAnywhere } from '@/lib/toast-bus';
import {
  Receipt,
  CheckCircle,
  AlertTriangle,
  Crown,
  Zap,
  Users,
  HardDrive,
  FileText,
  Clock,
  RefreshCw,
  Settings,
  Info,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types — mirror backend/src/subscription/subscription.service.ts and
// backend/src/billing/billing.service.ts
// ---------------------------------------------------------------------------

type Tier = 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

interface PlanFeature {
  key: string;
  name: string;
  nameRo: string;
  included: boolean;
  limit?: number | string;
}

interface PlanLimits {
  maxUsers: number;
  maxInvoices: number;
  maxDocuments: number;
  maxOcrPages: number;
  maxAiQueries: number;
  maxSaftReports: number;
  maxStorageGb: number;
  apiAccess: boolean;
  prioritySupport: boolean;
  sagaIntegration: boolean;
}

interface PricingPlan {
  tier: Tier;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: PlanFeature[];
  limits: PlanLimits;
  recommended?: boolean;
}

interface UsageBucket {
  used: number;
  limit: number;
  percentage: number;
}

interface UsageStats {
  organizationId: string;
  period: string;
  currentTier: Tier;
  usage: {
    users: UsageBucket;
    invoices: UsageBucket;
    documents: UsageBucket;
    ocrPages: UsageBucket;
    aiQueries: UsageBucket;
    saftReports: UsageBucket;
    storageGb: UsageBucket;
  };
  warnings: string[];
  upgradeRecommendation?: Tier;
}

interface SubscriptionStatus {
  organizationId: string;
  currentTier: Tier;
  plan: PricingPlan;
  usage: UsageStats;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate?: string;
  trialEndsAt?: string;
  isTrialActive: boolean;
}

type BillingInvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

interface BillingInvoice {
  id: string;
  number: string;
  status: BillingInvoiceStatus;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  dueDate: string;
  paidAt?: string;
  issuedAt: string;
  periodStart?: string;
  periodEnd?: string;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_LABEL_RO: Record<Tier, string> = {
  FREE: 'Gratuit',
  PRO: 'Pro',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
};

const NO_ORG_MESSAGE = 'Abonamentul nu este încă configurat pentru acest cont';

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ro-RO');
}

function fmtMoney(amount: number, currency = 'RON'): string {
  return `${amount.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} ${currency}`;
}

function fmtNumber(n: number): string {
  return n.toLocaleString('ro-RO', { maximumFractionDigits: 2 });
}

/** Backend uses large sentinel limits for "unlimited"; treat <=0 or >=999999 as unlimited. */
function isUnlimited(limit: number): boolean {
  return !Number.isFinite(limit) || limit <= 0 || limit >= 999999;
}

function clampPct(bucket: UsageBucket): number {
  if (isUnlimited(bucket.limit)) return 0;
  const pct = Number.isFinite(bucket.percentage) ? bucket.percentage : (bucket.used / bucket.limit) * 100;
  return Math.max(0, Math.min(100, pct));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BillingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  // Subscription status (tier, renewal) — /subscription/status
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [statusState, setStatusState] = useState<LoadState>('idle');
  const [statusError, setStatusError] = useState<string | null>(null);

  // Usage vs limits — /subscription/usage (falls back to status.usage)
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageState, setUsageState] = useState<LoadState>('idle');

  // Available plans — /subscription/plans (public)
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [plansState, setPlansState] = useState<LoadState>('idle');
  const [plansError, setPlansError] = useState<string | null>(null);

  // Subscription invoice history — /billing/invoices
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesState, setInvoicesState] = useState<LoadState>('idle');
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const loadStatusAndUsage = useCallback(async () => {
    setStatusState('loading');
    setUsageState('loading');
    setStatusError(null);

    // Known: both endpoints 500 for users without an organization. Do not
    // spend 3 backoff retries on that — fail fast and show the honest state.
    const [statusRes, usageRes] = await Promise.all([
      api.get<SubscriptionStatus>('/subscription/status', { retry: { maxRetries: 0 } }),
      api.get<UsageStats>('/subscription/usage', { retry: { maxRetries: 0 } }),
    ]);

    if (statusRes.status === 200 && statusRes.data && statusRes.data.plan) {
      setStatus(statusRes.data);
      setStatusState('ready');
    } else {
      setStatus(null);
      setStatusState('error');
      setStatusError(
        statusRes.status === 0
          ? 'Nu s-a putut contacta serverul. Verifică conexiunea și încearcă din nou.'
          : NO_ORG_MESSAGE,
      );
    }

    if (usageRes.status === 200 && usageRes.data && usageRes.data.usage) {
      setUsage(usageRes.data);
      setUsageState('ready');
    } else if (statusRes.status === 200 && statusRes.data?.usage) {
      setUsage(statusRes.data.usage);
      setUsageState('ready');
    } else {
      setUsage(null);
      setUsageState('error');
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setPlansState('loading');
    setPlansError(null);
    const res = await api.get<PricingPlan[]>('/subscription/plans');
    if (res.status === 200 && Array.isArray(res.data)) {
      setPlans(res.data);
      setPlansState('ready');
    } else {
      setPlans([]);
      setPlansState('error');
      setPlansError(res.error || 'Planurile nu au putut fi încărcate.');
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setInvoicesState('loading');
    setInvoicesError(null);
    const res = await api.get<BillingInvoice[]>('/billing/invoices', { params: { limit: 50 } });
    if (res.status === 200 && Array.isArray(res.data)) {
      setInvoices(res.data);
      setInvoicesState('ready');
    } else {
      setInvoices([]);
      setInvoicesState('error');
      setInvoicesError(res.error || 'Istoricul facturilor nu a putut fi încărcat.');
    }
  }, []);

  useEffect(() => {
    void loadStatusAndUsage();
    void loadPlans();
    void loadInvoices();
  }, [loadStatusAndUsage, loadPlans, loadInvoices]);

  const retryAll = useCallback(async () => {
    await Promise.all([loadStatusAndUsage(), loadPlans(), loadInvoices()]);
    toastFromAnywhere('info', 'Date reîncărcate', 'Starea abonamentului a fost reîmprospătată.');
  }, [loadStatusAndUsage, loadPlans, loadInvoices]);

  const currentTier: Tier | null = status?.currentTier ?? usage?.currentTier ?? null;
  const anyLoading = statusState === 'loading' || plansState === 'loading' || invoicesState === 'loading';

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const getInvoiceStatusBadge = (st: BillingInvoiceStatus) => {
    const config: Record<BillingInvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
      PAID: { label: 'Plătită', variant: 'default', icon: CheckCircle },
      SENT: { label: 'Emisă', variant: 'secondary', icon: Clock },
      DRAFT: { label: 'Ciornă', variant: 'outline', icon: FileText },
      OVERDUE: { label: 'Restantă', variant: 'destructive', icon: AlertTriangle },
      CANCELLED: { label: 'Anulată', variant: 'outline', icon: AlertTriangle },
      REFUNDED: { label: 'Rambursată', variant: 'secondary', icon: Receipt },
    };
    const c = config[st] ?? { label: st, variant: 'outline' as const, icon: FileText };
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <c.icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const usageRows: Array<{ key: keyof UsageStats['usage']; name: string; unit: string }> = [
    { key: 'invoices', name: 'Facturi emise', unit: 'facturi/lună' },
    { key: 'users', name: 'Utilizatori', unit: 'utilizatori' },
    { key: 'documents', name: 'Documente încărcate', unit: 'documente/lună' },
    { key: 'storageGb', name: 'Stocare documente', unit: 'GB' },
    { key: 'ocrPages', name: 'Pagini OCR', unit: 'pagini/lună' },
    { key: 'aiQueries', name: 'Interogări AI', unit: 'interogări/lună' },
    { key: 'saftReports', name: 'Rapoarte SAF-T', unit: 'rapoarte/lună' },
  ];

  const renderUsageValue = (b: UsageBucket, unit: string) =>
    isUnlimited(b.limit)
      ? `${fmtNumber(b.used)} ${unit}`
      : `${fmtNumber(b.used)} / ${fmtNumber(b.limit)} ${unit}`;

  const NoSubscriptionNotice = ({ message }: { message: string }) => (
    <Alert variant="info">
      <Info className="h-4 w-4" />
      <AlertTitle>{message}</AlertTitle>
      <AlertDescription>
        <p className="mt-1">
          Nu afișăm un plan presupus. Configurează organizația și abonamentul din setări, apoi revino aici.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => router.push('/dashboard/settings/subscription')}>
            <Settings className="mr-2 h-4 w-4" />
            Configurează abonamentul
          </Button>
          <Button size="sm" variant="outline" onClick={() => void loadStatusAndUsage()} disabled={statusState === 'loading'}>
            <RefreshCw className={`mr-2 h-4 w-4 ${statusState === 'loading' ? 'animate-spin' : ''}`} />
            Reîncearcă
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturare & Abonament</h1>
          <p className="text-muted-foreground">Gestionare abonament și istoric plăți</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void retryAll()} disabled={anyLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${anyLoading ? 'animate-spin' : ''}`} />
            Reîmprospătează
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('invoices')}>
            <Receipt className="mr-2 h-4 w-4" />
            Istoric facturi
          </Button>
          <Button onClick={() => setActiveTab('plans')}>
            <Crown className="mr-2 h-4 w-4" />
            Planuri
          </Button>
        </div>
      </div>

      {/* Current Plan Card */}
      {statusState === 'loading' || statusState === 'idle' ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : statusState === 'ready' && status ? (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-4">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold">
                      Plan {status.plan.nameRo || TIER_LABEL_RO[status.currentTier] || status.currentTier}
                    </h2>
                    <Badge variant="default">Activ</Badge>
                    {status.isTrialActive && <Badge variant="secondary">Perioadă de probă</Badge>}
                  </div>
                  <p className="text-muted-foreground">
                    {status.billingCycle === 'yearly'
                      ? `${fmtMoney(status.plan.priceYearly, status.plan.currency)}/an`
                      : `${fmtMoney(status.plan.priceMonthly, status.plan.currency)}/lună`}
                  </p>
                  {status.plan.descriptionRo && (
                    <p className="text-sm text-muted-foreground mt-1">{status.plan.descriptionRo}</p>
                  )}
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-muted-foreground">
                  {status.isTrialActive && status.trialEndsAt ? 'Perioada de probă expiră' : 'Următoarea reînnoire'}
                </p>
                <p className="text-lg font-medium">
                  {status.isTrialActive && status.trialEndsAt ? fmtDate(status.trialEndsAt) : fmtDate(status.nextBillingDate)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Ciclu: {status.billingCycle === 'yearly' ? 'anual' : 'lunar'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <NoSubscriptionNotice message={statusError || NO_ORG_MESSAGE} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Prezentare</TabsTrigger>
          <TabsTrigger value="usage">Utilizare</TabsTrigger>
          <TabsTrigger value="invoices">Facturi</TabsTrigger>
          <TabsTrigger value="plans">Planuri</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {usageState === 'loading' || usageState === 'idle' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-28" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-2 w-full mt-3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : usageState === 'ready' && usage ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Facturi luna curentă</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtNumber(usage.usage.invoices.used)}</div>
                    {isUnlimited(usage.usage.invoices.limit) ? (
                      <p className="text-xs text-muted-foreground mt-1">Nelimitate în planul actual</p>
                    ) : (
                      <>
                        <Progress value={clampPct(usage.usage.invoices)} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">din {fmtNumber(usage.usage.invoices.limit)}/lună</p>
                      </>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Stocare folosită</CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtNumber(usage.usage.storageGb.used)} GB</div>
                    {isUnlimited(usage.usage.storageGb.limit) ? (
                      <p className="text-xs text-muted-foreground mt-1">Nelimitată în planul actual</p>
                    ) : (
                      <>
                        <Progress value={clampPct(usage.usage.storageGb)} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">din {fmtNumber(usage.usage.storageGb.limit)} GB</p>
                      </>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Utilizatori</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtNumber(usage.usage.users.used)}</div>
                    {isUnlimited(usage.usage.users.limit) ? (
                      <p className="text-xs text-muted-foreground mt-1">Nelimitați în planul actual</p>
                    ) : (
                      <>
                        <Progress value={clampPct(usage.usage.users)} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">din {fmtNumber(usage.usage.users.limit)}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Interogări AI</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtNumber(usage.usage.aiQueries.used)}</div>
                    {isUnlimited(usage.usage.aiQueries.limit) ? (
                      <p className="text-xs text-muted-foreground mt-1">Nelimitate în planul actual</p>
                    ) : (
                      <>
                        <Progress value={clampPct(usage.usage.aiQueries)} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">din {fmtNumber(usage.usage.aiQueries.limit)}/lună</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {(usage.warnings.length > 0 || usage.upgradeRecommendation) && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenționări privind limitele planului</AlertTitle>
                  <AlertDescription>
                    {usage.warnings.length > 0 && (
                      <ul className="mt-1 list-disc pl-5 space-y-1">
                        {usage.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                    {usage.upgradeRecommendation && (
                      <p className="mt-2">
                        Recomandare: treci la planul{' '}
                        <strong>{TIER_LABEL_RO[usage.upgradeRecommendation] ?? usage.upgradeRecommendation}</strong>.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Perioada curentă</CardTitle>
                  <CardDescription>Consumul este calculat pentru perioada {usage.period}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Metoda de plată și facturarea automată nu sunt încă disponibile în aplicație. Pentru schimbarea
                  planului sau detalii de plată, folosește{' '}
                  <Link href="/dashboard/settings/subscription" className="underline underline-offset-2">
                    setările abonamentului
                  </Link>
                  .
                </CardContent>
              </Card>
            </>
          ) : (
            <NoSubscriptionNotice message={statusError || NO_ORG_MESSAGE} />
          )}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilizare resurse</CardTitle>
              <CardDescription>
                {usage ? `Monitorizare consum pentru perioada ${usage.period}` : 'Monitorizare consum luna curentă'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageState === 'loading' || usageState === 'idle' ? (
                <div className="space-y-6">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : usageState === 'ready' && usage ? (
                <div className="space-y-6">
                  {usageRows.map((row) => {
                    const bucket = usage.usage[row.key];
                    if (!bucket) return null;
                    const pct = clampPct(bucket);
                    return (
                      <div key={row.key}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{row.name}</span>
                          <span className="text-sm text-muted-foreground">{renderUsageValue(bucket, row.unit)}</span>
                        </div>
                        {isUnlimited(bucket.limit) ? (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Nelimitat în planul actual
                          </div>
                        ) : (
                          <>
                            <Progress value={pct} className="h-2" />
                            {pct >= 90 && (
                              <p className="text-xs text-red-600 mt-1">Limita este aproape atinsă ({Math.round(pct)}%).</p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <NoSubscriptionNotice message={statusError || NO_ORG_MESSAGE} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Istoric facturi de abonament</CardTitle>
              <CardDescription>Facturile emise pentru abonamentul DocumentIulia</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesState === 'loading' || invoicesState === 'idle' ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : invoicesState === 'error' ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Istoricul nu a putut fi încărcat</AlertTitle>
                  <AlertDescription>
                    <p className="mt-1">{invoicesError}</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => void loadInvoices()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reîncearcă
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Nu există facturi de abonament</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Nu a fost emisă încă nicio factură pentru abonamentul acestui cont. Facturile vor apărea aici
                    după prima plată.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <div className="rounded-lg bg-muted p-2">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{invoice.number}</p>
                            <p className="text-sm text-muted-foreground">
                              Emisă {fmtDate(invoice.issuedAt)} · Scadentă {fmtDate(invoice.dueDate)}
                              {invoice.paidAt ? ` · Plătită ${fmtDate(invoice.paidAt)}` : ''}
                            </p>
                            {invoice.periodStart && invoice.periodEnd && (
                              <p className="text-xs text-muted-foreground">
                                Perioada {fmtDate(invoice.periodStart)} – {fmtDate(invoice.periodEnd)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{fmtMoney(invoice.total, invoice.currency)}</span>
                          {getInvoiceStatusBadge(invoice.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          {plansState === 'loading' || plansState === 'idle' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-9 w-28 mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                    <Skeleton className="h-9 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : plansState === 'error' ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Planurile nu au putut fi încărcate</AlertTitle>
              <AlertDescription>
                <p className="mt-1">{plansError}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => void loadPlans()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reîncearcă
                </Button>
              </AlertDescription>
            </Alert>
          ) : plans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nu există planuri disponibile momentan.
              </CardContent>
            </Card>
          ) : (
            <>
              {!currentTier && (
                <p className="text-sm text-muted-foreground">
                  Planul curent nu poate fi marcat deoarece abonamentul nu este configurat pentru acest cont.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => {
                  const isCurrent = currentTier === plan.tier;
                  const includedFeatures = plan.features.filter((f) => f.included);
                  return (
                    <Card key={plan.tier} className={isCurrent ? 'border-primary ring-2 ring-primary' : ''}>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle>{plan.nameRo || TIER_LABEL_RO[plan.tier] || plan.name}</CardTitle>
                          <div className="flex gap-1">
                            {plan.recommended && !isCurrent && <Badge>Recomandat</Badge>}
                            {isCurrent && <Badge variant="secondary">Plan curent</Badge>}
                          </div>
                        </div>
                        <CardDescription>
                          <span className="text-3xl font-bold">{fmtMoney(plan.priceMonthly, plan.currency)}</span>
                          <span className="text-muted-foreground">/lună</span>
                          {plan.priceYearly > 0 && (
                            <span className="block text-xs text-muted-foreground mt-1">
                              sau {fmtMoney(plan.priceYearly, plan.currency)}/an
                            </span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {plan.descriptionRo && (
                          <p className="text-sm text-muted-foreground mb-3">{plan.descriptionRo}</p>
                        )}
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            {isUnlimited(plan.limits.maxInvoices)
                              ? 'Facturi nelimitate'
                              : `${fmtNumber(plan.limits.maxInvoices)} facturi/lună`}
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            {isUnlimited(plan.limits.maxUsers)
                              ? 'Utilizatori nelimitați'
                              : `${fmtNumber(plan.limits.maxUsers)} ${plan.limits.maxUsers === 1 ? 'utilizator' : 'utilizatori'}`}
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            {isUnlimited(plan.limits.maxStorageGb)
                              ? 'Stocare nelimitată'
                              : `${fmtNumber(plan.limits.maxStorageGb)} GB stocare`}
                          </li>
                          {includedFeatures.slice(0, 6).map((feature) => (
                            <li key={feature.key} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                              {feature.nameRo || feature.name}
                            </li>
                          ))}
                        </ul>
                        {isCurrent ? (
                          <Button className="w-full mt-4" variant="outline" disabled>
                            Plan curent
                          </Button>
                        ) : (
                          <Button
                            className="w-full mt-4"
                            variant="default"
                            onClick={() => router.push('/dashboard/settings/subscription')}
                          >
                            Schimbă planul
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
