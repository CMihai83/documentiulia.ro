'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  FileText,
  Calendar,
  Clock,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Eye,
  Send,
  Copy,
  RefreshCw,
  FileSignature,
  Shield,
  DollarSign,
  CalendarClock,
  Bell,
  BellOff,
  Paperclip,
  Tag,
  ExternalLink,
  Search,
  Filter,
  Plus,
  ChevronRight,
  ChevronDown,
  Pen,
  History,
  Archive,
  AlertCircle,
  Info,
  Star,
  StarOff,
  Lock,
  Unlock,
} from 'lucide-react';

// Types
export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated' | 'renewed' | 'cancelled';
export type ContractType = 'client' | 'vendor' | 'employee' | 'partnership' | 'nda' | 'service' | 'rental' | 'other';
export type RenewalType = 'auto' | 'manual' | 'none';

export interface ContractParty {
  id: string;
  name: string;
  type: 'company' | 'individual';
  cui?: string;
  email?: string;
  signed?: boolean;
  signedAt?: string;
  signatureUrl?: string;
}

export interface Contract {
  id: string;
  number: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  parties: ContractParty[];
  startDate: string;
  endDate?: string;
  value?: number;
  currency?: string;
  paymentTerms?: string;
  renewalType: RenewalType;
  renewalNotice?: number; // days before expiry
  autoRenewalPeriod?: string;
  description?: string;
  documentUrl?: string;
  attachments?: number;
  tags?: string[];
  reminders?: boolean;
  confidential?: boolean;
  createdAt: string;
  updatedAt?: string;
  signedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
  history?: Array<{
    action: string;
    date: string;
    user: string;
  }>;
}

