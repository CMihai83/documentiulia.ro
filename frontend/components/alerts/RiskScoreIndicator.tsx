'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RiskScoreIndicatorProps {
  score: number;
  previousScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  showLabel?: boolean;
}

export function RiskScoreIndicator({
  score,
  previousScore,
  size = 'md',
  showTrend = true,
  showLabel = true,
}: RiskScoreIndicatorProps) {
  const t = useTranslations('fraudDetection');

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-12 h-12',
          text: 'text-lg',
          label: 'text-xs',
        };
      case 'lg':
        return {
          container: 'w-24 h-24',
          text: 'text-4xl',
          label: 'text-base',
        };
      case 'md':
      default:
        return {
          container: 'w-16 h-16',
          text: 'text-2xl',
          label: 'text-sm',
        };
    }
  };

  const getColorClasses = (riskScore: number) => {
    if (riskScore >= 85) {
      return {
        bg: 'bg-red-100',
        text: 'text-red-600',
        border: 'border-red-300',
        ring: 'ring-red-200',
      };
    } else if (riskScore >= 70) {
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-600',
        border: 'border-orange-300',
        ring: 'ring-orange-200',
      };
    } else if (riskScore >= 50) {
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-600',
        border: 'border-yellow-300',
        ring: 'ring-yellow-200',
      };
    } else if (riskScore >= 30) {
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        border: 'border-blue-300',
        ring: 'ring-blue-200',
      };
    } else {
      return {
        bg: 'bg-green-100',
        text: 'text-green-600',
        border: 'border-green-300',
        ring: 'ring-green-200',
      };
    }
  };

  const getRiskLevel = (riskScore: number): string => {
    if (riskScore >= 85) return t('riskLevel.critical');
    if (riskScore >= 70) return t('riskLevel.high');
    if (riskScore >= 50) return t('riskLevel.medium');
    if (riskScore >= 30) return t('riskLevel.low');
    return t('riskLevel.minimal');
  };

  const getTrend = () => {
    if (!previousScore) return null;

    const difference = score - previousScore;
    if (Math.abs(difference) < 1) {
      return { icon: Minus, color: 'text-gray-500', text: t('unchanged') };
    } else if (difference > 0) {
      return { icon: TrendingUp, color: 'text-red-500', text: `+${difference.toFixed(1)}` };
    } else {
      return { icon: TrendingDown, color: 'text-green-500', text: difference.toFixed(1) };
    }
  };

  const sizeClasses = getSizeClasses();
  const colorClasses = getColorClasses(score);
  const trend = getTrend();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Main Circle */}
        <div
          className={`${sizeClasses.container} ${colorClasses.bg} ${colorClasses.border} border-2 rounded-full flex items-center justify-center shadow-sm`}
        >
          <span className={`${sizeClasses.text} ${colorClasses.text} font-bold`}>
            {score.toFixed(0)}
          </span>
        </div>

        {/* Pulse Animation for Critical */}
        {score >= 85 && (
          <div
            className={`absolute inset-0 ${colorClasses.bg} rounded-full animate-ping opacity-75`}
            style={{ animationDuration: '2s' }}
          />
        )}

        {/* Trend Indicator */}
        {showTrend && trend && (
          <div className={`absolute -top-1 -right-1 ${colorClasses.bg} rounded-full p-1 border-2 border-white shadow-sm`}>
            <trend.icon className={`w-3 h-3 ${trend.color}`} />
          </div>
        )}
      </div>

      {/* Labels */}
      {showLabel && (
        <div className="text-center">
          <div className={`${sizeClasses.label} font-medium ${colorClasses.text}`}>
            {getRiskLevel(score)}
          </div>
          {trend && showTrend && (
            <div className={`text-xs ${trend.color}`}>
              {trend.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RiskScoreProgressProps {
  score: number;
  label?: string;
}

export function RiskScoreProgress({ score, label }: RiskScoreProgressProps) {
  const t = useTranslations('fraudDetection');

  const getColorClass = (riskScore: number) => {
    if (riskScore >= 85) return 'bg-red-500';
    if (riskScore >= 70) return 'bg-orange-500';
    if (riskScore >= 50) return 'bg-yellow-500';
    if (riskScore >= 30) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-gray-600">{label}</span>
          <span className="font-semibold text-gray-900">{score.toFixed(1)}</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${getColorClass(score)} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}
