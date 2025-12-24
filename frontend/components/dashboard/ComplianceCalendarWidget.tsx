'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  FileText,
  Building2,
  Shield,
} from 'lucide-react';

interface ComplianceDeadline {
  id: string;
  title: string;
  description: string;
  category: 'tax' | 'financial' | 'hr' | 'regulatory' | 'audit' | 'custom';
  authority: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  penalty?: {
    amount: number;
    currency: string;
  };
}

interface ComplianceStats {
  totalDeadlines: number;
  pendingDeadlines: number;
  overdueDeadlines: number;
  completedThisMonth: number;
  upcomingThisWeek: number;
  upcomingThisMonth: number;
  complianceScore: number;
}

interface ComplianceData {
  stats: ComplianceStats;
  upcoming: ComplianceDeadline[];
  overdue: ComplianceDeadline[];
}

const categoryConfig: Record<string, { icon: any; color: string; bg: string }> = {
  tax: { icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
  financial: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  hr: { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  regulatory: { icon: Shield, color: 'text-green-600', bg: 'bg-green-50' },
  audit: { icon: CheckCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  custom: { icon: Calendar, color: 'text-gray-600', bg: 'bg-gray-50' },
};

const priorityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-red-700', bg: 'bg-red-100' },
  high: { color: 'text-orange-700', bg: 'bg-orange-100' },
  medium: { color: 'text-yellow-700', bg: 'bg-yellow-100' },
  low: { color: 'text-green-700', bg: 'bg-green-100' },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
  });
};

const getDaysUntil = (dateStr: string) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const DeadlineItem = ({ deadline }: { deadline: ComplianceDeadline }) => {
  const category = categoryConfig[deadline.category] || categoryConfig.custom;
  const priority = priorityConfig[deadline.priority] || priorityConfig.medium;
  const CategoryIcon = category.icon;
  const daysUntil = getDaysUntil(deadline.dueDate);
  const isOverdue = daysUntil < 0;
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  return (
    <div className={`p-3 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : isUrgent ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1 rounded ${category.bg}`}>
            <CategoryIcon className={`w-3 h-3 ${category.color}`} />
          </div>
          <span className="text-sm font-medium text-gray-900 truncate">
            {deadline.title}
          </span>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded ${priority.bg} ${priority.color}`}>
          {deadline.priority === 'critical' ? 'Critic' : deadline.priority === 'high' ? 'Ridicat' : deadline.priority === 'medium' ? 'Mediu' : 'Scazut'}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{deadline.authority}</span>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span className={isOverdue ? 'text-red-600 font-medium' : isUrgent ? 'text-orange-600' : 'text-gray-600'}>
            {isOverdue ? `Intarziat ${Math.abs(daysUntil)} zile` : daysUntil === 0 ? 'Astazi' : `${daysUntil} zile`}
          </span>
        </div>
      </div>

      {deadline.penalty && isOverdue && (
        <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Penalizare: {deadline.penalty.amount} {deadline.penalty.currency}
        </div>
      )}
    </div>
  );
};

const ComplianceScoreRing = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : score >= 50 ? '#f97316' : '#ef4444';

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r="36"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r="36"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500">Scor</span>
      </div>
    </div>
  );
};

export function ComplianceCalendarWidget() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ComplianceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statsRes, upcomingRes, overdueRes] = await Promise.all([
        api.get<ComplianceStats>('/compliance/calendar/stats'),
        api.get<ComplianceDeadline[]>('/compliance/calendar/upcoming?days=30'),
        api.get<ComplianceDeadline[]>('/compliance/calendar/overdue'),
      ]);

      setData({
        stats: statsRes.data || {
          totalDeadlines: 0,
          pendingDeadlines: 0,
          overdueDeadlines: 0,
          completedThisMonth: 0,
          upcomingThisWeek: 0,
          upcomingThisMonth: 0,
          complianceScore: 100,
        },
        upcoming: upcomingRes.data || [],
        overdue: overdueRes.data || [],
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching compliance data:', err);
      setError('Nu s-au putut incarca datele');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 10 * 60 * 1000); // Refresh every 10 minutes
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-5 bg-gray-200 rounded w-40" />
        </div>
        <div className="h-24 bg-gray-100 rounded-lg mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Calendar Conformitate
          </h3>
          <button
            onClick={() => fetchData(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="text-center py-4 text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  const hasOverdue = data.overdue.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          Calendar Conformitate
        </h3>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          title="Actualizeaza"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Compliance Score & Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="col-span-1">
          <ComplianceScoreRing score={data.stats.complianceScore} />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-700">{data.stats.overdueDeadlines}</p>
            <p className="text-xs text-red-600">Intarziate</p>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <Clock className="w-4 h-4 text-yellow-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-700">{data.stats.upcomingThisWeek}</p>
            <p className="text-xs text-yellow-600">Sapt. aceasta</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <Calendar className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-700">{data.stats.pendingDeadlines}</p>
            <p className="text-xs text-blue-600">In asteptare</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">{data.stats.completedThisMonth}</p>
            <p className="text-xs text-green-600">Luna aceasta</p>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {hasOverdue && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">
              {data.overdue.length} termene depasite
            </span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {data.overdue.slice(0, 3).map((deadline) => (
              <DeadlineItem key={deadline.id} deadline={deadline} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Deadlines */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Urmatoarele termene
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {data.upcoming.length > 0 ? (
            data.upcoming.slice(0, 5).map((deadline) => (
              <DeadlineItem key={deadline.id} deadline={deadline} />
            ))
          ) : (
            <p className="text-center text-gray-500 text-sm py-4">
              Nu exista termene in urmatoarele 30 zile
            </p>
          )}
        </div>
      </div>

      {/* View All Link */}
      <a
        href="/dashboard/compliance"
        className="mt-3 flex items-center justify-center gap-1 text-sm text-primary-600 hover:text-primary-800"
      >
        Vezi calendarul complet
        <ChevronRight className="w-4 h-4" />
      </a>
    </div>
  );
}

export default ComplianceCalendarWidget;
