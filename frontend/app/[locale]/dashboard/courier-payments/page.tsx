'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
  Truck,
  DollarSign,
  Calendar,
  Package,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  FileText,
  Download,
  RefreshCw,
  Loader2,
  Calculator,
  CreditCard,
  Clock,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface PaymentCalculation {
  period: { from: string; to: string };
  provider: string;
  totalDeliveries: number;
  breakdown: {
    standardDeliveries: { count: number; amount: number };
    expressDeliveries: { count: number; amount: number };
    oversizeParcels: { count: number; amount: number };
    returnDeliveries: { count: number; amount: number };
    failedAttempts: { count: number; amount: number };
    saturdayBonuses: { count: number; amount: number };
  };
  subtotal: number;
  deductions: any[];
  totalDeductions: number;
  netPayment: number;
  currency: string;
}

interface MonthlySummary {
  period: { year: number; month: number };
  byProvider: {
    provider: string;
    totalDeliveries: number;
    grossAmount: number;
    deductions: number;
    netAmount: number;
    averagePerDelivery: number;
  }[];
  totals: {
    deliveries: number;
    grossAmount: number;
    deductions: number;
    netAmount: number;
  };
  currency: string;
  generatedAt: string;
}

interface DriverPayout {
  driverId: string;
  driverName: string;
  period: { from: string; to: string };
  metrics: {
    routesCompleted: number;
    deliveriesCompleted: number;
    parcelsDelivered: number;
    distanceKm: number;
  };
  breakdown: {
    basePayment: number;
    parcelBonus: number;
    distanceAllowance: number;
  };
  grossPayment: number;
  taxWithholding: number;
  netPayment: number;
  currency: string;
}

interface ReconciliationResult {
  provider: string;
  calculatedAmount: number;
  courierStatementAmount: number;
  difference: number;
  differencePercent: number;
  status: 'MATCHED' | 'DISCREPANCY' | 'MAJOR_DISCREPANCY';
  details: {
    ourDeliveryCount: number;
    recommendation: string;
  };
}

