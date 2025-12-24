'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CreditCard,
  Receipt,
  Download,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Crown,
  Zap,
  Users,
  HardDrive,
  FileText,
  TrendingUp,
  Clock,
  Star,
  Shield,
  Building,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Types
interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  downloadUrl: string;
}

interface UsageMetric {
  name: string;
  used: number;
  limit: number;
  unit: string;
}

// Sample data
const currentPlan = {
  name: 'Business',
  price: 149,
  currency: 'RON',
  period: 'lună',
  features: [
    'Utilizatori nelimitați',
    'Facturi nelimitate',
    'Integrare SAGA/ANAF',
    'AI Assistant avansat',
    'Suport prioritar',
    'API access',
    'Export SAF-T',
    'Backup zilnic',
  ],
  nextBillingDate: '2025-01-14',
  status: 'active',
};

const invoices: Invoice[] = [
  { id: 'INV-2025-012', number: 'INV-2025-012', date: '2025-12-01', amount: 149, status: 'paid', downloadUrl: '#' },
  { id: 'INV-2025-011', number: 'INV-2025-011', date: '2025-11-01', amount: 149, status: 'paid', downloadUrl: '#' },
  { id: 'INV-2025-010', number: 'INV-2025-010', date: '2025-10-01', amount: 149, status: 'paid', downloadUrl: '#' },
  { id: 'INV-2025-009', number: 'INV-2025-009', date: '2025-09-01', amount: 149, status: 'paid', downloadUrl: '#' },
  { id: 'INV-2025-008', number: 'INV-2025-008', date: '2025-08-01', amount: 99, status: 'paid', downloadUrl: '#' },
  { id: 'INV-2025-007', number: 'INV-2025-007', date: '2025-07-01', amount: 99, status: 'paid', downloadUrl: '#' },
];

const usageMetrics: UsageMetric[] = [
  { name: 'Facturi emise', used: 234, limit: -1, unit: 'facturi' },
  { name: 'Utilizatori', used: 8, limit: -1, unit: 'utilizatori' },
  { name: 'Stocare documente', used: 2.4, limit: 10, unit: 'GB' },
  { name: 'Cereri API', used: 12450, limit: 50000, unit: 'cereri/lună' },
  { name: 'Rapoarte AI', used: 45, limit: 100, unit: 'rapoarte/lună' },
  { name: 'OCR procesări', used: 189, limit: 500, unit: 'documente/lună' },
];

const plans = [
  {
    name: 'Gratuit',
    price: 0,
    features: ['5 facturi/lună', '1 utilizator', 'TVA basic', '100MB stocare'],
    recommended: false,
  },
  {
    name: 'Pro',
    price: 49,
    features: ['100 facturi/lună', '3 utilizatori', 'ANAF e-Factura', '2GB stocare', 'Suport email'],
    recommended: false,
  },
  {
    name: 'Business',
    price: 149,
    features: ['Facturi nelimitate', 'Utilizatori nelimitați', 'SAGA + ANAF', '10GB stocare', 'Suport prioritar', 'API access'],
    recommended: true,
    current: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Tot din Business', 'Server dedicat', 'SLA garantat', 'Training personalizat', 'Account manager'],
    recommended: false,
  },
];

const billingHistory = [
  { month: 'Ian', amount: 99 },
  { month: 'Feb', amount: 99 },
  { month: 'Mar', amount: 99 },
  { month: 'Apr', amount: 99 },
  { month: 'Mai', amount: 99 },
  { month: 'Iun', amount: 99 },
  { month: 'Iul', amount: 99 },
  { month: 'Aug', amount: 149 },
  { month: 'Sep', amount: 149 },
  { month: 'Oct', amount: 149 },
  { month: 'Nov', amount: 149 },
  { month: 'Dec', amount: 149 },
];

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const getInvoiceStatusBadge = (status: Invoice['status']) => {
    const config = {
      paid: { label: 'Plătită', variant: 'default' as const, icon: CheckCircle },
      pending: { label: 'În așteptare', variant: 'secondary' as const, icon: Clock },
      overdue: { label: 'Restantă', variant: 'destructive' as const, icon: AlertTriangle },
    };
    const c = config[status];
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <c.icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturare & Abonament</h1>
          <p className="text-muted-foreground">
            Gestionare abonament și istoric plăți
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Receipt className="mr-2 h-4 w-4" />
            Istoric facturi
          </Button>
          <Button>
            <Crown className="mr-2 h-4 w-4" />
            Upgrade plan
          </Button>
        </div>
      </div>

      {/* Current Plan Card */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/20 p-4">
                <Crown className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">Plan {currentPlan.name}</h2>
                  <Badge variant="default">Activ</Badge>
                </div>
                <p className="text-muted-foreground">
                  {currentPlan.price} {currentPlan.currency}/{currentPlan.period}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Următoarea facturare</p>
              <p className="text-lg font-medium">
                {new Date(currentPlan.nextBillingDate).toLocaleDateString('ro-RO')}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentPlan.price} {currentPlan.currency}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Prezentare</TabsTrigger>
          <TabsTrigger value="usage">Utilizare</TabsTrigger>
          <TabsTrigger value="invoices">Facturi</TabsTrigger>
          <TabsTrigger value="plans">Planuri</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total plătit 2025</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.438 RON</div>
                <p className="text-xs text-muted-foreground">12 facturi</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Stocare folosită</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.4 GB</div>
                <Progress value={24} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">din 10 GB</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Utilizatori activi</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Nelimitați în planul actual</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cereri API</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12.4K</div>
                <Progress value={24.9} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">din 50K/lună</p>
              </CardContent>
            </Card>
          </div>

          {/* Billing History Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Istoric facturare</CardTitle>
              <CardDescription>Costuri lunare 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={billingHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value} RON`} />
                  <Area type="monotone" dataKey="amount" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Metodă de plată</CardTitle>
              <CardDescription>Card salvat pentru plăți automate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Visa - Expiră 12/2026</p>
                  </div>
                </div>
                <Button variant="outline">Schimbă cardul</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilizare resurse</CardTitle>
              <CardDescription>Monitorizare consum luna curentă</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {usageMetrics.map((metric, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{metric.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {metric.used.toLocaleString()} {metric.limit > 0 ? `/ ${metric.limit.toLocaleString()}` : ''} {metric.unit}
                      </span>
                    </div>
                    {metric.limit > 0 ? (
                      <Progress value={(metric.used / metric.limit) * 100} className="h-2" />
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Nelimitat în planul actual
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Istoric facturi</CardTitle>
              <CardDescription>Toate facturile emise</CardDescription>
            </CardHeader>
            <CardContent>
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
                            {new Date(invoice.date).toLocaleDateString('ro-RO')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{invoice.amount} RON</span>
                        {getInvoiceStatusBadge(invoice.status)}
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.current ? 'border-primary ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.recommended && <Badge>Recomandat</Badge>}
                    {plan.current && <Badge variant="secondary">Plan curent</Badge>}
                  </div>
                  <CardDescription>
                    {typeof plan.price === 'number' ? (
                      <span className="text-3xl font-bold">{plan.price} RON</span>
                    ) : (
                      <span className="text-3xl font-bold">{plan.price}</span>
                    )}
                    {typeof plan.price === 'number' && <span className="text-muted-foreground">/lună</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-4" variant={plan.current ? 'outline' : 'default'} disabled={plan.current}>
                    {plan.current ? 'Plan curent' : 'Selectează'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
