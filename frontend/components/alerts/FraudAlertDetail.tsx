'use client';

import { useTranslations } from 'next-intl';
import { X, AlertTriangle, CheckCircle, FileText, Calendar, Hash } from 'lucide-react';
import { useState } from 'react';
import type { FraudAlert, FraudAlertStatus } from './FraudAlertsList';

interface FraudAlertDetailProps {
  alert: FraudAlert;
  onClose: () => void;
  onUpdateStatus?: (alertId: string, status: FraudAlertStatus, resolution?: string) => Promise<void>;
}

export function FraudAlertDetail({ alert, onClose, onUpdateStatus }: FraudAlertDetailProps) {
  const t = useTranslations('fraudDetection');
  const [resolution, setResolution] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdateStatus = async (newStatus: FraudAlertStatus) => {
    if (!onUpdateStatus) return;

    setUpdating(true);
    try {
      await onUpdateStatus(alert.id, newStatus, resolution || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to update alert status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(alert.severity)}`}>
                  {t(`severity.${alert.severity.toLowerCase()}`)}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-600">
                  {t(`alertTypes.${alert.type.toLowerCase()}`)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{alert.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t('close')}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Risk Score */}
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('riskScore')}</h3>
                <p className="text-sm text-gray-600">{t('riskScoreDescription')}</p>
              </div>
              <div className="text-center">
                <div className={`text-5xl font-bold ${
                  alert.riskScore >= 85 ? 'text-red-600' :
                  alert.riskScore >= 70 ? 'text-orange-600' :
                  alert.riskScore >= 50 ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  {alert.riskScore.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500 mt-1">{t('outOf100')}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">{t('description')}</h3>
            <p className="text-gray-600">{alert.description}</p>
          </div>

          {/* Metadata */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">{t('details')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{t('detectedAt')}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(alert.detectedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {alert.entityType && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t('relatedEntity')}</div>
                    <div className="text-sm text-gray-600">
                      {alert.entityType}: {alert.entityId}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Hash className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{t('alertId')}</div>
                  <div className="text-sm text-gray-600 font-mono">{alert.id.slice(0, 16)}...</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{t('status')}</div>
                  <div className="text-sm text-gray-600">{t(`status.${alert.status.toLowerCase()}`)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Metadata */}
          {Object.keys(alert.metadata).length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">{t('additionalInfo')}</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="space-y-2">
                  {Object.entries(alert.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <dt className="font-medium text-gray-700">{key}:</dt>
                      <dd className="text-gray-600">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {/* Resolution */}
          {alert.status === 'RESOLVED' && alert.resolution && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">{t('resolution')}</h3>
                  <p className="text-sm text-green-800">{alert.resolution}</p>
                  {alert.resolvedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      {t('resolvedAt')}: {new Date(alert.resolvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Section */}
          {alert.status === 'PENDING' && onUpdateStatus && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">{t('takeAction')}</h3>

              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder={t('addNotes')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4 text-sm"
                rows={3}
              />

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleUpdateStatus('INVESTIGATING')}
                  disabled={updating}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-300 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {t('markInvestigating')}
                </button>

                <button
                  onClick={() => handleUpdateStatus('FALSE_POSITIVE')}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {t('markFalsePositive')}
                </button>

                <button
                  onClick={() => handleUpdateStatus('CONFIRMED')}
                  disabled={updating}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {t('confirmFraud')}
                </button>

                <button
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  disabled={updating || !resolution}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {t('resolve')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
