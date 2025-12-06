'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Receipt,
  Camera,
  Scan,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Image,
  FileText,
  Calendar,
  MapPin,
  CreditCard,
  Banknote,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Eye,
  RefreshCw,
  ZoomIn,
  Check,
  X,
  AlertCircle,
  Plus,
  Upload,
  Search,
  Filter,
  SlidersHorizontal,
  Sparkles,
  Building2,
  ShoppingCart,
  Coffee,
  Car,
  Utensils,
  Fuel,
  Briefcase,
  Package,
  Wifi,
  Phone,
  Zap,
} from 'lucide-react';

// Types
export type ReceiptStatus = 'pending' | 'processing' | 'processed' | 'verified' | 'error' | 'rejected';
export type ReceiptCategory = 'office' | 'travel' | 'meals' | 'fuel' | 'supplies' | 'utilities' | 'telecom' | 'services' | 'equipment' | 'other';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface Receipt {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  vendor?: string;
  vendorCui?: string;
  date?: string;
  amount?: number;
  currency?: string;
  category?: ReceiptCategory;
  status: ReceiptStatus;
  paymentMethod?: PaymentMethod;
  description?: string;
  ocrConfidence?: number;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  vatAmount?: number;
  vatRate?: number;
  processedAt?: string;
  createdAt: string;
  tags?: string[];
  notes?: string;
  deductible?: boolean;
  deductiblePercent?: number;
}

