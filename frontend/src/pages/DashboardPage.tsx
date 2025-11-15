import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { dashboardAPI, forecastingAPI, insightsAPI } from '../services/api';
import type { DashboardStats, CashFlowForecast, Insight } from '../types';
import DashboardLayout from '../components/layout/DashboardLayout';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [forecast, setForecast] = useState<CashFlowForecast[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, forecastData, insightsData] = await Promise.all([
        dashboardAPI.getStats(),
        forecastingAPI.getCashFlow(),
        insightsAPI.list(),
      ]);
      setStats(statsData);
      setForecast(forecastData);
      setInsights(insightsData.filter((i) => !i.dismissed).slice(0, 3));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats?.total_revenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      trend: '+12.5%',
      positive: true,
    },
    {
      title: 'Net Profit',
      value: `$${stats?.net_profit?.toLocaleString() || 0}`,
      icon: TrendingUp,
      trend: '+8.2%',
      positive: true,
    },
    {
      title: 'Outstanding Invoices',
      value: stats?.outstanding_invoices || 0,
      icon: FileText,
      trend: `${stats?.overdue_invoices || 0} overdue`,
      positive: false,
    },
    {
      title: 'Cash Balance',
      value: `$${stats?.cash_balance?.toLocaleString() || 0}`,
      icon: TrendingUp,
      trend: '+5.8%',
      positive: true,
    },
  ];

  const expenseData = [
    { name: 'Salaries', value: 45000, color: '#3b82f6' },
    { name: 'Marketing', value: 12000, color: '#8b5cf6' },
    { name: 'Operations', value: 8000, color: '#ec4899' },
    { name: 'Other', value: 5000, color: '#6b7280' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your business.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="card">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <div className="flex items-center gap-1">
                  {stat.positive ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cash Flow Forecast */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Forecast (12 Months)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="projected_income" stroke="#3b82f6" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="projected_expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="net_cash_flow" stroke="#10b981" strokeWidth={2} name="Net" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Breakdown */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h2>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Insights & Recommendations</h2>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      insight.priority === 'critical' ? 'bg-red-100' :
                      insight.priority === 'high' ? 'bg-orange-100' :
                      insight.priority === 'medium' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      <AlertCircle className={`w-5 h-5 ${
                        insight.priority === 'critical' ? 'text-red-600' :
                        insight.priority === 'high' ? 'text-orange-600' :
                        insight.priority === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{insight.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                      <p className="text-sm text-primary-600 mt-2">{insight.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