export default function CourierPaymentsPage() {
  const t = useTranslations('payments');
  const [activeTab, setActiveTab] = useState<'overview' | 'calculate' | 'drivers' | 'reconcile'>('overview');
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('DPD');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [selectedMonth, setSelectedMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  // Data states
  const [paymentCalc, setPaymentCalc] = useState<PaymentCalculation | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [driverPayouts, setDriverPayouts] = useState<{ drivers: DriverPayout[]; totals: any } | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);
  const [courierAmount, setCourierAmount] = useState<string>('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    fetchMonthlySummary();
  }, [selectedMonth]);

  const fetchMonthlySummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${API_URL}/api/v1/courier/payments/monthly-summary?year=${selectedMonth.year}&month=${selectedMonth.month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setMonthlySummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch monthly summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePayment = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${API_URL}/api/v1/courier/payments/calculate?provider=${selectedProvider}&dateFrom=${dateRange.from}&dateTo=${dateRange.to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setPaymentCalc(data);
      }
    } catch (err) {
      console.error('Failed to calculate payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverPayouts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${API_URL}/api/v1/courier/driver-payouts?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setDriverPayouts(data);
      }
    } catch (err) {
      console.error('Failed to fetch driver payouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const reconcilePayment = async () => {
    if (!courierAmount) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/courier/payments/reconcile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selectedProvider,
          courierStatementAmount: parseFloat(courierAmount),
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReconciliation(data);
      }
    } catch (err) {
      console.error('Failed to reconcile:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MATCHED': return 'bg-green-100 text-green-800';
      case 'DISCREPANCY': return 'bg-yellow-100 text-yellow-800';
      case 'MAJOR_DISCREPANCY': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('courierPayments') || 'Subcontractor Payments'}
          </h1>
          <p className="text-gray-500">
            {t('paymentDescription') || 'Calculate and manage payments for courier subcontractors and drivers'}
          </p>
        </div>
        <button
          onClick={fetchMonthlySummary}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh') || 'Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: t('tabOverview') || 'Overview', icon: PieChart },
            { id: 'calculate', label: t('tabCalculate') || 'Calculate Payment', icon: Calculator },
            { id: 'drivers', label: t('tabDrivers') || 'Driver Payouts', icon: Users },
            { id: 'reconcile', label: t('tabReconcile') || 'Reconciliation', icon: CheckCircle },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id as any);
                if (id === 'drivers') fetchDriverPayouts();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Month Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">{t('selectMonth') || 'Select Month'}:</label>
            <input
              type="month"
              value={`${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-');
                setSelectedMonth({ year: parseInt(year), month: parseInt(month) });
              }}
              className="border rounded-lg px-3 py-2"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : monthlySummary ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <Package className="h-10 w-10 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">{t('totalDeliveries') || 'Total Deliveries'}</p>
                      <p className="text-2xl font-bold text-gray-900">{monthlySummary.totals.deliveries}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-10 w-10 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">{t('grossAmount') || 'Gross Amount'}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(monthlySummary.totals.grossAmount)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">{t('deductions') || 'Deductions'}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(monthlySummary.totals.deductions)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <CreditCard className="h-10 w-10 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">{t('netPayment') || 'Net Payment'}</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(monthlySummary.totals.netAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">{t('byProvider') || 'Breakdown by Provider'}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-500">{t('provider') || 'Provider'}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">{t('deliveries') || 'Deliveries'}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">{t('gross') || 'Gross'}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">{t('deductions') || 'Deductions'}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">{t('net') || 'Net'}</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500">{t('avgPerDelivery') || 'Avg/Delivery'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySummary.byProvider.map((provider) => (
                        <tr key={provider.provider} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <Truck className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="font-medium">{provider.provider}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">{provider.totalDeliveries}</td>
                          <td className="text-right py-3 px-4">{formatCurrency(provider.grossAmount)}</td>
                          <td className="text-right py-3 px-4 text-red-600">-{formatCurrency(provider.deductions)}</td>
                          <td className="text-right py-3 px-4 font-semibold">{formatCurrency(provider.netAmount)}</td>
                          <td className="text-right py-3 px-4 text-gray-500">{formatCurrency(provider.averagePerDelivery)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{t('noDataAvailable') || 'No payment data available for this period'}</p>
            </div>
          )}
        </div>
      )}

      {/* Calculate Payment Tab */}
      {activeTab === 'calculate' && (
        <div className="space-y-6">
          {/* Calculation Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">{t('calculatePayment') || 'Calculate Payment'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('provider') || 'Provider'}</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="DPD">DPD</option>
                  <option value="GLS">GLS</option>
                  <option value="DHL">DHL</option>
                  <option value="UPS">UPS</option>
                  <option value="HERMES">HERMES</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fromDate') || 'From Date'}</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('toDate') || 'To Date'}</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={calculatePayment}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Calculator className="h-5 w-5 mr-2" />
                      {t('calculate') || 'Calculate'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Calculation Results */}
          {paymentCalc && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">{t('calculationResults') || 'Calculation Results'}</h3>
                <span className="text-sm text-gray-500">
                  {paymentCalc.provider} | {new Date(paymentCalc.period.from).toLocaleDateString()} - {new Date(paymentCalc.period.to).toLocaleDateString()}
                </span>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('standardDeliveries') || 'Standard Deliveries'}</p>
                  <p className="text-xl font-bold">{paymentCalc.breakdown.standardDeliveries.count}</p>
                  <p className="text-sm text-blue-600">{formatCurrency(paymentCalc.breakdown.standardDeliveries.amount)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('expressDeliveries') || 'Express Deliveries'}</p>
                  <p className="text-xl font-bold">{paymentCalc.breakdown.expressDeliveries.count}</p>
                  <p className="text-sm text-purple-600">{formatCurrency(paymentCalc.breakdown.expressDeliveries.amount)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('oversizeParcels') || 'Oversize Parcels'}</p>
                  <p className="text-xl font-bold">{paymentCalc.breakdown.oversizeParcels.count}</p>
                  <p className="text-sm text-orange-600">{formatCurrency(paymentCalc.breakdown.oversizeParcels.amount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('returnDeliveries') || 'Return Deliveries'}</p>
                  <p className="text-xl font-bold">{paymentCalc.breakdown.returnDeliveries.count}</p>
                  <p className="text-sm text-gray-600">{formatCurrency(paymentCalc.breakdown.returnDeliveries.amount)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('failedAttempts') || 'Failed Attempts'}</p>
                  <p className="text-xl font-bold">{paymentCalc.breakdown.failedAttempts.count}</p>
                  <p className="text-sm text-red-600">{formatCurrency(paymentCalc.breakdown.failedAttempts.amount)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('saturdayBonuses') || 'Saturday Bonuses'}</p>
                  <p className="text-xl font-bold">{paymentCalc.breakdown.saturdayBonuses.count}</p>
                  <p className="text-sm text-green-600">{formatCurrency(paymentCalc.breakdown.saturdayBonuses.amount)}</p>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">{t('subtotal') || 'Subtotal'}</span>
                  <span className="font-medium">{formatCurrency(paymentCalc.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">{t('deductions') || 'Deductions'}</span>
                  <span className="font-medium text-red-600">-{formatCurrency(paymentCalc.totalDeductions)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t text-lg">
                  <span className="font-semibold">{t('netPayment') || 'Net Payment'}</span>
                  <span className="font-bold text-green-600">{formatCurrency(paymentCalc.netPayment)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Driver Payouts Tab */}
      {activeTab === 'drivers' && (
        <div className="space-y-6">
          {/* Date Filter */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fromDate') || 'From'}</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('toDate') || 'To'}</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchDriverPayouts}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('loadPayouts') || 'Load Payouts'}
                </button>
              </div>
            </div>
          </div>

          {driverPayouts ? (
            <>
              {/* Totals Summary */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">{t('totalDrivers') || 'Total Drivers'}</p>
                  <p className="text-2xl font-bold">{driverPayouts.totals.totalDrivers}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">{t('totalDeliveries') || 'Total Deliveries'}</p>
                  <p className="text-2xl font-bold">{driverPayouts.totals.totalDeliveries}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">{t('grossPayments') || 'Gross Payments'}</p>
                  <p className="text-2xl font-bold">{formatCurrency(driverPayouts.totals.totalGross)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">{t('taxWithholding') || 'Tax (19%)'}</p>
                  <p className="text-2xl font-bold text-red-600">-{formatCurrency(driverPayouts.totals.totalTax)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">{t('netPayouts') || 'Net Payouts'}</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(driverPayouts.totals.totalNet)}</p>
                </div>
              </div>

              {/* Driver List */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">{t('driverPayoutDetails') || 'Driver Payout Details'}</h3>
                </div>
                <div className="divide-y">
                  {driverPayouts.drivers.map((driver) => (
                    <div key={driver.driverId} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{driver.driverName}</p>
                            <p className="text-sm text-gray-500">
                              {driver.metrics.routesCompleted} {t('routes') || 'routes'} | {driver.metrics.deliveriesCompleted} {t('deliveries') || 'deliveries'} | {driver.metrics.distanceKm.toFixed(0)} km
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{formatCurrency(driver.netPayment)}</p>
                          <p className="text-sm text-gray-500">
                            {t('gross') || 'Gross'}: {formatCurrency(driver.grossPayment)} | {t('tax') || 'Tax'}: -{formatCurrency(driver.taxWithholding)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">{t('basePayment') || 'Base'}:</span>{' '}
                          <span className="font-medium">{formatCurrency(driver.breakdown.basePayment)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('parcelBonus') || 'Parcel Bonus'}:</span>{' '}
                          <span className="font-medium">{formatCurrency(driver.breakdown.parcelBonus)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('distanceAllowance') || 'Distance'}:</span>{' '}
                          <span className="font-medium">{formatCurrency(driver.breakdown.distanceAllowance)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{t('selectDateRange') || 'Select a date range and click "Load Payouts" to view driver payment details'}</p>
            </div>
          )}
        </div>
      )}

      {/* Reconciliation Tab */}
      {activeTab === 'reconcile' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">{t('reconcileWithCourier') || 'Reconcile with Courier Statement'}</h3>
            <p className="text-gray-500 mb-6">
              {t('reconcileDescription') || 'Compare your calculated payment with the courier\'s official statement to identify discrepancies.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('provider') || 'Provider'}</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="DPD">DPD</option>
                  <option value="GLS">GLS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fromDate') || 'From'}</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('toDate') || 'To'}</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('courierAmount') || 'Courier Statement (EUR)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={courierAmount}
                  onChange={(e) => setCourierAmount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={reconcilePayment}
                  disabled={loading || !courierAmount}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      {t('reconcile') || 'Reconcile'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {reconciliation && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">{t('reconciliationResult') || 'Reconciliation Result'}</h3>
                <span className={`px-4 py-2 rounded-full font-medium ${getStatusColor(reconciliation.status)}`}>
                  {reconciliation.status === 'MATCHED' && (t('matched') || 'Matched')}
                  {reconciliation.status === 'DISCREPANCY' && (t('minorDiscrepancy') || 'Minor Discrepancy')}
                  {reconciliation.status === 'MAJOR_DISCREPANCY' && (t('majorDiscrepancy') || 'Major Discrepancy')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">{t('ourCalculation') || 'Our Calculation'}</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(reconciliation.calculatedAmount)}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">{t('courierStatement') || 'Courier Statement'}</p>
                  <p className="text-2xl font-bold">{formatCurrency(reconciliation.courierStatementAmount)}</p>
                </div>
                <div className={`text-center p-4 rounded-lg ${
                  reconciliation.difference >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <p className="text-sm text-gray-500 mb-1">{t('difference') || 'Difference'}</p>
                  <p className={`text-2xl font-bold flex items-center justify-center ${
                    reconciliation.difference >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {reconciliation.difference >= 0 ? (
                      <ArrowUpRight className="h-5 w-5 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 mr-1" />
                    )}
                    {formatCurrency(Math.abs(reconciliation.difference))}
                    <span className="text-sm ml-2">({reconciliation.differencePercent.toFixed(2)}%)</span>
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">
                  <strong>{t('deliveryCount') || 'Our Delivery Count'}:</strong> {reconciliation.details.ourDeliveryCount}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  <strong>{t('recommendation') || 'Recommendation'}:</strong> {reconciliation.details.recommendation}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
