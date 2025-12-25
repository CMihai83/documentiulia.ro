'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle, Clock, Filter, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { FraudAlertDetail } from './FraudAlertDetail';

export type FraudAlertStatus = 'PENDING' | 'INVESTIGATING' | 'FALSE_POSITIVE' | 'CONFIRMED' | 'RESOLVED';
export type FraudAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FraudAlert {
  id: string;
  type: string;
  severity: FraudAlertSeverity;
  status: FraudAlertStatus;
  title: string;
  description: string;
  riskScore: number;
  entityType?: string;
  entityId?: string;
  metadata: Record<string, any>;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

interface FraudAlertsListProps {
  alerts: FraudAlert[];
  onUpdateStatus?: (alertId: string, status: FraudAlertStatus, resolution?: string) => Promise<void>;
}

export function FraudAlertsList({ alerts, onUpdateStatus }: FraudAlertsListProps) {
  const t = useTranslations('fraudDetection');
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<FraudAlertSeverity | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<FraudAlertStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSeverity = filterSeverity === 'ALL' || alert.severity === filterSeverity;
      const matchesStatus = filterStatus === 'ALL' || alert.status === filterStatus;
      const matchesSearch = !searchQuery ||
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSeverity && matchesStatus && matchesSearch;
    });
  }, [alerts, filterSeverity, filterStatus, searchQuery]);

  const getSeverityColor = (severity: FraudAlertSeverity) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-blue-600 bg-blue-100';
    }
  };

  const getStatusIcon = (status: FraudAlertStatus) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'INVESTIGATING': return <AlertTriangle className="w-4 h-4" />;
      case 'RESOLVED': return <CheckCircle className="w-4 h-4" />;
      case 'FALSE_POSITIVE': return <CheckCircle className="w-4 h-4" />;
      case 'CONFIRMED': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: FraudAlertStatus) => {
    switch (status) {
      case 'PENDING': return 'text-gray-600 bg-gray-100';
      case 'INVESTIGATING': return 'text-yellow-600 bg-yellow-100';
      case 'RESOLVED': return 'text-green-600 bg-green-100';
      case 'FALSE_POSITIVE': return 'text-blue-600 bg-blue-100';
      case 'CONFIRMED': return 'text-red-600 bg-red-100';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Filters and Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchAlerts')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as FraudAlertSeverity | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="ALL">{t('allSeverities')}</option>
              <option value="CRITICAL">{t('severity.critical')}</option>
              <option value="HIGH">{t('severity.high')}</option>
              <option value="MEDIUM">{t('severity.medium')}</option>
              <option value="LOW">{t('severity.low')}</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FraudAlertStatus | 'ALL')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          >
            <option value="ALL">{t('allStatuses')}</option>
            <option value="PENDING">{t('status.pending')}</option>
            <option value="INVESTIGATING">{t('status.investigating')}</option>
            <option value="RESOLVED">{t('status.resolved')}</option>
            <option value="FALSE_POSITIVE">{t('status.falsePositive')}</option>
            <option value="CONFIRMED">{t('status.confirmed')}</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-gray-200">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t('noAlerts')}</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Alert Icon and Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {t(`severity.${alert.severity.toLowerCase()}`)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(alert.status)}`}>
                      {getStatusIcon(alert.status)}
                      {t(`status.${alert.status.toLowerCase()}`)}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                      {t(`alertTypes.${alert.type.toLowerCase()}`)}
                    </span>
                  </div>

                  <h4 className="font-semibold text-gray-900 mb-1">
                    {alert.title}
                  </h4>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {alert.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {t('riskScore')}: <strong className="text-gray-700">{alert.riskScore.toFixed(1)}</strong>
                    </span>
                    <span>
                      {new Date(alert.detectedAt).toLocaleDateString()} {new Date(alert.detectedAt).toLocaleTimeString()}
                    </span>
                    {alert.entityType && (
                      <span>
                        {alert.entityType}: {alert.entityId?.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>

                {/* Risk Score Badge */}
                <div className="flex-shrink-0">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    alert.riskScore >= 85 ? 'bg-red-100' :
                    alert.riskScore >= 70 ? 'bg-orange-100' :
                    alert.riskScore >= 50 ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <div className="text-center">
                      <div className={`text-xl font-bold ${
                        alert.riskScore >= 85 ? 'text-red-600' :
                        alert.riskScore >= 70 ? 'text-orange-600' :
                        alert.riskScore >= 50 ? 'text-yellow-600' : 'text-blue-600'
                      }`}>
                        {alert.riskScore.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-500">{t('risk')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <FraudAlertDetail
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onUpdateStatus={onUpdateStatus}
        />
      )}
    </div>
  );
}
