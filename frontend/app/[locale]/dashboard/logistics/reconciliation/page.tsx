'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Play,
  BarChart3,
  Calendar,
  FileCheck,
  Edit3,
  Check,
  Ban,
  Search,
} from 'lucide-react';

interface StockCountSession {
  id: string;
  warehouseId: string;
  type: CountType;
  status: CountSessionStatus;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  countedBy?: string;
  verifiedBy?: string;
  items: StockCountItem[];
  summary?: CountSummary;
  notes?: string;
}

type CountType = 'FULL' | 'CYCLE' | 'SPOT' | 'ANNUAL' | 'PERPETUAL';
type CountSessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED';

interface StockCountItem {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  locationCode?: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  variancePercent?: number;
  varianceValue?: number;
  unitCost: number;
  status: CountItemStatus;
  countedBy?: string;
  notes?: string;
  requiresRecount: boolean;
}

type CountItemStatus = 'PENDING' | 'COUNTED' | 'VARIANCE_DETECTED' | 'RECOUNT_REQUIRED' | 'VERIFIED' | 'ADJUSTED';

interface CountSummary {
  totalItems: number;
  countedItems: number;
  pendingItems: number;
  itemsWithVariance: number;
  totalSystemValue: number;
  totalCountedValue: number;
  totalVarianceValue: number;
  variancePercent: number;
  positiveVarianceItems: number;
  negativeVarianceItems: number;
  completionPercent: number;
}

interface InventoryAdjustment {
  id: string;
  itemId: string;
  sku: string;
  type: 'INCREASE' | 'DECREASE' | 'CORRECTION';
  reason: string;
  previousQuantity: number;
  adjustedQuantity: number;
  quantityChange: number;
  valueChange: number;
  status: AdjustmentStatus;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

type AdjustmentStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'APPLIED';

interface DashboardData {
  activeSessions: StockCountSession[];
  recentCompletedSessions: StockCountSession[];
  pendingAdjustments: InventoryAdjustment[];
  stats: {
    totalSessionsThisMonth: number;
    averageVariancePercent: number;
    totalAdjustmentsValue: number;
    itemsRequiringAttention: number;
  };
  alerts: { type: 'info' | 'warning' | 'error'; message: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

const COUNT_TYPE_LABELS: Record<CountType, string> = {
  FULL: 'Inventar Complet',
  CYCLE: 'Numarare Ciclica',
  SPOT: 'Verificare Aleatorie',
  ANNUAL: 'Inventar Anual',
  PERPETUAL: 'Inventar Continuu',
};

const STATUS_LABELS: Record<CountSessionStatus, string> = {
  SCHEDULED: 'Programat',
  IN_PROGRESS: 'In Desfasurare',
  PENDING_REVIEW: 'Revizuire',
  COMPLETED: 'Finalizat',
  CANCELLED: 'Anulat',
};

export default function InventoryReconciliationPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedSession, setSelectedSession] = useState<StockCountSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'adjustments'>('overview');
  const [countInputs, setCountInputs] = useState<Record<string, number>>({});

  const getUserId = () => localStorage.getItem('user_id') || 'demo-user';

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();

