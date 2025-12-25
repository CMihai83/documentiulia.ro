'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, X, CheckCircle, Info, XCircle } from 'lucide-react';
import { useState } from 'react';

export type FraudAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FraudAlert {
  id: string;
  type: string;
  severity: FraudAlertSeverity;
  title: string;
  description: string;
  riskScore: number;
  detectedAt: Date;
}

interface FraudAlertBannerProps {
  alert: FraudAlert;
  onDismiss?: (id: string) => void;
  onView?: (id: string) => void;
}

export function FraudAlertBanner({ alert, onDismiss, onView }: FraudAlertBannerProps) {
  const t = useTranslations('fraudDetection');
  const [dismissed, setDismissed] = useState(false);

  const getSeverityConfig = (severity: FraudAlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: XCircle,
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          textColor: 'text-red-800',
          buttonBg: 'bg-red-600 hover:bg-red-700',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50 border-orange-200',
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
          titleColor: 'text-orange-900',
          textColor: 'text-orange-800',
          buttonBg: 'bg-orange-600 hover:bg-orange-700',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: Info,
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
          textColor: 'text-yellow-800',
          buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: CheckCircle,
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          textColor: 'text-blue-800',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.(alert.id);
  };

  const handleView = () => {
    onView?.(alert.id);
  };

  if (dismissed) return null;

  return (
    <div className={`border-l-4 p-4 mb-4 rounded-r-lg ${config.bg} animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${config.iconColor}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-semibold ${config.titleColor} text-sm sm:text-base`}>
              {alert.title}
            </h3>
            <button
              onClick={handleDismiss}
              className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
              aria-label={t('dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className={`text-sm ${config.textColor} mb-3`}>
            {alert.description}
          </p>

          <div className="flex items-center gap-4 text-xs">
            <span className={config.textColor}>
              {t('riskScore')}: <strong>{alert.riskScore.toFixed(1)}</strong>
            </span>
            <span className={`text-gray-500`}>
              {new Date(alert.detectedAt).toLocaleString()}
            </span>
          </div>
        </div>

        {onView && (
          <button
            onClick={handleView}
            className={`${config.buttonBg} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0`}
          >
            {t('viewDetails')}
          </button>
        )}
      </div>
    </div>
  );
}