export interface ReceiptCardProps {
  receipt: Receipt;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
  onVerify?: () => void;
  onReject?: () => void;
  variant?: 'default' | 'compact' | 'detailed' | 'grid';
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export interface ReceiptListProps {
  receipts: Receipt[];
  onReceiptClick?: (receipt: Receipt) => void;
  variant?: 'grid' | 'list';
  showFilters?: boolean;
  className?: string;
}

export interface ReceiptUploadProps {
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
  maxFiles?: number;
  className?: string;
}

// Helper functions
const getStatusConfig = (status: ReceiptStatus) => {
  switch (status) {
    case 'pending':
      return {
        label: 'În așteptare',
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: Clock,
      };
    case 'processing':
      return {
        label: 'Se procesează',
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/30',
        icon: Loader2,
        animate: true,
      };
    case 'processed':
      return {
        label: 'Procesat',
        color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-950/30',
        icon: Sparkles,
      };
    case 'verified':
      return {
        label: 'Verificat',
        color: 'text-green-600 bg-green-100 dark:bg-green-950/30',
        icon: CheckCircle2,
      };
    case 'error':
      return {
        label: 'Eroare',
        color: 'text-red-600 bg-red-100 dark:bg-red-950/30',
        icon: AlertTriangle,
      };
    case 'rejected':
      return {
        label: 'Respins',
        color: 'text-orange-600 bg-orange-100 dark:bg-orange-950/30',
        icon: XCircle,
      };
    default:
      return {
        label: status,
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: Receipt,
      };
  }
};

const getCategoryConfig = (category: ReceiptCategory) => {
  switch (category) {
    case 'office':
      return { label: 'Birou', icon: Briefcase, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' };
    case 'travel':
      return { label: 'Transport', icon: Car, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' };
    case 'meals':
      return { label: 'Masă', icon: Utensils, color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400' };
    case 'fuel':
      return { label: 'Combustibil', icon: Fuel, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' };
    case 'supplies':
      return { label: 'Consumabile', icon: Package, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400' };
    case 'utilities':
      return { label: 'Utilități', icon: Zap, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400' };
    case 'telecom':
      return { label: 'Telecom', icon: Phone, color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' };
    case 'services':
      return { label: 'Servicii', icon: Building2, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' };
    case 'equipment':
      return { label: 'Echipamente', icon: ShoppingCart, color: 'bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400' };
    default:
      return { label: 'Altele', icon: Receipt, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' };
  }
};

const getPaymentMethodLabel = (method: PaymentMethod): string => {
  switch (method) {
    case 'cash':
      return 'Numerar';
    case 'card':
      return 'Card';
    case 'transfer':
      return 'Transfer';
    default:
      return 'Altul';
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

// Receipt Status Badge Component
export function ReceiptStatusBadge({
  status,
  size = 'default',
  showIcon = true,
  className,
}: {
  status: ReceiptStatus;
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
      {showIcon && (
        <Icon
          className={cn(
            size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
            config.animate && 'animate-spin'
          )}
        />
      )}
      {config.label}
    </span>
  );
}

// Receipt Category Badge Component
export function ReceiptCategoryBadge({
  category,
  className,
}: {
  category: ReceiptCategory;
  className?: string;
}) {
  const config = getCategoryConfig(category);
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

// OCR Confidence Indicator Component
export function OCRConfidenceIndicator({
  confidence,
  className,
}: {
  confidence: number;
  className?: string;
}) {
  const getColor = () => {
    if (confidence >= 90) return 'bg-green-500';
    if (confidence >= 70) return 'bg-yellow-500';
    if (confidence >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (confidence >= 90) return 'Încredere ridicată';
    if (confidence >= 70) return 'Încredere medie';
    if (confidence >= 50) return 'Încredere scăzută';
    return 'Necesită verificare';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          className={cn('h-full rounded-full', getColor())}
        />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[3rem]">
        {confidence}%
      </span>
    </div>
  );
}

// Receipt Thumbnail Component
function ReceiptThumbnail({
  receipt,
  size = 'default',
  showOverlay = true,
}: {
  receipt: Receipt;
  size?: 'sm' | 'default' | 'lg';
  showOverlay?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-12 h-16',
    default: 'w-16 h-20',
    lg: 'w-24 h-32',
  };

  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800', sizeClasses[size])}>
      <img
        src={receipt.thumbnailUrl || receipt.imageUrl}
        alt="Receipt"
        className="w-full h-full object-cover"
      />
      {showOverlay && receipt.status === 'processing' && (
        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
        </div>
      )}
      {showOverlay && receipt.status === 'error' && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
      )}
    </div>
  );
}

// Main Receipt Card Component
export function ReceiptCard({
  receipt,
  onView,
  onEdit,
  onDelete,
  onRetry,
  onVerify,
  onReject,
  variant = 'default',
  selected = false,
  onSelect,
  className,
}: ReceiptCardProps) {
  const [showActions, setShowActions] = useState(false);

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
        <ReceiptThumbnail receipt={receipt} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {receipt.vendor || 'Comerciant necunoscut'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {receipt.date ? formatDate(receipt.date) : formatDate(receipt.createdAt)}
          </p>
        </div>
        <div className="text-right">
          {receipt.amount ? (
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(receipt.amount, receipt.currency)}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">În procesare</p>
          )}
          <ReceiptStatusBadge status={receipt.status} size="sm" showIcon={false} />
        </div>
      </motion.div>
    );
  }

  if (variant === 'grid') {
    return (
      <motion.div
        whileHover={{ y: -4 }}
        className={cn(
          'relative rounded-xl border bg-white dark:bg-slate-900 overflow-hidden cursor-pointer transition-all',
          selected && 'ring-2 ring-blue-500 border-blue-500',
          'hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600',
          className
        )}
        onClick={onView}
      >
        {/* Image */}
        <div className="aspect-[3/4] relative bg-slate-100 dark:bg-slate-800">
          <img
            src={receipt.thumbnailUrl || receipt.imageUrl}
            alt="Receipt"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <ReceiptStatusBadge status={receipt.status} size="sm" />
          </div>
          {receipt.status === 'processing' && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-full">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <p className="font-medium text-slate-900 dark:text-slate-100 truncate mb-1">
            {receipt.vendor || 'Comerciant necunoscut'}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {receipt.date ? formatDate(receipt.date) : formatDate(receipt.createdAt)}
            </span>
            {receipt.amount && (
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(receipt.amount, receipt.currency)}
              </span>
            )}
          </div>
          {receipt.category && (
            <div className="mt-2">
              <ReceiptCategoryBadge category={receipt.category} />
            </div>
          )}
        </div>
      </motion.div>
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
        <div className="flex gap-5">
          {/* Receipt Image */}
          <div className="flex-shrink-0">
            <div className="relative">
              <img
                src={receipt.imageUrl}
                alt="Receipt"
                className="w-32 h-40 object-cover rounded-lg"
              />
              <button
                onClick={onView}
                className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center group"
              >
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {receipt.vendor || 'Comerciant necunoscut'}
                </h3>
                {receipt.vendorCui && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    CUI: {receipt.vendorCui}
                  </p>
                )}
              </div>
              <ReceiptStatusBadge status={receipt.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {receipt.date ? formatDate(receipt.date) : 'Necunoscută'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sumă</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {receipt.amount ? formatCurrency(receipt.amount, receipt.currency) : '-'}
                </p>
              </div>
              {receipt.category && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Categorie</p>
                  <ReceiptCategoryBadge category={receipt.category} />
                </div>
              )}
              {receipt.paymentMethod && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Plată</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                    {receipt.paymentMethod === 'cash' ? (
                      <Banknote className="h-4 w-4" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {getPaymentMethodLabel(receipt.paymentMethod)}
                  </div>
                </div>
              )}
            </div>

            {/* OCR Confidence */}
            {receipt.ocrConfidence !== undefined && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Acuratețe OCR
                </p>
                <OCRConfidenceIndicator confidence={receipt.ocrConfidence} />
              </div>
            )}

            {/* Items */}
            {receipt.items && receipt.items.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Produse detectate ({receipt.items.length})
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {receipt.items.slice(0, 3).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-600 dark:text-slate-400 truncate">
                        {item.name}
                      </span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {formatCurrency(item.total, receipt.currency)}
                      </span>
                    </div>
                  ))}
                  {receipt.items.length > 3 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      + {receipt.items.length - 3} mai multe
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* VAT */}
            {receipt.vatAmount !== undefined && (
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                TVA: {formatCurrency(receipt.vatAmount, receipt.currency)}
                {receipt.vatRate && ` (${receipt.vatRate}%)`}
              </div>
            )}

            {/* Deductibility */}
            {receipt.deductible !== undefined && (
              <div className="flex items-center gap-2 text-sm mb-4">
                {receipt.deductible ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      Deductibil {receipt.deductiblePercent ? `${receipt.deductiblePercent}%` : '100%'}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">Nedeductibil</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Editează</span>
              </button>
            )}
            {onRetry && receipt.status === 'error' && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reîncearcă</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Șterge</span>
              </button>
            )}
          </div>
          {receipt.status === 'processed' && (
            <div className="flex items-center gap-2">
              {onReject && (
                <button
                  onClick={onReject}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Respinge</span>
                </button>
              )}
              {onVerify && (
                <button
                  onClick={onVerify}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>Verifică</span>
                </button>
              )}
            </div>
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
      <div className="flex gap-4">
        <ReceiptThumbnail receipt={receipt} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {receipt.vendor || 'Comerciant necunoscut'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {receipt.date ? formatDate(receipt.date) : formatDate(receipt.createdAt)}
              </p>
            </div>
            <ReceiptStatusBadge status={receipt.status} size="sm" />
          </div>

          {receipt.category && (
            <div className="mb-2">
              <ReceiptCategoryBadge category={receipt.category} />
            </div>
          )}

          <div className="flex items-end justify-between">
            {receipt.amount ? (
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(receipt.amount, receipt.currency)}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">Se procesează...</p>
            )}

            {receipt.ocrConfidence !== undefined && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Sparkles className="h-3 w-3" />
                <span>{receipt.ocrConfidence}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Receipt List Component
export function ReceiptList({
  receipts,
  onReceiptClick,
  variant = 'grid',
  showFilters = false,
  className,
}: ReceiptListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'all'>('all');

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const matchesSearch =
        !searchQuery ||
        receipt.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [receipts, searchQuery, statusFilter]);

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
              placeholder="Caută bonuri..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          variant === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-3'
        )}
      >
        {filteredReceipts.map((receipt) => (
          <ReceiptCard
            key={receipt.id}
            receipt={receipt}
            variant={variant === 'grid' ? 'grid' : 'compact'}
            onView={() => onReceiptClick?.(receipt)}
          />
        ))}
      </div>
    </div>
  );
}

// Receipt Upload Component
export function ReceiptUpload({
  onUpload,
  isUploading = false,
  maxFiles = 10,
  className,
}: ReceiptUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length > 0) {
        onUpload(files.slice(0, maxFiles));
      }
    },
    [onUpload, maxFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onUpload(files.slice(0, maxFiles));
      }
    },
    [onUpload, maxFiles]
  );

  return (
    <motion.div
      animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
        className
      )}
    >
      {isUploading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Se încarcă bonurile...
          </p>
        </div>
      ) : (
        <>
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full inline-block mb-4">
            <Camera className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
            Încarcă bonuri
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Trageți imaginile aici sau apăsați pentru a selecta
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors">
            <Upload className="h-4 w-4" />
            <span>Selectează fișiere</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
            JPG, PNG sau PDF • Max {maxFiles} fișiere
          </p>
        </>
      )}
    </motion.div>
  );
}

// Receipt Summary Component
export function ReceiptSummary({
  receipts,
  className,
}: {
  receipts: Receipt[];
  className?: string;
}) {
  const summary = useMemo(() => {
    const total = receipts
      .filter((r) => r.amount)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const processed = receipts.filter((r) => r.status === 'processed' || r.status === 'verified').length;
    const pending = receipts.filter((r) => r.status === 'pending' || r.status === 'processing').length;
    const errors = receipts.filter((r) => r.status === 'error').length;

    return { total, processed, pending, errors, count: receipts.length };
  }, [receipts]);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total bonuri</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {summary.count}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30">
        <p className="text-sm text-green-600 dark:text-green-400 mb-1">Procesate</p>
        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
          {summary.processed}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30">
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">În așteptare</p>
        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
          {summary.pending}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30">
        <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Valoare totală</p>
        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
          {formatCurrency(summary.total)}
        </p>
      </div>
    </div>
  );
}

// Empty State Component
export function ReceiptEmptyState({
  onUpload,
  className,
}: {
  onUpload?: () => void;
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
        Niciun bon încărcat
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Fotografiați sau încărcați bonurile pentru procesare automată
      </p>
      {onUpload && (
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Camera className="h-4 w-4" />
          <span>Încarcă bon</span>
        </button>
      )}
    </motion.div>
  );
}

export default ReceiptCard;
