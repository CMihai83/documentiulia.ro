import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { usePersonaAnalytics } from '../../hooks/usePersonaAnalytics';

export interface PersonaAnalyticsDashboardProps {
  className?: string;
}

/**
 * Admin Dashboard for Persona Analytics
 * Displays persona adoption stats, feature usage, and export options
 */
const PersonaAnalyticsDashboard: React.FC<PersonaAnalyticsDashboardProps> = ({ className = '' }) => {
  const { language } = useI18n();
  const isRo = language === 'ro';
  const { dashboard, featureUsage, loading, error, refreshDashboard, getFeatureUsage, exportData } = usePersonaAnalytics();
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [exportType, setExportType] = useState<string>('persona_adoption');

  // Labels
  const labels = {
    title: isRo ? 'Analiză Personae' : 'Persona Analytics',
    distribution: isRo ? 'Distribuție Personae' : 'Persona Distribution',
    recentActivity: isRo ? 'Activitate Recentă (7 zile)' : 'Recent Activity (7 days)',
    topFeatures: isRo ? 'Funcționalități Populare (30 zile)' : 'Top Features (30 days)',
    activeUsers: isRo ? 'Utilizatori Activi' : 'Active Users',
    companies: isRo ? 'Companii' : 'Companies',
    selections: isRo ? 'Selecții' : 'Selections',
    users: isRo ? 'Utilizatori' : 'Users',
    usage: isRo ? 'Utilizare' : 'Usage',
    export: isRo ? 'Export' : 'Export',
    exportCSV: isRo ? 'Export CSV' : 'Export CSV',
    exportJSON: isRo ? 'Export JSON' : 'Export JSON',
    refresh: isRo ? 'Reîmprospătare' : 'Refresh',
    loading: isRo ? 'Se încarcă...' : 'Loading...',
    noData: isRo ? 'Fără date' : 'No data available',
    featureUsage: isRo ? 'Utilizare Funcționalități' : 'Feature Usage',
    filterByPersona: isRo ? 'Filtrare după Persona' : 'Filter by Persona',
    all: isRo ? 'Toate' : 'All',
    exportTypes: {
      persona_adoption: isRo ? 'Adopție Personae' : 'Persona Adoption',
      feature_usage: isRo ? 'Utilizare Funcționalități' : 'Feature Usage',
      unused_features: isRo ? 'Funcționalități Neutilizate' : 'Unused Features',
      daily_analytics: isRo ? 'Analiză Zilnică' : 'Daily Analytics'
    }
  };

  // Load feature usage when persona filter changes
  useEffect(() => {
    getFeatureUsage(selectedPersona || undefined);
  }, [selectedPersona, getFeatureUsage]);

  const handleExport = (format: 'json' | 'csv') => {
    const filters: Record<string, string> = {};
    if (selectedPersona) {
      filters.persona_id = selectedPersona;
    }
    exportData(exportType, format, filters);
  };

  if (loading && !dashboard) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
        <button
          onClick={refreshDashboard}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {labels.refresh}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Active Users Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">{labels.activeUsers}</div>
          <div className="text-3xl font-bold text-blue-600">
            {dashboard?.active_users_7d || 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">7 {isRo ? 'zile' : 'days'}</div>
        </div>

        {/* Persona Count Cards */}
        {dashboard?.persona_distribution.slice(0, 3).map((persona) => (
          <div key={persona.persona_id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{persona.icon}</span>
              <span className="text-sm font-medium text-gray-500">{persona.persona_name}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {persona.company_count}
            </div>
            <div className="text-xs text-gray-400 mt-1">{labels.companies}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Persona Distribution */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{labels.distribution}</h2>
          </div>
          <div className="p-6">
            {dashboard?.persona_distribution.length ? (
              <div className="space-y-4">
                {dashboard.persona_distribution.map((persona) => {
                  const total = dashboard.persona_distribution.reduce((sum, p) => sum + p.company_count, 0);
                  const percentage = total > 0 ? (persona.company_count / total) * 100 : 0;
                  return (
                    <div key={persona.persona_id}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span>{persona.icon}</span>
                          <span className="font-medium">{persona.persona_name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {persona.company_count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center">{labels.noData}</p>
            )}
          </div>
        </div>

        {/* Top Features */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{labels.topFeatures}</h2>
          </div>
          <div className="p-6">
            {dashboard?.top_features.length ? (
              <div className="space-y-3">
                {dashboard.top_features.map((feature, index) => (
                  <div
                    key={feature.feature_key}
                    className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                      <span className="font-medium">{feature.feature_key}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{feature.usage_count}</div>
                      <div className="text-xs text-gray-400">{feature.unique_users} {labels.users}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">{labels.noData}</p>
            )}
          </div>
        </div>
      </div>

      {/* Feature Usage Detail */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">{labels.featureUsage}</h2>
          <select
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{labels.all}</option>
            {dashboard?.persona_distribution.map((persona) => (
              <option key={persona.persona_id} value={persona.persona_id}>
                {persona.icon} {persona.persona_name}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Persona</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{labels.usage}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{labels.users}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{labels.companies}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {featureUsage.length ? (
                featureUsage.map((item, index) => (
                  <tr key={`${item.persona_id}-${item.feature_key}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{item.feature_key}</td>
                    <td className="px-6 py-4 text-gray-500">{item.persona_id}</td>
                    <td className="px-6 py-4 text-right">{item.total_usage}</td>
                    <td className="px-6 py-4 text-right">{item.unique_users}</td>
                    <td className="px-6 py-4 text-right">{item.unique_companies}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {labels.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{labels.export}</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(labels.exportTypes).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {labels.exportCSV}
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {labels.exportJSON}
            </button>
          </div>
        </div>
      </div>

      {/* Generated timestamp */}
      {dashboard?.generated_at && (
        <div className="mt-4 text-right text-sm text-gray-400">
          {isRo ? 'Generat la' : 'Generated at'}: {new Date(dashboard.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default PersonaAnalyticsDashboard;
