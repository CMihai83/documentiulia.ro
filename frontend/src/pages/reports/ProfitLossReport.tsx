import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ExpenseCategory {
  category: string;
  total_amount: number;
  expense_count: number;
}

interface ProfitLossData {
  revenue: {
    total_revenue: number;
    invoice_count: number;
  };
  expenses: {
    total_expenses: number;
    expense_count: number;
    by_category: ExpenseCategory[];
  };
  net_income: number;
  profit_margin: number;
  period_start: string;
  period_end: string;
}

const ProfitLossReport: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchProfitLoss();
  }, [dateRange]);

  const fetchProfitLoss = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(
        `https://documentiulia.ro/api/v1/reports/profit-loss.php?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load profit & loss report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const exportToPDF = () => {
    // TODO: Implement PDF export using jsPDF
    alert('Funcționalitatea de export PDF va fi implementată în curând');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Raport Profit & Loss</h1>
              <p className="text-green-100">
                Situația veniturilor și cheltuielilor pentru perioada selectată
              </p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="px-6 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors font-semibold"
            >
              ← Înapoi la rapoarte
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data început
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data sfârșit
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchProfitLoss}
                className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Actualizează
              </button>
            </div>
            <div className="flex items-end">
              <button
                onClick={exportToPDF}
                className="w-full px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Period Display */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
              <p className="text-lg text-gray-600">
                Perioada: <span className="font-semibold text-gray-900">{formatDate(data.period_start)}</span> - <span className="font-semibold text-gray-900">{formatDate(data.period_end)}</span>
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-500">
                <p className="text-sm text-gray-600 font-medium mb-2">Venituri totale</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(data.revenue.total_revenue)}</p>
                <p className="text-xs text-gray-500 mt-2">{data.revenue.invoice_count} facturi</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-red-500">
                <p className="text-sm text-gray-600 font-medium mb-2">Cheltuieli totale</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(data.expenses.total_expenses)}</p>
                <p className="text-xs text-gray-500 mt-2">{data.expenses.expense_count} cheltuieli</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
                <p className="text-sm text-gray-600 font-medium mb-2">Venit net</p>
                <p className={`text-3xl font-bold ${data.net_income >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(data.net_income)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {data.net_income >= 0 ? 'Profit' : 'Pierdere'}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-purple-500">
                <p className="text-sm text-gray-600 font-medium mb-2">Marjă de profit</p>
                <p className={`text-3xl font-bold ${data.profit_margin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {data.profit_margin.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {data.profit_margin >= 20 ? 'Excelent' : data.profit_margin >= 10 ? 'Bun' : data.profit_margin >= 0 ? 'Modest' : 'Negativ'}
                </p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Breakdown */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-green-600 text-white px-6 py-4">
                  <h3 className="text-xl font-bold">Venituri detaliate</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                      <span className="text-gray-700 font-medium">Facturi plătite</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(data.revenue.total_revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Număr facturi</span>
                      <span className="text-lg font-semibold text-gray-900">{data.revenue.invoice_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Valoare medie factură</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {data.revenue.invoice_count > 0
                          ? formatCurrency(data.revenue.total_revenue / data.revenue.invoice_count)
                          : formatCurrency(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expenses Breakdown */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-red-600 text-white px-6 py-4">
                  <h3 className="text-xl font-bold">Cheltuieli pe categorii</h3>
                </div>
                <div className="p-6">
                  {data.expenses.by_category.length > 0 ? (
                    <div className="space-y-3">
                      {data.expenses.by_category.map((category, index) => (
                        <div key={index} className="flex justify-between items-center pb-3 border-b border-gray-200 last:border-0">
                          <div>
                            <p className="text-gray-900 font-medium capitalize">{category.category}</p>
                            <p className="text-xs text-gray-500">{category.expense_count} cheltuieli</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">{formatCurrency(category.total_amount)}</p>
                            <p className="text-xs text-gray-500">
                              {((category.total_amount / data.expenses.total_expenses) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="text-gray-900 font-bold">TOTAL</span>
                        <span className="text-xl font-bold text-red-600">{formatCurrency(data.expenses.total_expenses)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <p>Nicio cheltuială înregistrată în această perioadă</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Analysis */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Analiză de performanță</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Status profitabilitate</p>
                  <div className="flex items-center">
                    {data.net_income >= 0 ? (
                      <>
                        <svg className="w-6 h-6 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-lg font-semibold text-green-700">Profitabil</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-lg font-semibold text-red-700">Neprofitabil</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Eficiență operațională</p>
                  <div className="flex items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      {data.expenses.total_expenses > 0
                        ? ((data.expenses.total_expenses / data.revenue.total_revenue) * 100).toFixed(1)
                        : '0.0'}% din venituri
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Recomandare</p>
                  <p className="text-sm font-medium text-gray-900">
                    {data.profit_margin >= 20
                      ? 'Continuați strategia actuală'
                      : data.profit_margin >= 10
                      ? 'Optimizați cheltuielile operaționale'
                      : data.profit_margin >= 0
                      ? 'Reduceți cheltuielile sau creșteți prețurile'
                      : 'Reviziți urgent modelul de business'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfitLossReport;
