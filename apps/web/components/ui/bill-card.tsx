'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  FileText,
  Calendar,
  Building2,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Download,
  Printer,
  Mail,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Receipt,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Filter,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  CircleDollarSign,
  Timer,
  AlertCircle,
  Info,
  Star,
  StarOff,
  Paperclip,
  Tag,
} from 'lucide-react';

// Types
export type BillStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'disputed';
export type BillCategory = 'utilities' | 'rent' | 'supplies' | 'services' | 'equipment' | 'marketing' | 'travel' | 'insurance' | 'taxes' | 'salaries' | 'other';
export type PaymentMethod = 'bank_transfer' | 'card' | 'cash' | 'check' | 'direct_debit';

export interface Bill {
  id: string;
  number: string;
  vendor: {
    id: string;
    name: string;
    cui?: string;
    logo?: string;
  };
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: BillStatus;
  category: BillCategory;
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  description?: string;
  attachments?: number;
  tags?: string[];
  recurring?: boolean;
  deductible?: boolean;
  deductiblePercent?: number;
  vatAmount?: number;
  vatRate?: number;
  notes?: string;
}

export interface BillCardProps {
  bill: Bill;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPay?: () => void;
  onApprove?: () => void;
  onDownload?: () => void;
  variant?: 'default' | 'compact' | 'detailed' | 'row';
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export interface BillListProps {
  bills: Bill[];
  onBillClick?: (bill: Bill) => void;
  onBillPay?: (bill: Bill) => void;
  variant?: 'cards' | 'rows' | 'compact';
  showFilters?: boolean;
  className?: string;
}

export interface BillSummaryProps {
  bills: Bill[];
  className?: string;
}

// Helper functions
const getStatusConfig = (status: BillStatus) => {
  switch (status) {
    case 'draft':
      return {
        label: 'Ciornă',
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: FileText,
      };
    case 'pending':
      return {
        label: 'În așteptare',
        color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/30',
        icon: Clock,
      };
    case 'approved':
      return {
        label: 'Aprobat',
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/30',
        icon: CheckCircle2,
      };
    case 'paid':
      return {
        label: 'Plătit',
        color: 'text-green-600 bg-green-100 dark:bg-green-950/30',
        icon: CheckCircle2,
      };
    case 'partial':
      return {
        label: 'Plată parțială',
        color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-950/30',
        icon: CircleDollarSign,
      };
    case 'overdue':
      return {
        label: 'Întârziat',
        color: 'text-red-600 bg-red-100 dark:bg-red-950/30',
        icon: AlertTriangle,
      };
    case 'cancelled':
      return {
        label: 'Anulat',
        color: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
        icon: XCircle,
      };
    case 'disputed':
      return {
        label: 'Contestat',
        color: 'text-orange-600 bg-orange-100 dark:bg-orange-950/30',
        icon: AlertCircle,
      };
    default:
      return {
        label: status,
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: FileText,
      };
  }
};

const getCategoryConfig = (category: BillCategory) => {
  switch (category) {
    case 'utilities':
      return { label: 'Utilități', icon: '⚡', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400' };
    case 'rent':
      return { label: 'Chirie', icon: '🏢', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' };
    case 'supplies':
      return { label: 'Consumabile', icon: '📦', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' };
    case 'services':
      return { label: 'Servicii', icon: '🔧', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400' };
    case 'equipment':
      return { label: 'Echipamente', icon: '💻', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' };
    case 'marketing':
      return { label: 'Marketing', icon: '📢', color: 'bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400' };
    case 'travel':
      return { label: 'Transport', icon: '✈️', color: 'bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400' };
    case 'insurance':
      return { label: 'Asigurări', icon: '🛡️', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' };
    case 'taxes':
      return { label: 'Taxe', icon: '📋', color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' };
    case 'salaries':
      return { label: 'Salarii', icon: '👥', color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' };
    default:
      return { label: 'Altele', icon: '📄', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' };
  }
};

const formatCurrency = (amount: number, currency: string = 'RON'): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getDaysUntilDue = (dueDate: string): number => {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Bill Status Badge Component
export function BillStatusBadge({
  status,
  size = 'default',
  showIcon = true,
  className,
}: {
  status: BillStatus;
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

// Bill Category Badge Component
export function BillCategoryBadge({
  category,
  className,
}: {
  category: BillCategory;
  className?: string;
}) {
  const config = getCategoryConfig(category);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium',
        config.color,
        className
      )}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

// Due Date Indicator Component
export function DueDateIndicator({
  dueDate,
  status,
  className,
}: {
  dueDate: string;
  status: BillStatus;
  className?: string;
}) {
  if (status === 'paid' || status === 'cancelled') {
    return null;
  }

  const daysUntil = getDaysUntilDue(dueDate);

  let color = 'text-slate-600 dark:text-slate-400';
  let message = '';
  let Icon = Calendar;

  if (daysUntil < 0) {
    color = 'text-red-600 dark:text-red-400';
    message = `Întârziat ${Math.abs(daysUntil)} zile`;
    Icon = AlertTriangle;
  } else if (daysUntil === 0) {
    color = 'text-amber-600 dark:text-amber-400';
    message = 'Scadent azi';
    Icon = Timer;
  } else if (daysUntil <= 3) {
    color = 'text-amber-600 dark:text-amber-400';
    message = `Scadent în ${daysUntil} zile`;
    Icon = Clock;
  } else if (daysUntil <= 7) {
    color = 'text-blue-600 dark:text-blue-400';
    message = `Scadent în ${daysUntil} zile`;
    Icon = Calendar;
  } else {
    message = formatDate(dueDate);
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-sm', color, className)}>
      <Icon className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

// Vendor Avatar Component
function VendorAvatar({
  vendor,
  size = 'default',
}: {
  vendor: Bill['vendor'];
  size?: 'sm' | 'default' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    default: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  if (vendor.logo) {
    return (
      <img
        src={vendor.logo}
        alt={vendor.name}
        className={cn('rounded-lg object-cover', sizeClasses[size])}
      />
    );
  }

  const initials = vendor.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        'rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center font-semibold text-white',
        sizeClasses[size]
      )}
    >
      {initials}
    </div>
  );
}

// Main Bill Card Component
export function BillCard({
  bill,
  onView,
  onEdit,
  onDelete,
  onPay,
  onApprove,
  onDownload,
  variant = 'default',
  selected = false,
  onSelect,
  className,
}: BillCardProps) {
  const [showActions, setShowActions] = useState(false);
  const remainingAmount = bill.amount - (bill.paidAmount || 0);
  const paymentProgress = bill.paidAmount ? (bill.paidAmount / bill.amount) * 100 : 0;

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
        <VendorAvatar vendor={bill.vendor} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {bill.vendor.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {bill.number} • {formatDate(bill.issueDate)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(bill.amount, bill.currency)}
          </p>
          <BillStatusBadge status={bill.status} size="sm" showIcon={false} />
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
            <VendorAvatar vendor={bill.vendor} size="sm" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {bill.vendor.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bill.number}
              </p>
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          <BillCategoryBadge category={bill.category} />
        </td>
        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
          {formatDate(bill.issueDate)}
        </td>
        <td className="py-3 px-4">
          <DueDateIndicator dueDate={bill.dueDate} status={bill.status} />
        </td>
        <td className="py-3 px-4 text-right">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(bill.amount, bill.currency)}
          </p>
        </td>
        <td className="py-3 px-4">
          <BillStatusBadge status={bill.status} />
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center justify-end gap-1">
            {onPay && bill.status !== 'paid' && bill.status !== 'cancelled' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPay();
                }}
                className="p-1.5 hover:bg-green-100 dark:hover:bg-green-950/30 text-green-600 rounded transition-colors"
              >
                <Banknote className="h-4 w-4" />
              </button>
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
          'p-5 rounded-xl border bg-white dark:bg-slate-900 shadow-sm',
          selected && 'ring-2 ring-blue-500',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <VendorAvatar vendor={bill.vendor} size="lg" />
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {bill.vendor.name}
              </h3>
              {bill.vendor.cui && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  CUI: {bill.vendor.cui}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <BillStatusBadge status={bill.status} />
                <BillCategoryBadge category={bill.category} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(bill.amount, bill.currency)}
            </p>
            {bill.vatAmount && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                TVA: {formatCurrency(bill.vatAmount, bill.currency)} ({bill.vatRate}%)
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Număr factură</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{bill.number}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data emiterii</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {formatDate(bill.issueDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data scadenței</p>
            <DueDateIndicator dueDate={bill.dueDate} status={bill.status} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Deductibilitate</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {bill.deductible ? `${bill.deductiblePercent || 100}%` : 'Nedeductibil'}
            </p>
          </div>
        </div>

        {/* Payment Progress (if partial) */}
        {bill.status === 'partial' && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Plătit: {formatCurrency(bill.paidAmount || 0, bill.currency)}
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Rămas: {formatCurrency(remainingAmount, bill.currency)}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${paymentProgress}%` }}
                className="h-full bg-green-500 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Description */}
        {bill.description && (
          <div className="mt-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">{bill.description}</p>
          </div>
        )}

        {/* Tags & Attachments */}
        <div className="flex items-center gap-4 mt-4">
          {bill.tags && bill.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-4 w-4 text-slate-400" />
              {bill.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {bill.attachments && bill.attachments > 0 && (
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <Paperclip className="h-4 w-4" />
              <span>{bill.attachments} atașamente</span>
            </div>
          )}
          {bill.recurring && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full">
              Recurent
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
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
            {onEdit && (
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
          {onPay && bill.status !== 'paid' && bill.status !== 'cancelled' && (
            <button
              onClick={onPay}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Banknote className="h-4 w-4" />
              <span>Plătește</span>
            </button>
          )}
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
          <VendorAvatar vendor={bill.vendor} />
          <div>
            <h3 className="font-medium text-slate-900 dark:text-slate-100">
              {bill.vendor.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {bill.number}
            </p>
          </div>
        </div>
        <BillStatusBadge status={bill.status} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <BillCategoryBadge category={bill.category} />
        <DueDateIndicator dueDate={bill.dueDate} status={bill.status} />
      </div>

      <div className="flex items-end justify-between pt-3 border-t">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total de plată</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(bill.amount, bill.currency)}
          </p>
        </div>
        {onPay && bill.status !== 'paid' && bill.status !== 'cancelled' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPay();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Banknote className="h-4 w-4" />
            <span>Plătește</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Bill List Component
export function BillList({
  bills,
  onBillClick,
  onBillPay,
  variant = 'cards',
  showFilters = false,
  className,
}: BillListProps) {
  const [filter, setFilter] = useState<BillStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesFilter = filter === 'all' || bill.status === filter;
      const matchesSearch =
        !searchQuery ||
        bill.vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.number.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [bills, filter, searchQuery]);

  if (variant === 'rows') {
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
                placeholder="Caută facturi..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                Furnizor
              </th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                Categorie
              </th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                Dată emitere
              </th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                Scadență
              </th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">
                Sumă
              </th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                Status
              </th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                variant="row"
                onView={() => onBillClick?.(bill)}
                onPay={() => onBillPay?.(bill)}
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
              placeholder="Caută facturi..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
      <div
        className={cn(
          'grid gap-4',
          variant === 'cards' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
        )}
      >
        {filteredBills.map((bill) => (
          <BillCard
            key={bill.id}
            bill={bill}
            variant={variant === 'compact' ? 'compact' : 'default'}
            onView={() => onBillClick?.(bill)}
            onPay={() => onBillPay?.(bill)}
          />
        ))}
      </div>
    </div>
  );
}

// Bill Summary Component
export function BillSummary({ bills, className }: BillSummaryProps) {
  const summary = useMemo(() => {
    const total = bills.reduce((sum, b) => sum + b.amount, 0);
    const paid = bills
      .filter((b) => b.status === 'paid')
      .reduce((sum, b) => sum + b.amount, 0);
    const pending = bills
      .filter((b) => ['pending', 'approved'].includes(b.status))
      .reduce((sum, b) => sum + b.amount, 0);
    const overdue = bills
      .filter((b) => b.status === 'overdue')
      .reduce((sum, b) => sum + b.amount, 0);

    return { total, paid, pending, overdue };
  }, [bills]);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total facturi</p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {formatCurrency(summary.total)}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30">
        <p className="text-sm text-green-600 dark:text-green-400 mb-1">Plătit</p>
        <p className="text-xl font-bold text-green-700 dark:text-green-300">
          {formatCurrency(summary.paid)}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30">
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">În așteptare</p>
        <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
          {formatCurrency(summary.pending)}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30">
        <p className="text-sm text-red-600 dark:text-red-400 mb-1">Întârziat</p>
        <p className="text-xl font-bold text-red-700 dark:text-red-300">
          {formatCurrency(summary.overdue)}
        </p>
      </div>
    </div>
  );
}

// Empty State Component
export function BillEmptyState({
  onAddBill,
  className,
}: {
  onAddBill?: () => void;
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
        <Receipt className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
        Nicio factură de plată
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Adăugați facturile primite de la furnizori
      </p>
      {onAddBill && (
        <button
          onClick={onAddBill}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Adaugă factură</span>
        </button>
      )}
    </motion.div>
  );
}

export default BillCard;
