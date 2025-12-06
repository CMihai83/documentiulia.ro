import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface CategoryComparison {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_percent: number;
  performance: 'on_track' | 'under' | 'over';
}

interface BudgetVsActualData {
  period: string;
  year: number;
  month: number | null;
  revenue_budgeted: number;
  revenue_actual: number;
  revenue_variance: number;
  revenue_variance_percent: number;
  revenue_performance: 'on_track' | 'under' | 'over';
  expense_categories: CategoryComparison[];
  total_expenses_budgeted: number;
  total_expenses_actual: number;
  total_expenses_variance: number;
  total_expenses_variance_percent: number;
  net_income_budgeted: number;
  net_income_actual: number;
  net_income_variance: number;
}

const BudgetVsActualReport: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<BudgetVsActualData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);

  useEffect(() => {
    fetchBudgetComparison();
  }, [year, month]);

  const fetchBudgetComparison = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        navigate('/login');
        return;
      }

      const params = new URLSearchParams({ year: year.toString() });
      if (month !== null) {
        params.append('month', month.toString());
      }

      const response = await fetch(
        `https://documentiulia.ro/api/v1/reports/budget-vs-actual.php?${params.toString()}`,
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
      setError('Failed to load budget comparison');
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

  const getPerformanceBadge = (performance: string) => {
    const badges: { [key: string]: { bg: string; text: string; label: string; icon: string } } = {
      on_track: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Pe țintă',
        icon: '✓',
      },
      under: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Sub țintă',
        icon: '↓',
      },
      over: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Peste buget',
        icon: '↑',
      },
    };

    const badge = badges[performance] || badges.on_track;

    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} text-xs font-semibold rounded-full`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const getVarianceColor = (variance: number, isRevenue: boolean = false): string => {
    if (isRevenue) {
      return variance >= 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return variance <= 0 ? 'text-green-600' : 'text-red-600';
    }
  };

  const months = [
    { value: null, label: 'Tot anul' },
    { value: 1, label: 'Ianuarie' },
    { value: 2, label: 'Februarie' },
    { value: 3, label: 'Martie' },
    { value: 4, label: 'Aprilie' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Iunie' },
    { value: 7, label: 'Iulie' },
    { value: 8, label: 'August' },
    { value: 9, label: 'Septembrie' },
    { value: 10, label: 'Octombrie' },
    { value: 11, label: 'Noiembrie' },
    { value: 12, label: 'Decembrie' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Buget vs Realizat</h1>
              <p className="text-blue-100">
                Comparație între bugetul planificat și performanța efectivă
              </p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
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
                Anul
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Luna
              </label>
              <select
                value={month === null ? '' : month}
                onChange={(e) => setMonth(e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {months.map((m) => (
                  <option key={m.value === null ? 'all' : m.value} value={m.value === null ? '' : m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchBudgetComparison}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
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
                Perioadă: <span className="font-semibold text-gray-900">{data.period}</span>
              </p>
            </div>

            {/* Revenue Comparison */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold">Venituri</h3>
                {getPerformanceBadge(data.revenue_performance)}
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bugetat</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenue_budgeted)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Realizat</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.revenue_actual)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Varianță</p>
                    <p className={`text-2xl font-bold ${getVarianceColor(data.revenue_variance, true)}`}>
                      {data.revenue_variance >= 0 ? '+' : ''}{formatCurrency(data.revenue_variance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Varianță %</p>
                    <p className={`text-2xl font-bold ${getVarianceColor(data.revenue_variance, true)}`}>
                      {data.revenue_variance_percent >= 0 ? '+' : ''}{data.revenue_variance_percent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progres față de buget</span>
                    <span>{((data.revenue_actual / data.revenue_budgeted) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${
                        data.revenue_actual >= data.revenue_budgeted
                          ? 'bg-green-500'
                          : data.revenue_actual >= data.revenue_budgeted * 0.8
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (data.revenue_actual / data.revenue_budgeted) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses by Category */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              <div className="bg-red-600 text-white px-6 py-4">
                <h3 className="text-xl font-bold">Cheltuieli pe categorii</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categorie
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bugetat
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Realizat
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Varianță
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Varianță %
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.expense_categories.map((category, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 capitalize">{category.category}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-900">{formatCurrency(category.budgeted)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(category.actual)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-semibold ${getVarianceColor(category.variance)}`}>
                            {category.variance >= 0 ? '+' : ''}{formatCurrency(category.variance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-semibold ${getVarianceColor(category.variance)}`}>
                            {category.variance >= 0 ? '+' : ''}{category.variance_percent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getPerformanceBadge(category.performance)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">TOTAL CHELTUIELI</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(data.total_expenses_budgeted)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(data.total_expenses_actual)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-bold ${getVarianceColor(data.total_expenses_variance)}`}>
                          {data.total_expenses_variance >= 0 ? '+' : ''}{formatCurrency(data.total_expenses_variance)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-bold ${getVarianceColor(data.total_expenses_variance)}`}>
                          {data.total_expenses_variance >= 0 ? '+' : ''}{data.total_expenses_variance_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Income Summary */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-purple-600 text-white px-6 py-4">
                <h3 className="text-xl font-bold">Venit net</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">Venit net bugetat</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.net_income_budgeted)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">Venit net realizat</p>
                    <p className={`text-3xl font-bold ${data.net_income_actual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(data.net_income_actual)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">Varianță venit net</p>
                    <p className={`text-3xl font-bold ${getVarianceColor(data.net_income_variance, true)}`}>
                      {data.net_income_variance >= 0 ? '+' : ''}{formatCurrency(data.net_income_variance)}
                    </p>
                  </div>
                </div>

                {/* Performance Analysis */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div>
                      <h4 className="text-lg font-semibold text-blue-900 mb-2">Analiză de performanță</h4>
                      <p className="text-blue-800">
                        {data.net_income_variance >= 0
                          ? `Excelent! Venitul net a depășit bugetul cu ${formatCurrency(Math.abs(data.net_income_variance))}. Continuați strategia actuală și monitorizați performanța.`
                          : `Atenție! Venitul net este sub buget cu ${formatCurrency(Math.abs(data.net_income_variance))}. Revizuiți cheltuielile și căutați oportunități de creștere a veniturilor.`}
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

export default BudgetVsActualReport;
