'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  TrendingUp,
  Target,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Languages,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface QualityMetrics {
  period: { days: number; startDate: string; endDate: string };
  summary: {
    totalDocuments: number;
    manuallyEdited: number;
    manualCorrectionRate: number;
    avgConfidence: number;
    autoAcceptRate: number;
  };
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
    veryLow: number;
  };
  dailyTrend: Array<{ date: string; count: number; avgConfidence: number }>;
  languageBreakdown: Record<string, number>;
}

interface TemplateMetric {
  templateId: string;
  templateName: string;
  documentType: string;
  language: string;
  isSystem: boolean;
  usageCount: number;
  recentExtractions: number;
  metrics: {
    avgConfidence: number;
    correctionRate: number;
    accuracyScore: number;
  };
}

interface FieldMetric {
  field: string;
  displayName: string;
  totalExtractions: number;
  corrections: number;
  correctionRate: number;
  avgConfidence: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'poor';
}

interface FieldMetrics {
  totalAnalyzed: number;
  fields: FieldMetric[];
  recommendations: string[];
}

export default function OCRMetricsPage() {
  const t = useTranslations('dashboard');
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [templateMetrics, setTemplateMetrics] = useState<TemplateMetric[]>([]);
  const [fieldMetrics, setFieldMetrics] = useState<FieldMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [metricsRes, templatesRes, fieldsRes] = await Promise.all([
        api.get<QualityMetrics>(`/ocr/metrics?days=${days}`),
        api.get<TemplateMetric[]>('/ocr/metrics/templates'),
        api.get<FieldMetrics>('/ocr/metrics/fields'),
      ]);
      if (metricsRes.data) setMetrics(metricsRes.data);
      setTemplateMetrics(templatesRes.data || []);
      if (fieldsRes.data) setFieldMetrics(fieldsRes.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [days]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'needs_attention': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excelent';
      case 'good': return 'Bun';
      case 'needs_attention': return 'Necesita atentie';
      case 'poor': return 'Slab';
      default: return status;
    }
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'ro': return 'Romana';
      case 'de': return 'Germana';
      case 'en': return 'Engleza';
      default: return lang;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metrici OCR</h1>
          <p className="text-gray-500 mt-1">Monitorizare performanta extractie documente</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value={7}>Ultimele 7 zile</option>
            <option value={30}>Ultimele 30 zile</option>
            <option value={90}>Ultimele 90 zile</option>
          </select>
          <button
            onClick={loadMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizeaza
          </button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Documente procesate</p>
                  <p className="text-2xl font-bold">{metrics.summary.totalDocuments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Incredere medie</p>
                  <p className="text-2xl font-bold">{metrics.summary.avgConfidence}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rata auto-acceptare</p>
                  <p className="text-2xl font-bold">{metrics.summary.autoAcceptRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${metrics.summary.manualCorrectionRate > 30 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                  <AlertTriangle className={`w-6 h-6 ${metrics.summary.manualCorrectionRate > 30 ? 'text-red-600' : 'text-yellow-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rata corectii manuale</p>
                  <p className="text-2xl font-bold">{metrics.summary.manualCorrectionRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Confidence Distribution & Daily Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confidence Distribution */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                Distributie incredere
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Inalta (90%+)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${(metrics.confidenceDistribution.high / Math.max(metrics.summary.totalDocuments, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{metrics.confidenceDistribution.high}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Medie (70-90%)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(metrics.confidenceDistribution.medium / Math.max(metrics.summary.totalDocuments, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{metrics.confidenceDistribution.medium}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Scazuta (50-70%)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${(metrics.confidenceDistribution.low / Math.max(metrics.summary.totalDocuments, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{metrics.confidenceDistribution.low}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Foarte scazuta (&lt;50%)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(metrics.confidenceDistribution.veryLow / Math.max(metrics.summary.totalDocuments, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{metrics.confidenceDistribution.veryLow}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Language Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Languages className="w-5 h-5 text-gray-600" />
                Distributie pe limba
              </h2>
              <div className="space-y-3">
                {Object.entries(metrics.languageBreakdown).map(([lang, count]) => (
                  <div key={lang} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{getLanguageLabel(lang)}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${(count / Math.max(metrics.summary.totalDocuments, 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
                {Object.keys(metrics.languageBreakdown).length === 0 && (
                  <p className="text-sm text-gray-500">Nu exista date</p>
                )}
              </div>
            </div>
          </div>

          {/* Daily Trend */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Trend zilnic (ultimele 7 zile)
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {metrics.dailyTrend.map((day) => (
                <div key={day.date} className="text-center">
                  <div className="text-xs text-gray-500 mb-2">
                    {new Date(day.date).toLocaleDateString('ro-RO', { weekday: 'short' })}
                  </div>
                  <div
                    className="mx-auto w-10 rounded-lg bg-primary-100 flex items-end justify-center"
                    style={{ height: `${Math.max(day.count * 10, 20)}px` }}
                  >
                    <span className="text-xs font-medium text-primary-700 pb-1">{day.count}</span>
                  </div>
                  <div className={`text-xs mt-1 ${day.avgConfidence >= 80 ? 'text-green-600' : day.avgConfidence >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {day.avgConfidence > 0 ? `${day.avgConfidence}%` : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Field Metrics */}
      {fieldMetrics && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Acuratete pe campuri</h2>

          {/* Recommendations */}
          {fieldMetrics.recommendations.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Recomandari</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                {fieldMetrics.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-500">-</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Camp</th>
                  <th className="text-center py-3 px-2">Extractii</th>
                  <th className="text-center py-3 px-2">Corectii</th>
                  <th className="text-center py-3 px-2">Rata corectie</th>
                  <th className="text-center py-3 px-2">Incredere medie</th>
                  <th className="text-center py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {fieldMetrics.fields.map((field) => (
                  <tr key={field.field} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{field.displayName}</td>
                    <td className="text-center py-3 px-2">{field.totalExtractions}</td>
                    <td className="text-center py-3 px-2">{field.corrections}</td>
                    <td className="text-center py-3 px-2">
                      <span className={`${field.correctionRate > 30 ? 'text-red-600' : field.correctionRate > 15 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {field.correctionRate}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">{field.avgConfidence}%</td>
                    <td className="text-center py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(field.status)}`}>
                        {getStatusLabel(field.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Template Metrics */}
      {templateMetrics.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Performanta template-uri</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Template</th>
                  <th className="text-center py-3 px-2">Tip</th>
                  <th className="text-center py-3 px-2">Limba</th>
                  <th className="text-center py-3 px-2">Utilizari</th>
                  <th className="text-center py-3 px-2">Incredere</th>
                  <th className="text-center py-3 px-2">Rata corectie</th>
                  <th className="text-center py-3 px-2">Scor acuratete</th>
                </tr>
              </thead>
              <tbody>
                {templateMetrics.map((template) => (
                  <tr key={template.templateId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.templateName}</span>
                        {template.isSystem && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">System</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">{template.documentType}</td>
                    <td className="text-center py-3 px-2">{getLanguageLabel(template.language)}</td>
                    <td className="text-center py-3 px-2">{template.usageCount}</td>
                    <td className="text-center py-3 px-2">{template.metrics.avgConfidence}%</td>
                    <td className="text-center py-3 px-2">
                      <span className={template.metrics.correctionRate > 30 ? 'text-red-600' : 'text-green-600'}>
                        {template.metrics.correctionRate}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="flex items-center justify-center gap-1">
                        {template.metrics.accuracyScore >= 80 ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : template.metrics.accuracyScore >= 50 ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-medium">{template.metrics.accuracyScore}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
