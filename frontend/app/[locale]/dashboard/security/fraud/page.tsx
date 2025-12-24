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
const MOCK_STATS: FraudDashboardStats = {
  totalAlerts: 47,
  criticalAlerts: 3,
  pendingAlerts: 12,
  resolvedAlerts: 28,
  falsePositiveRate: 18.5,
  averageRiskScore: 62.3,
  alertsByType: {
    UNUSUAL_AMOUNT: 12,
    DUPLICATE_INVOICE: 8,
    RAPID_SUCCESSION: 6,
    VENDOR_ANOMALY: 9,
    GEOGRAPHIC_INCONSISTENCY: 2,
    WEEKEND_ACTIVITY: 5,
    AFTER_HOURS: 3,
    VELOCITY_ANOMALY: 2,
  },
  alertsBySeverity: {
    LOW: 15,
    MEDIUM: 18,
    HIGH: 11,
    CRITICAL: 3,
  },
  riskTrend: [
    { date: '2025-12-05', score: 58 },
    { date: '2025-12-06', score: 62 },
    { date: '2025-12-07', score: 65 },
    { date: '2025-12-08', score: 61 },
    { date: '2025-12-09', score: 59 },
    { date: '2025-12-10', score: 63 },
    { date: '2025-12-11', score: 67 },
    { date: '2025-12-12', score: 62 },
  ],
};

const MOCK_ALERTS: FraudAlert[] = [
  {
    id: '1',
    type: 'UNUSUAL_AMOUNT',
    severity: 'CRITICAL',
    status: 'PENDING',
    title: 'Unusually Large Transaction Detected',
    description: 'Transaction amount 125,000 RON is 4.2 standard deviations above your average of 12,500 RON',
    riskScore: 92.5,
    entityType: 'INVOICE',
    entityId: 'INV-2025-001234',
    metadata: {
      amount: 125000,
      average: 12500,
      stdDev: 3200,
      zScore: 4.2,
    },
    detectedAt: new Date('2025-12-12T14:30:00'),
  },
  {
    id: '2',
    type: 'DUPLICATE_INVOICE',
    severity: 'HIGH',
    status: 'PENDING',
    title: 'Potential Duplicate Invoice',
    description: 'Found 2 similar transaction(s) with the same amount within 24 hours',
    riskScore: 78.3,
    entityType: 'INVOICE',
    entityId: 'INV-2025-001235',
    metadata: {
      duplicateCount: 2,
      amount: 8500,
    },
    detectedAt: new Date('2025-12-12T11:15:00'),
  },
  {
    id: '3',
    type: 'VENDOR_ANOMALY',
    severity: 'MEDIUM',
    status: 'INVESTIGATING',
    title: 'New Vendor with Large Transaction',
    description: 'Large transaction (45,000 RON) with vendor added only 3 days ago',
    riskScore: 65.7,
    entityType: 'INVOICE',
    entityId: 'INV-2025-001230',
    metadata: {
      vendorId: 'VEND-0089',
      vendorName: 'Tech Solutions SRL',
      vendorAgeDays: 3,
      amount: 45000,
    },
    detectedAt: new Date('2025-12-11T16:20:00'),
  },
  {
    id: '4',
    type: 'RAPID_SUCCESSION',
    severity: 'HIGH',
    status: 'PENDING',
    title: 'Rapid Transaction Succession',
    description: '5 transactions detected within 3 minutes',
    riskScore: 81.2,
    entityType: 'TRANSACTION',
    entityId: 'TXN-BATCH-456',
    metadata: {
      transactionCount: 5,
      timeWindow: 3,
    },
    detectedAt: new Date('2025-12-12T09:45:00'),
  },
  {
    id: '5',
    type: 'WEEKEND_ACTIVITY',
    severity: 'LOW',
    status: 'FALSE_POSITIVE',
    title: 'Weekend Transaction',
    description: 'Transaction created on Saturday',
    riskScore: 28.5,
    entityType: 'INVOICE',
    entityId: 'INV-2025-001220',
    metadata: {
      dayOfWeek: 6,
    },
    detectedAt: new Date('2025-12-09T13:00:00'),
    resolvedAt: new Date('2025-12-10T10:00:00'),
    resolution: 'Confirmed legitimate weekend work - architectural project deadline',
  },
];

export default function FraudDetectionDashboard() {
  const t = useTranslations('fraudDetection');
  const [stats, setStats] = useState<FraudDashboardStats>(MOCK_STATS);
  const [alerts, setAlerts] = useState<FraudAlert[]>(MOCK_ALERTS);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch('/api/fraud-detection/dashboard/stats');
      // const data = await response.json();
      // setStats(data);

      // const alertsResponse = await fetch('/api/fraud-detection/alerts');
      // const alertsData = await alertsResponse.json();
      // setAlerts(alertsData);

      // Using mock data for now
      await new Promise(resolve => setTimeout(resolve, 500));
      setStats(MOCK_STATS);
      setAlerts(MOCK_ALERTS);
    } catch (error) {
      console.error('Failed to fetch fraud detection data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle alert status update
  const handleUpdateStatus = async (alertId: string, status: FraudAlertStatus, resolution?: string) => {
    try {
      // In production, call API
      // await fetch(`/api/fraud-detection/alerts/${alertId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status, resolution }),
      // });

      // Update local state
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
  const alertTypeData = Object.entries(stats.alertsByType).map(([name, value]) => ({
    name: t(`alertTypes.${name.toLowerCase()}`),
    value,
  }));

  const severityData = Object.entries(stats.alertsBySeverity).map(([name, value]) => ({
    name: t(`severity.${name.toLowerCase()}`),
    value,
    color:
      name === 'CRITICAL' ? '#dc2626' :
      name === 'HIGH' ? '#ea580c' :
      name === 'MEDIUM' ? '#ca8a04' : '#2563eb',
  }));

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
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
          <div className="text-3xl font-bold text-gray-900">{stats.totalAlerts}</div>
          <p className="text-sm text-gray-500 mt-1">{t('allTime')}</p>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">{t('criticalAlerts')}</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600">{stats.criticalAlerts}</div>
          <p className="text-sm text-gray-500 mt-1">{t('needsAttention')}</p>
        </div>

        {/* Pending Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">{t('pendingAlerts')}</h3>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600">{stats.pendingAlerts}</div>
          <p className="text-sm text-gray-500 mt-1">{t('awaitingReview')}</p>
        </div>

        {/* Resolved Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">{t('resolvedAlerts')}</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.resolvedAlerts}</div>
          <p className="text-sm text-gray-500 mt-1">
            {stats.falsePositiveRate.toFixed(1)}% {t('falsePositives')}
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
              score={stats.averageRiskScore}
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
              <LineChart data={stats.riskTrend}>
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
