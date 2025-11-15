import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle, X, RefreshCw, DollarSign } from 'lucide-react';
import { insightsAPI, forecastingAPI } from '../services/api';
import type { Insight, CashFlowForecast } from '../types';
import DashboardLayout from '../components/layout/DashboardLayout';

const InsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [forecast, setForecast] = useState<CashFlowForecast[]>([]);
  const [runway, setRunway] = useState<{ months: number; burn_rate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [insightsData, forecastData, runwayData] = await Promise.all([
        insightsAPI.list(),
        forecastingAPI.getCashFlow(),
        forecastingAPI.getRunway().catch(() => null),
      ]);
      setInsights(insightsData.filter((i) => !i.dismissed));
      setForecast(forecastData);
      setRunway(runwayData);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newInsights = await insightsAPI.generate();
      setInsights(newInsights.filter((i) => !i.dismissed));
    } catch (error) {
      console.error('Failed to generate insights:', error);
      alert('Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await insightsAPI.dismiss(id);
      setInsights(insights.filter((i) => i.id !== id));
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-6 h-6 text-orange-600" />;
      case 'medium':
        return <Lightbulb className="w-6 h-6 text-yellow-600" />;
      default:
        return <Lightbulb className="w-6 h-6 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const filteredInsights = insights.filter(
    (insight) => filterPriority === 'all' || insight.priority === filterPriority
  );

  const priorityCounts = {
    critical: insights.filter((i) => i.priority === 'critical').length,
    high: insights.filter((i) => i.priority === 'high').length,
    medium: insights.filter((i) => i.priority === 'medium').length,
    low: insights.filter((i) => i.priority === 'low').length,
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Insights & Recommendations</h1>
            <p className="text-gray-600 mt-1">Powered by AI to help you make better business decisions</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate New Insights'}
          </button>
        </div>

        {/* Priority Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Critical', value: priorityCounts.critical, color: 'text-red-600', bg: 'bg-red-100' },
            { label: 'High', value: priorityCounts.high, color: 'text-orange-600', bg: 'bg-orange-100' },
            { label: 'Medium', value: priorityCounts.medium, color: 'text-yellow-600', bg: 'bg-yellow-100' },
            { label: 'Low', value: priorityCounts.low, color: 'text-blue-600', bg: 'bg-blue-100' },
          ].map((stat, index) => (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label} Priority</p>
                  <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                </div>
                <div className={`p-3 ${stat.bg} rounded-lg`}>
                  <AlertCircle className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cash Runway Card */}
        {runway && (
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Cash Runway</h3>
                <p className="text-3xl font-bold">{runway.months} months</p>
                <p className="text-blue-100 mt-1">
                  Monthly burn rate: ${runway.burn_rate.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-16 h-16 text-blue-200" />
            </div>
          </div>
        )}

        {/* Cash Flow Forecast Chart */}
        {forecast.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">12-Month Cash Flow Forecast</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="ending_balance" stroke="#3b82f6" strokeWidth={3} name="Balance" />
                <Line type="monotone" dataKey="projected_income" stroke="#10b981" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="projected_expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filter */}
        <div className="card">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by priority:</span>
            <div className="flex gap-2">
              {['all', 'critical', 'high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => setFilterPriority(priority)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterPriority === priority
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {filteredInsights.length === 0 ? (
            <div className="card text-center py-12">
              <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No insights available</h3>
              <p className="text-gray-600 mb-4">
                Click "Generate New Insights" to analyze your financial data
              </p>
              <button onClick={handleGenerate} className="btn-primary">
                <RefreshCw className="w-5 h-5 inline mr-2" />
                Generate Insights
              </button>
            </div>
          ) : (
            filteredInsights.map((insight) => (
              <div key={insight.id} className={`card border-2 ${getPriorityColor(insight.priority)}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-sm">
                    {getPriorityIcon(insight.priority)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                        <span className="text-xs font-medium text-gray-500">
                          {new Date(insight.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDismiss(insight.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title="Dismiss"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-gray-700 mb-3">{insight.description}</p>

                    <div className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Impact</p>
                          <p className="text-sm text-gray-600">{insight.impact}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-primary-200">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Recommendation</p>
                          <p className="text-sm text-gray-700">{insight.recommendation}</p>
                          {insight.action_url && (
                            <a
                              href={insight.action_url}
                              className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-2 inline-block"
                            >
                              Take Action →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InsightsPage;
