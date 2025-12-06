import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Plus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axios from 'axios';

interface DashboardMetrics {
  total_revenue: number;
  total_expenses: number;
  profit_margin: number;
  active_projects: number;
  total_hours: number;
  utilization_rate: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_revenue: 0,
    total_expenses: 0,
    profit_margin: 0,
    active_projects: 0,
    total_hours: 0,
    utilization_rate: 0,
  });
  const [, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('last_30_days');

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await axios.get('/api/v1/analytics/metrics.php', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-ID': companyId,
        },
      });

      if (response.data.success) {
        setMetrics(response.data.data.metrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Business intelligence and insights</p>
          </div>
          <div className="flex space-x-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="this_year">This Year</option>
            </select>
            <button
              onClick={() => (window.location.href = '/analytics/dashboards')}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5" />
              <span>New Dashboard</span>
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">
                  ${metrics.total_revenue.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Profit Margin</p>
                <p className="text-3xl font-bold mt-2">{metrics.profit_margin.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Active Projects</p>
                <p className="text-3xl font-bold mt-2">{metrics.active_projects}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.total_hours.toFixed(1)}h
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.utilization_rate.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${metrics.total_expenses.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => (window.location.href = '/analytics/kpis')}
            className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200 hover:border-indigo-500 transition-colors text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">KPI Tracking</h3>
                <p className="text-sm text-gray-600">Monitor key metrics</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => (window.location.href = '/analytics/reports')}
            className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200 hover:border-indigo-500 transition-colors text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Custom Reports</h3>
                <p className="text-sm text-gray-600">Build your own reports</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => (window.location.href = '/analytics/widgets')}
            className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200 hover:border-indigo-500 transition-colors text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Widgets</h3>
                <p className="text-sm text-gray-600">Customize your dashboard</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;
