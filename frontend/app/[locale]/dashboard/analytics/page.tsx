'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, ComposedChart,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Activity,
  PieChart,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  FileSpreadsheet,
} from 'lucide-react';

interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
}

interface ChartData {
  name: string;
  value: number;
  previousValue?: number;
}

interface RecentActivity {
  id: string;
  type: 'invoice' | 'document' | 'payment' | 'user' | 'alert';
  title: string;
  description: string;
  time: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

type DateRange = '7d' | '30d' | '90d' | '1y' | 'custom';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [invoiceData, setInvoiceData] = useState<ChartData[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const [statsRes, monthlyRes, invRes, actRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/quick-stats`, { headers }),
        fetch(`${API_URL}/finance/analytics/monthly`, { headers }),
        fetch(`${API_URL}/invoices/summary`, { headers }),
        fetch(`${API_URL}/analytics/dashboard/activity`, { headers }),
      ]);
      const anyOk = [statsRes, monthlyRes, invRes, actRes].some(r => r.ok);
      if (!anyOk) throw new Error('all analytics sources failed');

      // --- Metric cards from real quick-stats ---
      if (statsRes.ok) {
        const q = await statsRes.json();
        const fmt = (n: number) => (n ?? 0).toLocaleString('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 });
        setMetrics([
          { title: 'Venituri', value: fmt(q?.revenue?.current), change: q?.revenue?.change ?? 0, changeLabel: 'vs. perioada anterioară', icon: DollarSign, color: 'text-green-600' },
          { title: 'Facturi', value: String(q?.invoices?.total ?? 0), change: 0, changeLabel: `${q?.invoices?.pending ?? 0} în așteptare`, icon: FileText, color: 'text-blue-600' },
          { title: 'Parteneri Activi', value: String(q?.partners?.active ?? 0), change: 0, changeLabel: `din ${q?.partners?.total ?? 0} total`, icon: Users, color: 'text-purple-600' },
          { title: 'Profit', value: fmt(q?.profit?.current), change: q?.profit?.change ?? 0, changeLabel: 'vs. perioada anterioară', icon: TrendingUp, color: 'text-emerald-600' },
        ]);
      } else setMetrics([]);

      // --- Revenue trend from real monthly finance analytics ---
      if (monthlyRes.ok) {
        const m = await monthlyRes.json();
        setRevenueData((Array.isArray(m) ? m : []).map((r: any) => ({
          name: r.month, value: r.revenue ?? 0, previousValue: r.expenses ?? 0,
        })));
      } else setRevenueData([]);

      // --- Invoice status breakdown from real invoice summary ---
      if (invRes.ok) {
        const iv = await invRes.json();
        setInvoiceData([
          { name: 'Emise', value: iv?.issued?.count ?? 0 },
          { name: 'Primite', value: iv?.received?.count ?? 0 },
        ]);
      } else setInvoiceData([]);

      // --- Recent activity from the real activity feed ---
      if (actRes.ok) {
        const a = await actRes.json();
        const list = Array.isArray(a) ? a : a?.activities ?? [];
        setActivities(list.slice(0, 8).map((it: any, i: number) => ({
          id: it.id ?? String(i),
          type: it.type ?? 'document',
          title: it.title ?? it.action ?? 'Activitate',
          description: it.description ?? it.detail ?? '',
          time: it.time ?? (it.createdAt ? new Date(it.createdAt).toLocaleString('ro-RO') : ''),
          status: it.status ?? 'info',
        })));
      } else setActivities([]);
    } catch (e) {
      console.error('Analytics load failed:', e);
      setLoadError(true);
      setMetrics([]); setRevenueData([]); setInvoiceData([]); setActivities([]);
    } finally {
      setLastUpdated(new Date());
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData, dateRange]);

  const getStatusIcon = (status: RecentActivity['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActivityTypeIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-5 w-5" />;
      case 'payment':
        return <DollarSign className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      case 'user':
        return <Users className="h-5 w-5" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);
  const CHART_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#94a3b8', '#3b82f6', '#8b5cf6'];

  const handleExport = (format: 'pdf' | 'xlsx' | 'csv') => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    window.open(`${API_URL}/analytics/export?format=${format}&range=${dateRange}`, '_blank');
    setShowExportMenu(false);
  };

  // Quick Action Handlers
  const handleCreateInvoice = () => {
    router.push('/dashboard/invoices/new');
  };

  const handleRegisterPayment = () => {
    router.push('/dashboard/payments?action=new');
  };

  const handleAddClient = () => {
    router.push('/dashboard/partners?action=new');
  };

  // Filter Handler
  const handleOpenFilters = () => {
    toast.info('În dezvoltare', 'Filtre avansate (Categorie venituri, Tip client, Status factura, Departament) - funcționalitate în dezvoltare.');
  };

  // Activity Handlers
  const handleViewAllActivities = () => {
    router.push('/dashboard/notifications');
  };

  const handleActivityClick = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'invoice':
        router.push(`/dashboard/invoices?search=${activity.description.split(' ')[0]}`);
        break;
      case 'payment':
        router.push(`/dashboard/payments?search=${activity.description.split(' ')[2]}`);
        break;
      case 'document':
        router.push('/dashboard/documents');
        break;
      case 'user':
        router.push('/dashboard/settings/organization');
        break;
      case 'alert':
        router.push('/dashboard/invoices?filter=overdue');
        break;
      default:
        toast.info(activity.title, activity.description);
    }
  };

  // Goals Handlers
  const handleEditGoals = () => {
    router.push('/dashboard/analytics/goals/edit');
  };

  const handleViewGoalDetails = (goalType: string) => {
    switch (goalType) {
      case 'revenue':
        router.push('/dashboard/finance');
        break;
      case 'invoices':
        router.push('/dashboard/invoices');
        break;
      case 'clients':
        router.push('/dashboard/partners');
        break;
    }
  };

  // Metric Card Click Handler
  const handleMetricClick = (metricTitle: string) => {
    switch (metricTitle) {
      case 'Venituri Totale':
        router.push('/dashboard/finance');
        break;
      case 'Facturi Emise':
        router.push('/dashboard/invoices');
        break;
      case 'Clienți Activi':
        router.push('/dashboard/partners');
        break;
      case 'Timp Mediu Procesare':
        router.push('/dashboard/ocr-metrics');
        break;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Recharts-based bar chart component
  const RechartsBarChart = ({ data, height = 220 }: { data: ChartData[]; height?: number }) => {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${(v/1000)}k`} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Bar dataKey="value" name="2024" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="previousValue" name="2023" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // Recharts-based donut chart component
  const RechartsDonutChart = ({ data }: { data: ChartData[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="flex items-center gap-6">
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="text-sm text-slate-600">{item.name}</span>
              <span className="text-sm font-semibold text-slate-700">{item.value}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-700">Total: {total}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {loadError && (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-sm font-medium text-amber-900 dark:text-amber-200">
          <span aria-hidden="true">⚠</span>
          <span>Nu am putut încărca datele de analiză. Reîncearcă. / Could not load analytics data. Please retry.</span>
        </div>
      )}
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Dashboard Analytics
            </h1>
            <p className="text-slate-500 mt-1">
              Monitorizați performanța afacerii în timp real
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
              {(['7d', '30d', '90d', '1y'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {range === '7d' ? '7 zile' :
                   range === '30d' ? '30 zile' :
                   range === '90d' ? '90 zile' : '1 an'}
                </button>
              ))}
            </div>

            {/* Actions */}
            <button
              onClick={handleOpenFilters}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter className="h-5 w-5 text-slate-600" />
            </button>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 rounded-t-lg"
                  >
                    <FileText className="w-4 h-4 text-red-500" />
                    Export PDF
                  </button>
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-500" />
                    Export Excel
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 rounded-b-lg"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="h-4 w-4" />
          Ultima actualizare: {lastUpdated.toLocaleString('ro-RO')}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <div
            key={index}
            onClick={() => handleMetricClick(metric.title)}
            className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-300 hover:shadow-lg cursor-pointer ${
              isLoading ? 'animate-pulse' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg bg-slate-50 ${metric.color}`}>
                <metric.icon className="h-6 w-6" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                metric.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(metric.change)}%
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">
              {metric.value}
            </h3>
            <p className="text-sm text-slate-500">{metric.title}</p>
            <p className="text-xs text-slate-400 mt-1">{metric.changeLabel}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Evoluție Venituri
              </h2>
              <p className="text-sm text-slate-500">Venituri lunare (€)</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-slate-600">2024</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-200 rounded" />
                <span className="text-slate-600">2023</span>
              </div>
            </div>
          </div>
          <RechartsBarChart data={revenueData} height={220} />
        </div>

        {/* Invoice Status Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-500" />
              Status Facturi
            </h2>
            <p className="text-sm text-slate-500">Distribuție lunară</p>
          </div>
          <RechartsDonutChart data={invoiceData} />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              Activitate Recentă
            </h2>
            <button
              onClick={handleViewAllActivities}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Vezi tot
            </button>
          </div>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  {getActivityTypeIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{activity.title}</h3>
                    {getStatusIcon(activity.status)}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{activity.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Goals */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-amber-500" />
              Acțiuni Rapide
            </h2>
            <div className="space-y-3">
              <button
                onClick={handleCreateInvoice}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FileText className="h-5 w-5" />
                <span className="font-medium">Emite Factură</span>
              </button>
              <button
                onClick={handleRegisterPayment}
                className="w-full flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Înregistrează Plată</span>
              </button>
              <button
                onClick={handleAddClient}
                className="w-full flex items-center gap-3 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Users className="h-5 w-5" />
                <span className="font-medium">Adaugă Client</span>
              </button>
            </div>
          </div>

          {/* Goals Progress */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-red-500" />
                Obiective Lunare
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" title="Date demonstrative — modul de obiective încă neconectat">demo</span>
              </h2>
              <button
                onClick={handleEditGoals}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Editeaza
              </button>
            </div>
            <div className="space-y-4">
              <div
                onClick={() => handleViewGoalDetails('revenue')}
                className="cursor-pointer hover:bg-slate-50 p-2 rounded -mx-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Venituri</span>
                  <span className="text-sm font-medium text-slate-900">€47,832 / €50,000</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: '96%' }} />
                </div>
              </div>
              <div
                onClick={() => handleViewGoalDetails('invoices')}
                className="cursor-pointer hover:bg-slate-50 p-2 rounded -mx-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Facturi noi</span>
                  <span className="text-sm font-medium text-slate-900">156 / 150</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: '100%' }} />
                </div>
              </div>
              <div
                onClick={() => handleViewGoalDetails('clients')}
                className="cursor-pointer hover:bg-slate-50 p-2 rounded -mx-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Clienți noi</span>
                  <span className="text-sm font-medium text-slate-900">8 / 10</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: '80%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
