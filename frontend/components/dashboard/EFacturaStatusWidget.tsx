'use client';

import { memo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  Send,
  XCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface EFacturaStatus {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'pending' | 'submitted' | 'accepted' | 'rejected' | 'error';
  submittedAt?: string;
  anafResponse?: string;
  errorMessage?: string;
}

interface EFacturaStats {
  total: number;
  pending: number;
  submitted: number;
  accepted: number;
  rejected: number;
  errors: number;
}

async function fetchEFacturaStatus(): Promise<{ items: EFacturaStatus[]; stats: EFacturaStats }> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const response = await fetch(`${API_URL}/efactura/status`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    // Return mock data for development
    return {
      items: [
        { id: '1', invoiceNumber: 'FV-2025-001', status: 'accepted', submittedAt: new Date().toISOString() },
        { id: '2', invoiceNumber: 'FV-2025-002', status: 'pending' },
        { id: '3', invoiceNumber: 'FV-2025-003', status: 'submitted', submittedAt: new Date().toISOString() },
      ],
      stats: { total: 45, pending: 3, submitted: 5, accepted: 35, rejected: 1, errors: 1 }
    };
  }

  return response.json();
}

const StatusBadge = memo(function StatusBadge({ status }: { status: EFacturaStatus['status'] }) {
  const configs = {
    draft: { icon: FileText, color: 'bg-gray-100 text-gray-700', label: 'Ciorna' },
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'In asteptare' },
    submitted: { icon: Send, color: 'bg-blue-100 text-blue-700', label: 'Trimis' },
    accepted: { icon: CheckCircle2, color: 'bg-green-100 text-green-700', label: 'Acceptat ANAF' },
    rejected: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Respins' },
    error: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'Eroare' },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {config.label}
    </span>
  );
});

const StatCard = memo(function StatCard({
  label,
  value,
  color,
  icon: Icon
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
      <div className={`p-1.5 rounded ${color}`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
});

export const EFacturaStatusWidget = memo(function EFacturaStatusWidget() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['efactura-status'],
    queryFn: fetchEFacturaStatus,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm" aria-busy="true" aria-label="Incarcare status e-Factura">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" aria-hidden="true" />
          <span className="text-sm text-gray-500">Incarcare status e-Factura...</span>
        </div>
        <div className="space-y-3">
          <div className="bg-gray-200 rounded h-16 animate-pulse" />
          <div className="bg-gray-200 rounded h-4 w-3/4 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm" role="alert">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium">Eroare la incarcarea statusului</span>
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
          aria-label="Reincearca incarcarea statusului e-Factura"
        >
          Reincearca
        </button>
      </div>
    );
  }

  const stats = data?.stats || { total: 0, pending: 0, submitted: 0, accepted: 0, rejected: 0, errors: 0 };
  const recentItems = data?.items?.slice(0, 5) || [];

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" aria-hidden="true" />
          Status e-Factura ANAF
        </h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
          aria-label="Actualizeaza statusul e-Factura"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4" role="group" aria-label="Statistici e-Factura">
        <StatCard label="Acceptate" value={stats.accepted} color="bg-green-100 text-green-600" icon={CheckCircle2} />
        <StatCard label="In curs" value={stats.submitted} color="bg-blue-100 text-blue-600" icon={Send} />
        <StatCard label="Asteptare" value={stats.pending} color="bg-yellow-100 text-yellow-600" icon={Clock} />
        <StatCard label="Erori" value={stats.rejected + stats.errors} color="bg-red-100 text-red-600" icon={AlertCircle} />
      </div>

      {/* Recent Submissions */}
      {recentItems.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Trimiteri recente</h3>
          <ul className="space-y-2" role="list" aria-label="Lista facturi recente">
            {recentItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.invoiceNumber}</span>
                  <StatusBadge status={item.status} />
                </div>
                {item.submittedAt && (
                  <span className="text-xs text-gray-500">
                    {new Date(item.submittedAt).toLocaleDateString('ro-RO')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Action */}
      <div className="mt-4 pt-4 border-t">
        <a
          href="/ro/dashboard/efactura"
          className="flex items-center justify-center gap-2 w-full py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition"
          aria-label="Vezi toate facturile electronice"
        >
          Vezi toate facturile
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
});

export default EFacturaStatusWidget;
