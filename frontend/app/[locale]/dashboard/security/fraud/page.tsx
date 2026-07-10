'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, TrendingDown, CheckCircle, Settings, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { FraudAlertsList } from '@/components/alerts/FraudAlertsList';
import { FraudAlertBanner } from '@/components/alerts/FraudAlertBanner';
import { RiskScoreIndicator, RiskScoreProgress } from '@/components/alerts/RiskScoreIndicator';
import type { FraudAlert, FraudAlertStatus } from '@/components/alerts/FraudAlertsList';

interface FraudDashboardStats {
  totalAlerts: number;
  criticalAlerts: number;
  pendingAlerts: number;
  resolvedAlerts: number;
  falsePositiveRate: number;
  averageRiskScore: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  riskTrend: Array<{ date: string; score: number }>;
}

// Mock data for demonstration


export default function FraudDetectionDashboard() {
  const t = useTranslations('fraudDetection');
  const [stats, setStats] = useState<FraudDashboardStats | null>(null);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/fraud-detection/dashboard/stats`, { headers }),
        fetch(`${API_URL}/fraud-detection/alerts`, { headers }),
      ]);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else {
        setStats(null);
        setLoadError(true);
      }
      if (alertsRes.ok) {
        const d = await alertsRes.json();
        setAlerts(Array.isArray(d) ? d : d?.items ?? d?.data ?? []);
      } else {
        setAlerts([]);
        setLoadError(true);
      }
    } catch (error) {
      console.error('Failed to fetch fraud detection data:', error);
      setStats(null);
      setAlerts([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle alert status update
  const handleUpdateStatus = async (alertId: string, status: FraudAlertStatus, resolution?: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const action = status === 'RESOLVED' ? 'resolve' : status === 'CONFIRMED' ? 'confirm' : status === 'FALSE_POSITIVE' ? 'mark-false-positive' : null;
      if (action) {
        await fetch(`${API_URL}/fraud-detection/alerts/${alertId}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ resolution }),
        });
      }

      // Optimistic local update; the refetch below reconciles with the server
      setAlerts(prevAlerts =>
        prevAlerts.map(alert =>
          alert.id === alertId
            ? {
                ...alert,
                status,
                resolution,
                resolvedAt: status === 'RESOLVED' ? new Date() : alert.resolvedAt,
              }
            : alert
        )
      );

      // Refresh stats
      await fetchData();
    } catch (error) {
      console.error('Failed to update alert status:', error);
      throw error;
    }
  };

  // Get critical alerts for banner
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'PENDING');

  // Prepare chart data
  const alertTypeData = Object.entries(stats?.alertsByType ?? {}).map(([name, value]) => ({
    name: t(`alertTypes.${name.toLowerCase()}`),
    value,
  }));

  const severityData = Object.entries(stats?.alertsBySeverity ?? {}).map(([name, value]) => ({
    name: t(`severity.${name.toLowerCase()}`),
    value,
    color:
      name === 'CRITICAL' ? '#dc2626' :
      name === 'HIGH' ? '#ea580c' :
      name === 'MEDIUM' ? '#ca8a04' : '#2563eb',
  }));

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {loadError && (
        <div role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200">
          Nu am putut încărca datele. Reîncearcă. / Could not load data. Please retry.
        </div>
      )}
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary-600" />
            {t('title')}
          </h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {t('configure')}
          </button>
          <button
            onClick={() => {/* Export report */}}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('exportReport')}
          </button>
        </div>
      </div>

      {/* Critical Alerts Banners */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6">
          {criticalAlerts.map(alert => (
            <FraudAlertBanner
              key={alert.id}
              alert={alert}
              onView={(id) => {/* Navigate to detail */}}
            />
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">{t('totalAlerts')}</h3>
            <AlertTriangle className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats?.totalAlerts ?? 0}</div>
          <p className="text-sm text-gray-500 mt-1">{t('allTime')}</p>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">{t('criticalAlerts')}</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600">{stats?.criticalAlerts ?? 0}</div>
          <p className="text-sm text-gray-500 mt-1">{t('needsAttention')}</p>
        </div>

        {/* Pending Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">{t('pendingAlerts')}</h3>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600">{stats?.pendingAlerts ?? 0}</div>
          <p className="text-sm text-gray-500 mt-1">{t('awaitingReview')}</p>
        </div>

        {/* Resolved Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">{t('resolvedAlerts')}</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">{stats?.resolvedAlerts ?? 0}</div>
          <p className="text-sm text-gray-500 mt-1">
            {(stats?.falsePositiveRate ?? 0).toFixed(1)}% {t('falsePositives')}
          </p>
        </div>
      </div>

      {/* Risk Score and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Average Risk Score */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('averageRiskScore')}</h3>
          <div className="flex items-center justify-center">
            <RiskScoreIndicator
              score={stats?.averageRiskScore ?? 0}
              previousScore={59.8}
              size="lg"
              showTrend
              showLabel
            />
          </div>
        </div>

        {/* Risk Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary-600" />
            {t('riskTrend')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.riskTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={t('riskScore')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alert Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Type */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('alertsByType')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name={t('count')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Severity */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('alertsBySeverity')}</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recentAlerts')}</h3>
        <FraudAlertsList alerts={alerts} onUpdateStatus={handleUpdateStatus} />
      </div>

      {/* Configuration Panel */}
      {showSettings && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('detectionRules')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('unusualAmountThreshold')}
              </label>
              <RiskScoreProgress score={75} label={t('sensitivity')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('rapidSuccessionWindow')}
              </label>
              <input
                type="number"
                defaultValue={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">{t('minutesBetweenTransactions')}</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="weekend" defaultChecked className="rounded" />
              <label htmlFor="weekend" className="text-sm text-gray-700">
                {t('detectWeekendActivity')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="afterhours" defaultChecked className="rounded" />
              <label htmlFor="afterhours" className="text-sm text-gray-700">
                {t('detectAfterHours')}
              </label>
            </div>
            <button className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors">
              {t('saveSettings')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
