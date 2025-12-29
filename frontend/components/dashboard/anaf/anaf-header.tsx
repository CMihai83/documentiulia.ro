'use client';

/**
 * ANAF Header Component
 * Displays SPV status, quick stats, and key metrics at the top of the ANAF dashboard
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Mail,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { spvService } from '@/lib/anaf/services';
import { mockSpvDashboard } from '@/lib/anaf/mocks';
import type { SpvDashboard } from '@/lib/anaf/types';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

interface QuickStat {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: 'default' | 'warning' | 'success' | 'error';
  description?: string;
}

export function AnafHeader() {
  const [dashboard, setDashboard] = useState<SpvDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setDashboard(mockSpvDashboard);
      } else {
        const data = await spvService.getDashboard();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch ANAF dashboard:', error);
      if (USE_MOCK) {
        setDashboard(mockSpvDashboard);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || !dashboard) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 w-24 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = dashboard.connection.connected;
  const nextDeadline = dashboard.deadlines[0];
  const stats = dashboard.stats;

  const quickStats: QuickStat[] = [
    {
      icon: <FileText className="h-5 w-5" />,
      label: 'Transmisii luna aceasta',
      value: stats.submissionsThisMonth,
      description: `din ${stats.submissionsTotal} total`,
      variant: 'default',
    },
    {
      icon: <AlertCircle className="h-5 w-5" />,
      label: 'Acțiuni în așteptare',
      value: stats.pendingActions,
      variant: stats.pendingActions > 0 ? 'warning' : 'success',
      description: stats.pendingActions > 0 ? 'necesită atenție' : 'totul la zi',
    },
    {
      icon: <Mail className="h-5 w-5" />,
      label: 'Mesaje necitite',
      value: stats.unreadMessages,
      variant: stats.unreadMessages > 0 ? 'warning' : 'default',
      description: stats.unreadMessages > 0 ? 'mesaje noi' : 'fără mesaje noi',
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: nextDeadline ? 'Următorul termen' : 'Termene',
      value: nextDeadline ? `${nextDeadline.daysRemaining} zile` : '-',
      variant: nextDeadline?.isOverdue
        ? 'error'
        : nextDeadline?.daysRemaining <= 5
        ? 'warning'
        : 'default',
      description: nextDeadline?.currentPeriod || 'Niciun termen activ',
    },
  ];

  const getVariantColor = (variant?: 'default' | 'warning' | 'success' | 'error') => {
    switch (variant) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          {/* Left: Title & Status */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Status ANAF
            </h1>
            <div className="flex items-center gap-3">
              <Badge
                variant={isConnected ? 'default' : 'secondary'}
                className="flex items-center gap-1.5"
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    SPV Conectat
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" />
                    SPV Deconectat
                  </>
                )}
              </Badge>
              {isConnected && dashboard.connection.companyName && (
                <span className="text-sm text-muted-foreground">
                  {dashboard.connection.companyName}
                  {dashboard.connection.cui && (
                    <span className="ml-1">
                      (CUI: {dashboard.connection.cui})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Right: Quick Stats */}
          <div className="flex gap-3">
            {quickStats.map((stat, index) => (
              <div
                key={index}
                className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 min-w-[120px] transition-all hover:shadow-md ${getVariantColor(stat.variant)}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {stat.icon}
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <span className="text-xs font-medium text-center">{stat.label}</span>
                {stat.description && (
                  <span className="text-xs opacity-75 mt-0.5 text-center">
                    {stat.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Alerts or Actions */}
        {(stats.pendingActions > 0 || (nextDeadline && nextDeadline.daysRemaining <= 7)) && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {stats.pendingActions > 0 && (
                <div className="flex items-center gap-1.5 text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    <strong>{stats.pendingActions}</strong> acțiuni necesită atenție
                  </span>
                </div>
              )}
              {nextDeadline && nextDeadline.daysRemaining <= 7 && (
                <div className={`flex items-center gap-1.5 ${nextDeadline.isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                  <Clock className="h-4 w-4" />
                  <span>
                    {nextDeadline.isOverdue ? (
                      <>Termen depășit cu <strong>{Math.abs(nextDeadline.daysRemaining)}</strong> zile</>
                    ) : (
                      <>Termen în <strong>{nextDeadline.daysRemaining}</strong> zile</>
                    )}
                  </span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboard}
              className="flex items-center gap-1.5"
            >
              <TrendingUp className="h-4 w-4" />
              Reîmprospătare
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
