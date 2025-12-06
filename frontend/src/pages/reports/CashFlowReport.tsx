import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface CashFlowData {
  period_start: string;
  period_end: string;
  operating_activities: {
    cash_in: {
      invoices_paid: number;
      other_income: number;
      total: number;
    };
    cash_out: {
      expenses_paid: number;
      bills_paid: number;
      total: number;
    };
    net_operating_cash_flow: number;
  };
  net_cash_flow: number;
  opening_balance: number;
  closing_balance: number;
}

const CashFlowReport: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchCashFlow();
  }, [dateRange]);

  const fetchCashFlow = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(
        `https://documentiulia.ro/api/v1/reports/cash-flow.php?start_date=${dateRange.start}&end_date=${dateRange.end}`,
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
      setError('Failed to load cash flow report');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Situația fluxului de numerar</h1>
              <p className="text-purple-100">
                Analiză detaliată a intrărilor și ieșirilor de numerar
              </p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="px-6 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold"
            >
              ← Înapoi la rapoarte
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data început
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchCashFlow}
                className="w-full px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Actualizează
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 font-medium">Intrări totale</span>
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(data.operating_activities.cash_in.total)}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-red-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 font-medium">Ieșiri totale</span>
                  <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-7.414V13a1 1 0 11-2 0v-2.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 10.586z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(data.operating_activities.cash_out.total)}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 font-medium">Cash flow net</span>
                  <svg className="w-8 h-8 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className={`text-3xl font-bold ${data.net_cash_flow >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {formatCurrency(data.net_cash_flow)}
                </p>
              </div>
            </div>

            {/* Cash Flow Statement */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              <div className="bg-purple-600 text-white px-6 py-4">
                <h3 className="text-xl font-bold">Activități operaționale</h3>
              </div>
              <div className="p-6">
                {/* Cash In */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"/>
                    </svg>
                    Intrări de numerar
                  </h4>
                  <div className="space-y-3 pl-8">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-gray-700">Facturi încasate</span>
                      <span className="text-lg font-semibold text-green-600">
                        {formatCurrency(data.operating_activities.cash_in.invoices_paid)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-gray-700">Alte venituri</span>
                      <span className="text-lg font-semibold text-green-600">
                        {formatCurrency(data.operating_activities.cash_in.other_income)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 bg-green-50 px-4 py-3 rounded-lg">
                      <span className="text-gray-900 font-semibold">Total intrări</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(data.operating_activities.cash_in.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cash Out */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-7.414V13a1 1 0 11-2 0v-2.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 10.586z" clipRule="evenodd"/>
                    </svg>
                    Ieșiri de numerar
                  </h4>
                  <div className="space-y-3 pl-8">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-gray-700">Cheltuieli plătite</span>
                      <span className="text-lg font-semibold text-red-600">
                        {formatCurrency(data.operating_activities.cash_out.expenses_paid)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-gray-700">Facturi furnizori plătite</span>
                      <span className="text-lg font-semibold text-red-600">
                        {formatCurrency(data.operating_activities.cash_out.bills_paid)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 bg-red-50 px-4 py-3 rounded-lg">
                      <span className="text-gray-900 font-semibold">Total ieșiri</span>
                      <span className="text-xl font-bold text-red-600">
                        {formatCurrency(data.operating_activities.cash_out.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Operating Cash Flow */}
                <div className="border-t-2 border-gray-300 pt-6">
                  <div className="flex justify-between items-center bg-purple-50 px-6 py-4 rounded-lg">
                    <span className="text-xl font-bold text-gray-900">Cash flow net din operațiuni</span>
                    <span className={`text-3xl font-bold ${data.operating_activities.net_operating_cash_flow >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      {formatCurrency(data.operating_activities.net_operating_cash_flow)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Balance Summary */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4">
                <h3 className="text-xl font-bold">Rezumat sold numerar</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <span className="text-gray-700 font-medium">Sold inițial</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(data.opening_balance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <span className="text-gray-700 font-medium">Cash flow perioada</span>
                    <span className={`text-2xl font-bold ${data.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(data.net_cash_flow)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4 bg-blue-50 px-6 py-4 rounded-lg">
                    <span className="text-xl font-bold text-gray-900">Sold final</span>
                    <span className={`text-3xl font-bold ${data.closing_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(data.closing_balance)}
                    </span>
                  </div>
                </div>

                {/* Health Indicator */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start">
                    <svg className={`w-6 h-6 ${data.net_cash_flow >= 0 ? 'text-green-500' : 'text-red-500'} mr-3 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                      {data.net_cash_flow >= 0 ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      ) : (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                      )}
                    </svg>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {data.net_cash_flow >= 0 ? 'Sănătate financiară bună' : 'Atenție necesară'}
                      </h4>
                      <p className="text-gray-700">
                        {data.net_cash_flow >= 0
                          ? `Cash flow-ul pozitiv de ${formatCurrency(data.net_cash_flow)} indică o sănătate financiară bună. Continuați să monitorizați intrările și ieșirile pentru a menține această tendință.`
                          : `Cash flow-ul negativ de ${formatCurrency(Math.abs(data.net_cash_flow))} necesită atenție imediată. Revizuiți cheltuielile și accelerați încasările pentru a îmbunătăți situația.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CashFlowReport;