export interface ContractCardProps {
  contract: Contract;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onSendForSignature?: () => void;
  onRenew?: () => void;
  onTerminate?: () => void;
  onToggleReminder?: () => void;
  variant?: 'default' | 'compact' | 'detailed' | 'row';
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export interface ContractListProps {
  contracts: Contract[];
  onContractClick?: (contract: Contract) => void;
  variant?: 'grid' | 'list' | 'table';
  showFilters?: boolean;
  className?: string;
}

// Helper functions
const getStatusConfig = (status: ContractStatus) => {
  switch (status) {
    case 'draft':
      return {
        label: 'Ciornă',
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: FileText,
      };
    case 'pending_signature':
      return {
        label: 'Așteaptă semnare',
        color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/30',
        icon: Pen,
      };
    case 'active':
      return {
        label: 'Activ',
        color: 'text-green-600 bg-green-100 dark:bg-green-950/30',
        icon: CheckCircle2,
      };
    case 'expired':
      return {
        label: 'Expirat',
        color: 'text-red-600 bg-red-100 dark:bg-red-950/30',
        icon: AlertTriangle,
      };
    case 'terminated':
      return {
        label: 'Reziliat',
        color: 'text-red-600 bg-red-100 dark:bg-red-950/30',
        icon: XCircle,
      };
    case 'renewed':
      return {
        label: 'Reînnoit',
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/30',
        icon: RefreshCw,
      };
    case 'cancelled':
      return {
        label: 'Anulat',
        color: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
        icon: XCircle,
      };
    default:
      return {
        label: status,
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: FileText,
      };
  }
};

const getTypeConfig = (type: ContractType) => {
  switch (type) {
    case 'client':
      return { label: 'Client', icon: User, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30' };
    case 'vendor':
      return { label: 'Furnizor', icon: Building2, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30' };
    case 'employee':
      return { label: 'Angajat', icon: User, color: 'bg-green-100 text-green-700 dark:bg-green-950/30' };
    case 'partnership':
      return { label: 'Parteneriat', icon: Shield, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30' };
    case 'nda':
      return { label: 'NDA', icon: Lock, color: 'bg-red-100 text-red-700 dark:bg-red-950/30' };
    case 'service':
      return { label: 'Servicii', icon: FileSignature, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30' };
    case 'rental':
      return { label: 'Închiriere', icon: Building2, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30' };
    default:
      return { label: 'Altul', icon: FileText, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800' };
  }
};

const formatCurrency = (amount: number, currency: string = 'RON'): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getDaysUntilExpiry = (endDate: string): number => {
  const end = new Date(endDate);
  const today = new Date();
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getExpiryStatus = (endDate?: string, status?: ContractStatus): { status: 'ok' | 'warning' | 'danger' | 'expired'; message: string } => {
  if (!endDate || status === 'terminated' || status === 'cancelled') {
    return { status: 'ok', message: 'Fără termen' };
  }

  const days = getDaysUntilExpiry(endDate);

  if (days < 0) {
    return { status: 'expired', message: `Expirat acum ${Math.abs(days)} zile` };
  }
  if (days === 0) {
    return { status: 'danger', message: 'Expiră azi' };
  }
  if (days <= 30) {
    return { status: 'warning', message: `Expiră în ${days} zile` };
  }
  if (days <= 90) {
    return { status: 'ok', message: `${days} zile rămase` };
  }
  return { status: 'ok', message: formatDate(endDate) };
};

// Contract Status Badge Component
export function ContractStatusBadge({
  status,
  size = 'default',
  showIcon = true,
  className,
}: {
  status: ContractStatus;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  className?: string;
}) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    default: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {config.label}
    </span>
  );
}

// Contract Type Badge Component
export function ContractTypeBadge({
  type,
  className,
}: {
  type: ContractType;
  className?: string;
}) {
  const config = getTypeConfig(type);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium',
        config.color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

// Expiry Indicator Component
export function ExpiryIndicator({
  endDate,
  status,
  className,
}: {
  endDate?: string;
  status?: ContractStatus;
  className?: string;
}) {
  const expiry = getExpiryStatus(endDate, status);

  const colorClasses = {
    ok: 'text-slate-600 dark:text-slate-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
    expired: 'text-red-600 dark:text-red-400',
  };

  const IconMap = {
    ok: Calendar,
    warning: Clock,
    danger: AlertTriangle,
    expired: AlertCircle,
  };

  const Icon = IconMap[expiry.status];

  return (
    <div className={cn('flex items-center gap-1.5 text-sm', colorClasses[expiry.status], className)}>
      <Icon className="h-4 w-4" />
      <span>{expiry.message}</span>
    </div>
  );
}

// Signature Status Component
export function SignatureStatus({
  parties,
  className,
}: {
  parties: ContractParty[];
  className?: string;
}) {
  const signed = parties.filter((p) => p.signed).length;
  const total = parties.length;
  const allSigned = signed === total;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex -space-x-2">
        {parties.slice(0, 3).map((party, index) => (
          <div
            key={party.id}
            className={cn(
              'w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium',
              party.signed
                ? 'bg-green-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            )}
            title={`${party.name}: ${party.signed ? 'Semnat' : 'Nesemnat'}`}
          >
            {party.signed ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              party.name[0].toUpperCase()
            )}
          </div>
        ))}
        {parties.length > 3 && (
          <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400">
            +{parties.length - 3}
          </div>
        )}
      </div>
      <span className={cn('text-sm', allSigned ? 'text-green-600' : 'text-slate-500')}>
        {signed}/{total} semnături
      </span>
    </div>
  );
}

// Main Contract Card Component
export function ContractCard({
  contract,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onSendForSignature,
  onRenew,
  onTerminate,
  onToggleReminder,
  variant = 'default',
  selected = false,
  onSelect,
  className,
}: ContractCardProps) {
  const [showActions, setShowActions] = useState(false);
  const expiry = getExpiryStatus(contract.endDate, contract.status);

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={onView}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-slate-900 cursor-pointer transition-all',
          selected && 'ring-2 ring-blue-500 border-blue-500',
          'hover:border-slate-300 dark:hover:border-slate-600',
          className
        )}
      >
        <div className={cn('p-2 rounded-lg', getTypeConfig(contract.type).color)}>
          {React.createElement(getTypeConfig(contract.type).icon, { className: 'h-5 w-5' })}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {contract.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {contract.number} • {contract.parties[0]?.name}
          </p>
        </div>
        <div className="text-right">
          <ContractStatusBadge status={contract.status} size="sm" showIcon={false} />
          {contract.endDate && (
            <p
              className={cn(
                'text-xs mt-1',
                expiry.status === 'ok'
                  ? 'text-slate-500'
                  : expiry.status === 'warning'
                  ? 'text-amber-600'
                  : 'text-red-600'
              )}
            >
              {formatDate(contract.endDate)}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  if (variant === 'row') {
    return (
      <motion.tr
        whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
        className={cn(
          'border-b transition-colors cursor-pointer',
          selected && 'bg-blue-50 dark:bg-blue-950/20',
          className
        )}
        onClick={onView}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', getTypeConfig(contract.type).color)}>
              {React.createElement(getTypeConfig(contract.type).icon, { className: 'h-4 w-4' })}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {contract.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {contract.number}
              </p>
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          <ContractTypeBadge type={contract.type} />
        </td>
        <td className="py-3 px-4">
          <div className="flex flex-col">
            {contract.parties.slice(0, 2).map((party) => (
              <span key={party.id} className="text-sm text-slate-600 dark:text-slate-400">
                {party.name}
              </span>
            ))}
            {contract.parties.length > 2 && (
              <span className="text-xs text-slate-400">
                +{contract.parties.length - 2} mai mulți
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
          {formatDate(contract.startDate)}
        </td>
        <td className="py-3 px-4">
          <ExpiryIndicator endDate={contract.endDate} status={contract.status} />
        </td>
        {contract.value !== undefined && (
          <td className="py-3 px-4 text-right">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {formatCurrency(contract.value, contract.currency)}
            </p>
          </td>
        )}
        <td className="py-3 px-4">
          <ContractStatusBadge status={contract.status} size="sm" />
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center justify-end gap-1">
            {contract.confidential && (
              <Lock className="h-4 w-4 text-slate-400" />
            )}
            {contract.reminders && (
              <Bell className="h-4 w-4 text-blue-500" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </td>
      </motion.tr>
    );
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-6 rounded-xl border bg-white dark:bg-slate-900 shadow-sm',
          selected && 'ring-2 ring-blue-500',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className={cn('p-3 rounded-xl', getTypeConfig(contract.type).color)}>
              {React.createElement(getTypeConfig(contract.type).icon, { className: 'h-6 w-6' })}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {contract.title}
                </h2>
                {contract.confidential && (
                  <Lock className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Nr. {contract.number}
              </p>
              <div className="flex items-center gap-2">
                <ContractTypeBadge type={contract.type} />
                <ContractStatusBadge status={contract.status} />
              </div>
            </div>
          </div>
          {contract.value !== undefined && (
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(contract.value, contract.currency)}
              </p>
              {contract.paymentTerms && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {contract.paymentTerms}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Parties */}
        <div className="mb-6">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Părți contractante</p>
          <div className="space-y-2">
            {contract.parties.map((party) => (
              <div
                key={party.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      party.type === 'company'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                    )}
                  >
                    {party.type === 'company' ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      party.name[0]
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {party.name}
                    </p>
                    {party.cui && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        CUI: {party.cui}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {party.signed ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Semnat {party.signedAt && `la ${formatDate(party.signedAt)}`}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Clock className="h-4 w-4" />
                      Așteaptă semnare
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data începerii</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {formatDate(contract.startDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data expirării</p>
            {contract.endDate ? (
              <ExpiryIndicator endDate={contract.endDate} status={contract.status} />
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">Nedeterminată</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Reînnoire</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {contract.renewalType === 'auto'
                ? `Automată (${contract.autoRenewalPeriod})`
                : contract.renewalType === 'manual'
                ? 'Manuală'
                : 'Fără reînnoire'}
            </p>
          </div>
          {contract.renewalNotice && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Notificare</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {contract.renewalNotice} zile înainte
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {contract.description && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Descriere</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {contract.description}
            </p>
          </div>
        )}

        {/* Tags & Attachments */}
        <div className="flex items-center gap-4 mb-6">
          {contract.tags && contract.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-4 w-4 text-slate-400" />
              {contract.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {contract.attachments && contract.attachments > 0 && (
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <Paperclip className="h-4 w-4" />
              <span>{contract.attachments} documente atașate</span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleReminder?.();
            }}
            className={cn(
              'flex items-center gap-1 text-sm px-2 py-1 rounded-lg transition-colors',
              contract.reminders
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {contract.reminders ? (
              <>
                <Bell className="h-4 w-4" />
                <span>Remindere active</span>
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4" />
                <span>Setează remindere</span>
              </>
            )}
          </button>
        </div>

        {/* History */}
        {contract.history && contract.history.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Istoric recent</p>
            <div className="space-y-2">
              {contract.history.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-400">{item.action}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 dark:text-slate-500">{item.user}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400">{formatDate(item.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {onView && (
              <button
                onClick={onView}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Vizualizează</span>
              </button>
            )}
            {onEdit && contract.status === 'draft' && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Editează</span>
              </button>
            )}
            {onDownload && (
              <button
                onClick={onDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Descarcă</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSendForSignature && contract.status === 'draft' && (
              <button
                onClick={onSendForSignature}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>Trimite pentru semnare</span>
              </button>
            )}
            {onRenew && contract.status === 'active' && expiry.status !== 'ok' && (
              <button
                onClick={onRenew}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reînnoiește</span>
              </button>
            )}
            {onTerminate && contract.status === 'active' && (
              <button
                onClick={onTerminate}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                <span>Reziliază</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'p-4 rounded-xl border bg-white dark:bg-slate-900 transition-all cursor-pointer',
        selected && 'ring-2 ring-blue-500 border-blue-500',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600',
        className
      )}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', getTypeConfig(contract.type).color)}>
            {React.createElement(getTypeConfig(contract.type).icon, { className: 'h-5 w-5' })}
          </div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              {contract.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {contract.number}
            </p>
          </div>
        </div>
        <ContractStatusBadge status={contract.status} size="sm" />
      </div>

      <div className="mb-3">
        <SignatureStatus parties={contract.parties} />
      </div>

      <div className="flex items-end justify-between pt-3 border-t">
        <ExpiryIndicator endDate={contract.endDate} status={contract.status} />
        {contract.value !== undefined && (
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(contract.value, contract.currency)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// Contract List Component
export function ContractList({
  contracts,
  onContractClick,
  variant = 'grid',
  showFilters = false,
  className,
}: ContractListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesSearch =
        !searchQuery ||
        contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.parties.some((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  if (variant === 'table') {
    return (
      <div className={cn('overflow-x-auto', className)}>
        {showFilters && (
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută contracte..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Contract</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Tip</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Părți</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Început</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Expirare</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 text-right">Valoare</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                variant="row"
                onView={() => onContractClick?.(contract)}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={className}>
      {showFilters && (
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută contracte..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          variant === 'grid'
            ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        )}
      >
        {filteredContracts.map((contract) => (
          <ContractCard
            key={contract.id}
            contract={contract}
            variant={variant === 'list' ? 'compact' : 'default'}
            onView={() => onContractClick?.(contract)}
          />
        ))}
      </div>
    </div>
  );
}

// Contract Summary Component
export function ContractSummary({
  contracts,
  className,
}: {
  contracts: Contract[];
  className?: string;
}) {
  const summary = useMemo(() => {
    const active = contracts.filter((c) => c.status === 'active').length;
    const expiringSoon = contracts.filter((c) => {
      if (!c.endDate || c.status !== 'active') return false;
      const days = getDaysUntilExpiry(c.endDate);
      return days >= 0 && days <= 30;
    }).length;
    const pendingSignature = contracts.filter((c) => c.status === 'pending_signature').length;
    const totalValue = contracts
      .filter((c) => c.status === 'active' && c.value)
      .reduce((sum, c) => sum + (c.value || 0), 0);

    return { total: contracts.length, active, expiringSoon, pendingSignature, totalValue };
  }, [contracts]);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-5 gap-4', className)}>
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total contracte</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {summary.total}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30">
        <p className="text-sm text-green-600 dark:text-green-400 mb-1">Active</p>
        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
          {summary.active}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30">
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">Expiră curând</p>
        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
          {summary.expiringSoon}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30">
        <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Așteaptă semnare</p>
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
          {summary.pendingSignature}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30">
        <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Valoare totală</p>
        <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
          {formatCurrency(summary.totalValue)}
        </p>
      </div>
    </div>
  );
}

// Empty State Component
export function ContractEmptyState({
  onAddContract,
  className,
}: {
  onAddContract?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl',
        className
      )}
    >
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
        <FileSignature className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
        Niciun contract adăugat
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Creați și gestionați contractele cu clienții și furnizorii
      </p>
      {onAddContract && (
        <button
          onClick={onAddContract}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Adaugă contract</span>
        </button>
      )}
    </motion.div>
  );
}

export default ContractCard;