      const response = await fetch(`${API_URL}/inventory/reconciliation/${userId}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      } else {
        // Mock data for demo
        setDashboard({
          activeSessions: [
            {
              id: 'COUNT-001',
              warehouseId: 'WH-001',
              type: 'CYCLE',
              status: 'IN_PROGRESS',
              scheduledDate: new Date().toISOString(),
              startedAt: new Date().toISOString(),
              countedBy: 'Maria Ionescu',
              items: [
                { id: '1', itemId: 'ITEM-001', sku: 'SKU-001', name: 'Produs A', systemQuantity: 100, countedQuantity: 98, variance: -2, variancePercent: -2, varianceValue: -100, unitCost: 50, status: 'VARIANCE_DETECTED', requiresRecount: false },
                { id: '2', itemId: 'ITEM-002', sku: 'SKU-002', name: 'Produs B', systemQuantity: 250, unitCost: 25, status: 'PENDING', requiresRecount: false },
                { id: '3', itemId: 'ITEM-003', sku: 'SKU-003', name: 'Produs C', systemQuantity: 75, countedQuantity: 75, variance: 0, variancePercent: 0, varianceValue: 0, unitCost: 100, status: 'COUNTED', requiresRecount: false },
              ],
              summary: {
                totalItems: 3,
                countedItems: 2,
                pendingItems: 1,
                itemsWithVariance: 1,
                totalSystemValue: 15000,
                totalCountedValue: 12350,
                totalVarianceValue: -100,
                variancePercent: -0.67,
                positiveVarianceItems: 0,
                negativeVarianceItems: 1,
                completionPercent: 67,
              },
            },
          ],
          recentCompletedSessions: [
            {
              id: 'COUNT-000',
              warehouseId: 'WH-001',
              type: 'SPOT',
              status: 'COMPLETED',
              scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
              verifiedBy: 'Admin',
              items: [],
              summary: {
                totalItems: 10,
                countedItems: 10,
                pendingItems: 0,
                itemsWithVariance: 2,
                totalSystemValue: 25000,
                totalCountedValue: 24800,
                totalVarianceValue: -200,
                variancePercent: -0.8,
                positiveVarianceItems: 1,
                negativeVarianceItems: 1,
                completionPercent: 100,
              },
            },
          ],
          pendingAdjustments: [
            {
              id: 'ADJ-001',
              itemId: 'ITEM-001',
              sku: 'SKU-001',
              type: 'DECREASE',
              reason: 'PHYSICAL_COUNT',
              previousQuantity: 100,
              adjustedQuantity: 98,
              quantityChange: -2,
              valueChange: -100,
              status: 'PENDING_APPROVAL',
              createdAt: new Date().toISOString(),
            },
          ],
          stats: {
            totalSessionsThisMonth: 3,
            averageVariancePercent: -0.5,
            totalAdjustmentsValue: 350,
            itemsRequiringAttention: 2,
          },
          alerts: [
            { type: 'info', message: '1 sesiune de inventariere in desfasurare' },
            { type: 'warning', message: '1 ajustare asteapta aprobare' },
          ],
        });
      }
    } catch (err) {
      setError('Eroare la incarcarea datelor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleStartSession = async (sessionId: string) => {
    setActionLoading(`start-${sessionId}`);
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();
      const userName = localStorage.getItem('user_name') || 'Utilizator';

      const response = await fetch(
        `${API_URL}/inventory/reconciliation/${userId}/sessions/${sessionId}/start`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ countedBy: userName }),
        }
      );

      if (response.ok) {
        fetchDashboard();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecordCount = async (sessionId: string, itemId: string, quantity: number) => {
    setActionLoading(`count-${itemId}`);
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();
      const userName = localStorage.getItem('user_name') || 'Utilizator';

      const response = await fetch(
        `${API_URL}/inventory/reconciliation/${userId}/sessions/${sessionId}/items/${itemId}/count`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ countedQuantity: quantity, countedBy: userName }),
        }
      );

      if (response.ok) {
        fetchDashboard();
        if (selectedSession) {
          // Refresh selected session
          const sessionResponse = await fetch(
            `${API_URL}/inventory/reconciliation/${userId}/sessions/${sessionId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (sessionResponse.ok) {
            setSelectedSession(await sessionResponse.json());
          }
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAdjustment = async (adjustmentId: string) => {
    setActionLoading(`approve-${adjustmentId}`);
    try {
      const token = localStorage.getItem('auth_token');
      const userId = getUserId();
      const userName = localStorage.getItem('user_name') || 'Admin';

      const response = await fetch(
        `${API_URL}/inventory/reconciliation/${userId}/adjustments/${adjustmentId}/approve`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approvedBy: userName }),
        }
      );

      if (response.ok) {
        fetchDashboard();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: CountSessionStatus) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-100';
      case 'SCHEDULED': return 'text-gray-600 bg-gray-100';
      case 'PENDING_REVIEW': return 'text-yellow-600 bg-yellow-100';
      case 'CANCELLED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getItemStatusIcon = (status: CountItemStatus) => {
    switch (status) {
      case 'COUNTED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'VARIANCE_DETECTED': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'RECOUNT_REQUIRED': return <RefreshCw className="h-4 w-4 text-orange-500" />;
      case 'VERIFIED': return <FileCheck className="h-4 w-4 text-green-600" />;
      case 'ADJUSTED': return <Edit3 className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Se incarca...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            Reconciliere Stocuri
          </h1>
          <p className="text-gray-600 mt-1">
            Gestionati inventarierile fizice si ajustarile de stoc
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizeaza
        </button>
      </div>

      {/* Alerts */}
      {dashboard?.alerts && dashboard.alerts.length > 0 && (
        <div className="space-y-2">
          {dashboard.alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg flex items-center gap-2 ${
                alert.type === 'error' ? 'bg-red-50 text-red-700' :
                alert.type === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              }`}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      {dashboard?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sesiuni luna aceasta</p>
                <p className="text-xl font-bold">{dashboard.stats.totalSessionsThisMonth}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dashboard.stats.averageVariancePercent < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                {dashboard.stats.averageVariancePercent < 0 ? (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Varianta medie</p>
                <p className={`text-xl font-bold ${dashboard.stats.averageVariancePercent < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {dashboard.stats.averageVariancePercent}%
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Valoare ajustari</p>
                <p className="text-xl font-bold">{dashboard.stats.totalAdjustmentsValue.toLocaleString()} RON</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dashboard.stats.itemsRequiringAttention > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`h-5 w-5 ${dashboard.stats.itemsRequiringAttention > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Necesita atentie</p>
                <p className="text-xl font-bold">{dashboard.stats.itemsRequiringAttention}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {(['overview', 'sessions', 'adjustments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 border-b-2 font-medium ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' && 'Prezentare Generala'}
              {tab === 'sessions' && 'Sesiuni Inventariere'}
              {tab === 'adjustments' && 'Ajustari'}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Sessions */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Play className="h-4 w-4 text-blue-600" />
                Sesiuni Active
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {dashboard?.activeSessions?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nicio sesiune activa</p>
              ) : (
                dashboard?.activeSessions?.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{COUNT_TYPE_LABELS[session.type]}</p>
                        <p className="text-sm text-gray-500">{session.id}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {STATUS_LABELS[session.status]}
                      </span>
                    </div>
                    {session.summary && (
                      <div className="mt-2 flex gap-4 text-sm">
                        <span className="text-gray-500">
                          Progres: <span className="font-medium">{session.summary.completionPercent}%</span>
                        </span>
                        <span className="text-gray-500">
                          Variante: <span className="font-medium">{session.summary.itemsWithVariance}</span>
                        </span>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Adjustments */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-orange-600" />
                Ajustari in Asteptare
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {dashboard?.pendingAdjustments?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nicio ajustare in asteptare</p>
              ) : (
                dashboard?.pendingAdjustments?.map((adj) => (
                  <div key={adj.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{adj.sku}</p>
                        <p className="text-sm text-gray-500">
                          {adj.previousQuantity} &rarr; {adj.adjustedQuantity} ({adj.quantityChange > 0 ? '+' : ''}{adj.quantityChange})
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveAdjustment(adj.id)}
                          disabled={actionLoading === `approve-${adj.id}`}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Aproba"
                        >
                          {actionLoading === `approve-${adj.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Respinge"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Valoare: <span className={adj.valueChange < 0 ? 'text-red-600' : 'text-green-600'}>
                        {adj.valueChange > 0 ? '+' : ''}{adj.valueChange} RON
                      </span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Completed */}
          <div className="bg-white rounded-lg border lg:col-span-2">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Sesiuni Recente Finalizate
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tip</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Data</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Articole</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Variante</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Varianta %</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.recentCompletedSessions?.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{session.id}</td>
                      <td className="px-4 py-3 text-sm">{COUNT_TYPE_LABELS[session.type]}</td>
                      <td className="px-4 py-3 text-sm">
                        {session.completedAt ? new Date(session.completedAt).toLocaleDateString('ro-RO') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{session.summary?.totalItems || 0}</td>
                      <td className="px-4 py-3 text-sm text-right">{session.summary?.itemsWithVariance || 0}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        (session.summary?.variancePercent || 0) < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {session.summary?.variancePercent || 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session List */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Toate Sesiunile</h3>
            </div>
            <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
              {[...(dashboard?.activeSessions || []), ...(dashboard?.recentCompletedSessions || [])].map((session) => (
                <div
                  key={session.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSession?.id === session.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{session.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(session.status)}`}>
                      {STATUS_LABELS[session.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{COUNT_TYPE_LABELS[session.type]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Session Details */}
          <div className="lg:col-span-2 bg-white rounded-lg border">
            {selectedSession ? (
              <>
                <div className="p-4 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{selectedSession.id}</h3>
                    <p className="text-sm text-gray-500">{COUNT_TYPE_LABELS[selectedSession.type]}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedSession.status)}`}>
                    {STATUS_LABELS[selectedSession.status]}
                  </span>
                </div>

                {/* Progress Bar */}
                {selectedSession.summary && (
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progres</span>
                      <span className="font-medium">{selectedSession.summary.completionPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${selectedSession.summary.completionPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>{selectedSession.summary.countedItems} numarate</span>
                      <span>{selectedSession.summary.pendingItems} ramase</span>
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Articol</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Sistem</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Numarat</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Varianta</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSession.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{item.systemQuantity}</td>
                          <td className="px-4 py-3 text-right">
                            {item.status === 'PENDING' && selectedSession.status === 'IN_PROGRESS' ? (
                              <div className="flex items-center gap-2 justify-end">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-20 px-2 py-1 border rounded text-sm text-right"
                                  value={countInputs[item.id] || ''}
                                  onChange={(e) => setCountInputs({
                                    ...countInputs,
                                    [item.id]: parseInt(e.target.value) || 0,
                                  })}
                                  placeholder={String(item.systemQuantity)}
                                />
                                <button
                                  onClick={() => handleRecordCount(selectedSession.id, item.id, countInputs[item.id] || item.systemQuantity)}
                                  disabled={actionLoading === `count-${item.id}`}
                                  className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  {actionLoading === `count-${item.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm">{item.countedQuantity ?? '-'}</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-medium ${
                            (item.variance || 0) < 0 ? 'text-red-600' :
                            (item.variance || 0) > 0 ? 'text-green-600' : ''
                          }`}>
                            {item.variance !== undefined ? (
                              <>
                                {item.variance > 0 ? '+' : ''}{item.variance}
                                <span className="text-xs text-gray-500 ml-1">({item.variancePercent}%)</span>
                              </>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getItemStatusIcon(item.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Footer */}
                {selectedSession.summary && selectedSession.status !== 'SCHEDULED' && (
                  <div className="p-4 border-t bg-gray-50">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Valoare Sistem</p>
                        <p className="font-semibold">{selectedSession.summary.totalSystemValue.toLocaleString()} RON</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Valoare Numarata</p>
                        <p className="font-semibold">{selectedSession.summary.totalCountedValue.toLocaleString()} RON</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Varianta Totala</p>
                        <p className={`font-semibold ${
                          selectedSession.summary.totalVarianceValue < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {selectedSession.summary.totalVarianceValue > 0 ? '+' : ''}
                          {selectedSession.summary.totalVarianceValue.toLocaleString()} RON
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Selectati o sesiune pentru a vedea detaliile</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjustments Tab */}
      {activeTab === 'adjustments' && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Toate Ajustarile</h3>
            <div className="flex gap-2">
              <select className="px-3 py-1.5 border rounded-lg text-sm">
                <option value="">Toate statusurile</option>
                <option value="PENDING_APPROVAL">In asteptare</option>
                <option value="APPROVED">Aprobate</option>
                <option value="APPLIED">Aplicate</option>
                <option value="REJECTED">Respinse</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Motiv</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Anterior</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Nou</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Variatie</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Valoare</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.pendingAdjustments?.map((adj) => (
                  <tr key={adj.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{adj.id}</td>
                    <td className="px-4 py-3 text-sm font-medium">{adj.sku}</td>
                    <td className="px-4 py-3 text-sm">{adj.reason.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm text-right">{adj.previousQuantity}</td>
                    <td className="px-4 py-3 text-sm text-right">{adj.adjustedQuantity}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${
                      adj.quantityChange < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {adj.quantityChange > 0 ? '+' : ''}{adj.quantityChange}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${
                      adj.valueChange < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {adj.valueChange > 0 ? '+' : ''}{adj.valueChange} RON
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        adj.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                        adj.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                        adj.status === 'APPLIED' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {adj.status === 'PENDING_APPROVAL' ? 'In asteptare' :
                         adj.status === 'APPROVED' ? 'Aprobat' :
                         adj.status === 'APPLIED' ? 'Aplicat' : 'Respins'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {adj.status === 'PENDING_APPROVAL' && (
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleApproveAdjustment(adj.id)}
                            disabled={actionLoading === `approve-${adj.id}`}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Aproba"
                          >
                            {actionLoading === `approve-${adj.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded" title="Respinge">
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
