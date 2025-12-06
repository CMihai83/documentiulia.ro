import { useState, useEffect } from 'react';
import { AlertTriangle, Check, ShoppingCart, X, TrendingDown } from 'lucide-react';

interface LowStockAlert {
  id: string;
  product_name: string;
  sku: string;
  barcode: string;
  warehouse_name: string;
  warehouse_code: string;
  current_quantity: number;
  current_stock: number;
  reorder_level: number;
  suggested_order_quantity: number;
  alert_status: string;
  days_out_of_stock: number;
  estimated_lost_revenue: number;
  created_at: string;
  unit_of_measure: string;
  selling_price: number;
  purchase_price: number;
}

interface AlertSummary {
  total_alerts: number;
  active_alerts: number;
  acknowledged_alerts: number;
  out_of_stock_count: number;
  suggested_order_value: number;
}

export default function LowStockAlertsPage() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const params = new URLSearchParams({
        company_id: companyId || '',
        status: statusFilter
      });

      const response = await fetch(`/api/v1/inventory/low-stock.php?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data.alerts || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/inventory/low-stock.php', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: alertId,
          alert_status: newStatus
        })
      });

      if (!response.ok) throw new Error('Failed to update alert');

      await fetchAlerts();
    } catch (error) {
      console.error('Error updating alert:', error);
      alert('Eroare la actualizarea alertei');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON'
    }).format(amount);
  };

  const getAlertSeverityColor = (alert: LowStockAlert) => {
    if (alert.current_stock === 0) return 'border-red-500 bg-red-50';
    if (alert.days_out_of_stock > 7) return 'border-orange-500 bg-orange-50';
    return 'border-yellow-500 bg-yellow-50';
  };

  const getAlertSeverityIcon = (alert: LowStockAlert) => {
    if (alert.current_stock === 0) return <AlertTriangle className="w-6 h-6 text-red-600" />;
    return <TrendingDown className="w-6 h-6 text-yellow-600" />;
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-red-100 text-red-800',
      'acknowledged': 'bg-yellow-100 text-yellow-800',
      'ordered': 'bg-blue-100 text-blue-800',
      'resolved': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'active': 'Activ',
      'acknowledged': 'Confirmat',
      'ordered': 'Comandat',
      'resolved': 'Rezolvat'
    };
    return labels[status] || status;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🔔 Alerte Stoc Scăzut</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitorizați produsele cu stoc scăzut și gestionați comenzile de reaprovizionare
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Alerte</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.total_alerts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Alerte Active</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.active_alerts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Stoc Epuizat</p>
                <p className="text-2xl font-semibold text-gray-900">{summary.out_of_stock_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Valoare Comandă</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summary.suggested_order_value)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtrează:</span>
          <div className="flex space-x-2">
            {['active', 'acknowledged', 'ordered', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Se încarcă alertele...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nicio alertă găsită</h3>
            <p className="text-gray-500">
              {statusFilter === 'active' ? 'Toate produsele au stoc suficient!' : `Nicio alertă cu status: ${getStatusLabel(statusFilter)}`}
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-lg shadow-md border-l-4 ${getAlertSeverityColor(alert)} p-6`}
            >
              <div className="flex items-start justify-between">
                {/* Alert Info */}
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getAlertSeverityIcon(alert)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{alert.product_name}</h3>
                        <p className="text-sm text-gray-500">SKU: {alert.sku} | {alert.warehouse_name}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(alert.alert_status)}`}>
                        {getStatusLabel(alert.alert_status)}
                      </span>
                    </div>

                    {/* Stock Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500">Stoc Curent</p>
                        <p className={`text-xl font-bold ${alert.current_stock === 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {alert.current_stock} {alert.unit_of_measure}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Nivel Recomandare</p>
                        <p className="text-xl font-bold text-blue-600">
                          {alert.reorder_level} {alert.unit_of_measure}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Comandă Sugerată</p>
                        <p className="text-xl font-bold text-green-600">
                          {alert.suggested_order_quantity} {alert.unit_of_measure}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Valoare Comandă</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(alert.suggested_order_quantity * alert.purchase_price)}
                        </p>
                      </div>
                    </div>

                    {/* Warning Messages */}
                    {alert.current_stock === 0 && (
                      <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <X className="w-5 h-5 text-red-600 mr-2" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-900">STOC EPUIZAT</p>
                            {alert.days_out_of_stock > 0 && (
                              <p className="text-sm text-red-700">
                                Lipsă de {alert.days_out_of_stock} zile | Pierdere estimată: {formatCurrency(alert.estimated_lost_revenue)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                {alert.alert_status === 'active' && (
                  <>
                    <button
                      onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                      className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Confirmă
                    </button>
                    <button
                      onClick={() => updateAlertStatus(alert.id, 'ordered')}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Creează Comandă
                    </button>
                  </>
                )}

                {alert.alert_status === 'acknowledged' && (
                  <button
                    onClick={() => updateAlertStatus(alert.id, 'ordered')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Creează Comandă
                  </button>
                )}

                {alert.alert_status === 'ordered' && (
                  <button
                    onClick={() => updateAlertStatus(alert.id, 'resolved')}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Marchează Rezolvat
                  </button>
                )}

                <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Vezi Produs
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
