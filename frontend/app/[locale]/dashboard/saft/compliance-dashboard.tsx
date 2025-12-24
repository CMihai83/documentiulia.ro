'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  Bell,
  ChevronRight,
  Shield,
  Info,
  Loader2,
} from 'lucide-react';

/**
 * UI-001: Compliance Dashboard UI Enhancement
 *
 * Enhanced compliance dashboard with:
 * - SAF-T D406 submission status widget
 * - Compliance calendar with deadlines
 * - Progress indicators for monthly submissions
 * - Alerts and recommendations
 * - VAT summary
 */

interface ComplianceStatus {
  isCompliant: boolean;
  submissionDeadline: string;
  daysUntilDeadline: number;
  periodStatus: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'overdue';
  gracePeriodActive: boolean;
  gracePeriodEnds?: string;
  recommendations: string[];
}

interface ComplianceDashboard {
  currentPeriod: {
    period: string;
    compliance: ComplianceStatus;
  };
  previousPeriod: {
    period: string;
    compliance: ComplianceStatus;
    checklist: {
      ready: boolean;
      checklist: { item: string; status: 'ok' | 'warning' | 'error'; detail: string }[];
    };
  };
  submissionStats: {
    draft: number;
    submitted: number;
    accepted: number;
    rejected: number;
  };
  recentReports: any[];
  deadlines: {
    currentPeriod: string;
    nextDeadline: string;
    daysUntilDeadline: number;
    isOverdue: boolean;
    gracePeriod: {
      active: boolean;
      start: string;
      end: string;
      description: string;
    };
    requirements: {
      format: string;
      maxFileSize: string;
      encoding: string;
      submission: string;
    };
    timeline: { date: string; event: string; status: string }[];
  };
  alerts: { type: 'info' | 'warning' | 'error'; message: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function ComplianceDashboard({ userId }: { userId: string }) {
  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [userId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/saft-d406/dashboard/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      } else {
        setError('Nu s-au putut încărca datele de conformitate');
      }
    } catch (err) {
      setError('Eroare de conexiune');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-500">Se încarcă dashboard-ul de conformitate...</span>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <XCircle className="h-5 w-5" />
          <span>{error || 'Eroare necunoscută'}</span>
        </div>
      </div>
    );
  }

  const { currentPeriod, previousPeriod, submissionStats, deadlines, alerts } = dashboard;

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 rounded-lg ${
                alert.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : alert.type === 'warning'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-blue-50 border border-blue-200'
              }`}
            >
              {alert.type === 'error' ? (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              ) : alert.type === 'warning' ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              )}
              <span
                className={`text-sm ${
                  alert.type === 'error'
                    ? 'text-red-700'
                    : alert.type === 'warning'
                      ? 'text-yellow-700'
                      : 'text-blue-700'
                }`}
              >
                {alert.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Deadline Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Următorul termen</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {deadlines.daysUntilDeadline >= 0
                  ? `${deadlines.daysUntilDeadline} zile`
                  : 'Depășit!'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(deadlines.nextDeadline).toLocaleDateString('ro-RO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div
              className={`p-3 rounded-full ${
                deadlines.isOverdue
                  ? 'bg-red-100'
                  : deadlines.daysUntilDeadline <= 5
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
              }`}
            >
              <Clock
                className={`h-6 w-6 ${
                  deadlines.isOverdue
                    ? 'text-red-600'
                    : deadlines.daysUntilDeadline <= 5
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Submissions Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Depuneri acceptate</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{submissionStats.accepted}</p>
              <p className="text-xs text-gray-400 mt-1">
                din {submissionStats.draft + submissionStats.submitted + submissionStats.accepted + submissionStats.rejected} total
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">În așteptare</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {submissionStats.draft + submissionStats.submitted}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {submissionStats.draft} draft, {submissionStats.submitted} trimise
              </p>
            </div>
            <div className="p-3 rounded-full bg-yellow-100">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Grace Period */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Perioada grație</p>
              <p className="text-2xl font-bold mt-1">
                {deadlines.gracePeriod.active ? (
                  <span className="text-blue-600">Activă</span>
                ) : (
                  <span className="text-gray-400">Inactivă</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {deadlines.gracePeriod.active
                  ? `Până la ${new Date(deadlines.gracePeriod.end).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' })}`
                  : 'Pilot sept 2025'}
              </p>
            </div>
            <div className={`p-3 rounded-full ${deadlines.gracePeriod.active ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Shield className={`h-6 w-6 ${deadlines.gracePeriod.active ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pre-submission Checklist */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Checklist pre-depunere - {formatPeriod(previousPeriod.period)}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                previousPeriod.checklist.ready
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {previousPeriod.checklist.ready ? 'Gata pentru depunere' : 'Necesită atenție'}
            </span>
          </div>

          <div className="space-y-3">
            {previousPeriod.checklist.checklist.map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  item.status === 'ok'
                    ? 'bg-green-50'
                    : item.status === 'warning'
                      ? 'bg-yellow-50'
                      : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.status === 'ok' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : item.status === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium text-gray-800">{item.item}</span>
                </div>
                <span className="text-sm text-gray-500">{item.detail}</span>
              </div>
            ))}
          </div>

          {!previousPeriod.checklist.ready && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Acțiuni necesare</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Corectați erorile marcate cu roșu pentru a putea depune SAF-T D406.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendar obligații</h3>

          <div className="space-y-4">
            {deadlines.timeline.map((event, index) => (
              <div key={index} className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${
                    event.status === 'active'
                      ? 'bg-green-500'
                      : event.status === 'upcoming'
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{event.event}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.date).toLocaleDateString('ro-RO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Cerințe format</h4>
            <div className="space-y-1 text-xs text-gray-500">
              <p>Format: {deadlines.requirements.format}</p>
              <p>Mărime max: {deadlines.requirements.maxFileSize}</p>
              <p>Encoding: {deadlines.requirements.encoding}</p>
              <p>Depunere: {deadlines.requirements.submission}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progres conformitate 2025</h3>

        <div className="grid grid-cols-12 gap-2">
          {Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const period = `2025-${String(month).padStart(2, '0')}`;
            const isCurrentMonth = currentPeriod.period === period;
            const isPast = month <= new Date().getMonth() + 1;

            // Mock status for visualization
            let status: 'accepted' | 'submitted' | 'pending' | 'future' = 'future';
            if (isPast) {
              if (month < new Date().getMonth()) {
                status = 'accepted';
              } else if (month === new Date().getMonth()) {
                status = 'submitted';
              } else {
                status = 'pending';
              }
            }

            return (
              <div
                key={period}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${
                  status === 'accepted'
                    ? 'bg-green-100 text-green-700'
                    : status === 'submitted'
                      ? 'bg-blue-100 text-blue-700'
                      : status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-400'
                } ${isCurrentMonth ? 'ring-2 ring-blue-500' : ''}`}
              >
                <span className="font-medium">
                  {new Date(2025, i, 1).toLocaleDateString('ro-RO', { month: 'short' })}
                </span>
                {status === 'accepted' && <CheckCircle2 className="h-3 w-3 mt-0.5" />}
                {status === 'submitted' && <Clock className="h-3 w-3 mt-0.5" />}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100" />
            <span>Acceptat</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-100" />
            <span>Trimis</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-100" />
            <span>În așteptare</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-100" />
            <span>Viitor</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {currentPeriod.compliance.recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Recomandări</h3>
          </div>

          <ul className="space-y-2">
            {currentPeriod.compliance.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
}
