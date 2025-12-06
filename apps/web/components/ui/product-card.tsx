'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Package,
  Tag,
  Barcode,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  CheckCircle2,
  XCircle,
  Archive,
  Star,
  StarOff,
  Plus,
  Minus,
  Search,
  Filter,
  Grid,
  List,
  Box,
  Layers,
  Percent,
  DollarSign,
  Calculator,
  Info,
  ExternalLink,
  Image,
  FileText,
  Settings,
  BarChart3,
} from 'lucide-react';

// Types
export type ProductType = 'product' | 'service' | 'bundle' | 'subscription';
export type ProductStatus = 'active' | 'inactive' | 'draft' | 'out_of_stock' | 'discontinued';
export type VatRate = 0 | 5 | 9 | 19;

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  type: ProductType;
  status: ProductStatus;
  category?: string;
  description?: string;
  imageUrl?: string;
  price: number;
  currency: string;
  vatRate: VatRate;
  vatIncluded?: boolean;
  costPrice?: number;
  margin?: number;
  unit: string;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  trackStock?: boolean;
  favorite?: boolean;
  salesCount?: number;
  revenue?: number;
  tags?: string[];
  variants?: Array<{
    id: string;
    name: string;
    sku?: string;
    price: number;
    stock?: number;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductCardProps {
  product: Product;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onAddToInvoice?: () => void;
  onToggleFavorite?: () => void;
  onToggleStatus?: () => void;
  variant?: 'default' | 'compact' | 'detailed' | 'grid' | 'row';
  selected?: boolean;
  onSelect?: () => void;
  showStock?: boolean;
  showPrice?: boolean;
  className?: string;
}

export interface ProductListProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  onAddToInvoice?: (product: Product) => void;
  variant?: 'grid' | 'list' | 'table';
  showFilters?: boolean;
  className?: string;
}

export interface ProductSelectorProps {
  products: Product[];
  selectedIds: string[];
  onSelect: (product: Product) => void;
  onDeselect: (productId: string) => void;
  multiple?: boolean;
  className?: string;
}

// Helper functions
const getStatusConfig = (status: ProductStatus) => {
  switch (status) {
    case 'active':
      return {
        label: 'Activ',
        color: 'text-green-600 bg-green-100 dark:bg-green-950/30',
        icon: CheckCircle2,
      };
    case 'inactive':
      return {
        label: 'Inactiv',
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: XCircle,
      };
    case 'draft':
      return {
        label: 'Ciornă',
        color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/30',
        icon: FileText,
      };
    case 'out_of_stock':
      return {
        label: 'Stoc epuizat',
        color: 'text-red-600 bg-red-100 dark:bg-red-950/30',
        icon: AlertTriangle,
      };
    case 'discontinued':
      return {
        label: 'Întrerupt',
        color: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
        icon: Archive,
      };
    default:
      return {
        label: status,
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: Package,
      };
  }
};

const getTypeConfig = (type: ProductType) => {
  switch (type) {
    case 'product':
      return { label: 'Produs', icon: Package, color: 'text-blue-600' };
    case 'service':
      return { label: 'Serviciu', icon: Settings, color: 'text-purple-600' };
    case 'bundle':
      return { label: 'Pachet', icon: Layers, color: 'text-cyan-600' };
    case 'subscription':
      return { label: 'Abonament', icon: TrendingUp, color: 'text-green-600' };
    default:
      return { label: type, icon: Package, color: 'text-slate-600' };
  }
};

const formatCurrency = (amount: number, currency: string = 'RON'): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const getStockStatus = (product: Product): { status: 'ok' | 'low' | 'out' | 'over'; message: string } => {
  if (!product.trackStock || product.stock === undefined) {
    return { status: 'ok', message: 'Fără urmărire stoc' };
  }

  if (product.stock <= 0) {
    return { status: 'out', message: 'Stoc epuizat' };
  }

  if (product.minStock && product.stock <= product.minStock) {
    return { status: 'low', message: `Stoc scăzut (${product.stock} ${product.unit})` };
  }

  if (product.maxStock && product.stock > product.maxStock) {
    return { status: 'over', message: `Stoc excedentar (${product.stock} ${product.unit})` };
  }

  return { status: 'ok', message: `${product.stock} ${product.unit} în stoc` };
};

// Product Status Badge Component
export function ProductStatusBadge({
  status,
  size = 'default',
  showIcon = true,
  className,
}: {
  status: ProductStatus;
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

// Product Type Badge Component
export function ProductTypeBadge({
  type,
  className,
}: {
  type: ProductType;
  className?: string;
}) {
  const config = getTypeConfig(type);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        config.color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

// Stock Indicator Component
export function StockIndicator({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { status, message } = getStockStatus(product);

  const colorClasses = {
    ok: 'text-green-600 dark:text-green-400',
    low: 'text-amber-600 dark:text-amber-400',
    out: 'text-red-600 dark:text-red-400',
    over: 'text-blue-600 dark:text-blue-400',
  };

  const IconMap = {
    ok: CheckCircle2,
    low: AlertTriangle,
    out: XCircle,
    over: TrendingUp,
  };

  const Icon = IconMap[status];

  return (
    <div className={cn('flex items-center gap-1.5 text-sm', colorClasses[status], className)}>
      <Icon className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

// Product Image Component
function ProductImage({
  product,
  size = 'default',
}: {
  product: Product;
  size?: 'sm' | 'default' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    default: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  if (product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        className={cn('rounded-lg object-cover', sizeClasses[size])}
      />
    );
  }

  const TypeIcon = getTypeConfig(product.type).icon;

  return (
    <div
      className={cn(
        'rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center',
        sizeClasses[size]
      )}
    >
      <TypeIcon className="h-6 w-6 text-slate-400" />
    </div>
  );
}

// Price Display Component
export function ProductPrice({
  product,
  showVat = true,
  showMargin = false,
  className,
}: {
  product: Product;
  showVat?: boolean;
  showMargin?: boolean;
  className?: string;
}) {
  const priceWithoutVat = product.vatIncluded
    ? product.price / (1 + product.vatRate / 100)
    : product.price;

  const priceWithVat = product.vatIncluded
    ? product.price
    : product.price * (1 + product.vatRate / 100);

  return (
    <div className={className}>
      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
        {formatCurrency(priceWithVat, product.currency)}
      </p>
      {showVat && product.vatRate > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatCurrency(priceWithoutVat, product.currency)} + TVA {product.vatRate}%
        </p>
      )}
      {showMargin && product.margin !== undefined && (
        <p
          className={cn(
            'text-xs flex items-center gap-1',
            product.margin >= 30
              ? 'text-green-600'
              : product.margin >= 15
              ? 'text-amber-600'
              : 'text-red-600'
          )}
        >
          <Percent className="h-3 w-3" />
          Marjă {product.margin.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

// Main Product Card Component
export function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onAddToInvoice,
  onToggleFavorite,
  onToggleStatus,
  variant = 'default',
  selected = false,
  onSelect,
  showStock = true,
  showPrice = true,
  className,
}: ProductCardProps) {
  const [showActions, setShowActions] = useState(false);
  const stockInfo = getStockStatus(product);

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
        <ProductImage product={product} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {product.name}
          </p>
          <div className="flex items-center gap-2">
            <ProductTypeBadge type={product.type} />
            {product.sku && (
              <span className="text-xs text-slate-400">SKU: {product.sku}</span>
            )}
          </div>
        </div>
        {showPrice && (
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(product.price, product.currency)}
            </p>
            {showStock && product.trackStock && (
              <p
                className={cn(
                  'text-xs',
                  stockInfo.status === 'ok'
                    ? 'text-green-600'
                    : stockInfo.status === 'low'
                    ? 'text-amber-600'
                    : 'text-red-600'
                )}
              >
                {product.stock} {product.unit}
              </p>
            )}
          </div>
        )}
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
            <ProductImage product={product} size="sm" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {product.name}
              </p>
              {product.sku && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SKU: {product.sku}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          <ProductTypeBadge type={product.type} />
        </td>
        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
          {product.category || '-'}
        </td>
        <td className="py-3 px-4 text-right">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(product.price, product.currency)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            TVA {product.vatRate}%
          </p>
        </td>
        {showStock && (
          <td className="py-3 px-4">
            {product.trackStock ? (
              <StockIndicator product={product} />
            ) : (
              <span className="text-sm text-slate-400">-</span>
            )}
          </td>
        )}
        <td className="py-3 px-4">
          <ProductStatusBadge status={product.status} size="sm" />
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center justify-end gap-1">
            {onAddToInvoice && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToInvoice();
                }}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-blue-600 rounded transition-colors"
                title="Adaugă în factură"
              >
                <Plus className="h-4 w-4" />
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
        <div className="aspect-square relative bg-slate-100 dark:bg-slate-800">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {React.createElement(getTypeConfig(product.type).icon, {
                className: 'h-12 w-12 text-slate-300 dark:text-slate-600',
              })}
            </div>
          )}
          <div className="absolute top-2 left-2">
            <ProductStatusBadge status={product.status} size="sm" />
          </div>
          {product.favorite && (
            <div className="absolute top-2 right-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <ProductTypeBadge type={product.type} className="mb-2" />
          <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate mb-1">
            {product.name}
          </h3>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(product.price, product.currency)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                TVA {product.vatRate}%
              </p>
            </div>
            {showStock && product.trackStock && (
              <div
                className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  stockInfo.status === 'ok'
                    ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                    : stockInfo.status === 'low'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                )}
              >
                {product.stock} {product.unit}
              </div>
            )}
          </div>
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
          {/* Product Image */}
          <div className="flex-shrink-0">
            <div className="relative">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  {React.createElement(getTypeConfig(product.type).icon, {
                    className: 'h-12 w-12 text-slate-400',
                  })}
                </div>
              )}
              {product.favorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.();
                  }}
                  className="absolute -top-2 -right-2 p-1 bg-white dark:bg-slate-900 rounded-full shadow"
                >
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                </button>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ProductTypeBadge type={product.type} />
                  <ProductStatusBadge status={product.status} size="sm" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {product.description}
                  </p>
                )}
              </div>
              <ProductPrice product={product} showMargin />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {product.sku && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">SKU</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {product.sku}
                  </p>
                </div>
              )}
              {product.barcode && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Cod de bare</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Barcode className="h-4 w-4" />
                    {product.barcode}
                  </p>
                </div>
              )}
              {product.category && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Categorie</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {product.category}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Unitate</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {product.unit}
                </p>
              </div>
            </div>

            {/* Stock Info */}
            {showStock && product.trackStock && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Stoc curent</span>
                  <StockIndicator product={product} />
                </div>
                {(product.minStock || product.maxStock) && (
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {product.minStock && <span>Min: {product.minStock} {product.unit}</span>}
                    {product.maxStock && <span>Max: {product.maxStock} {product.unit}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Sales Stats */}
            {(product.salesCount !== undefined || product.revenue !== undefined) && (
              <div className="flex items-center gap-6 mb-4">
                {product.salesCount !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">
                      {product.salesCount} vânzări
                    </span>
                  </div>
                )}
                {product.revenue !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatCurrency(product.revenue, product.currency)} venituri
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap mb-4">
                <Tag className="h-4 w-4 text-slate-400" />
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  {product.variants.length} variante
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.slice(0, 4).map((variant) => (
                    <span
                      key={variant.id}
                      className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded"
                    >
                      {variant.name} - {formatCurrency(variant.price, product.currency)}
                    </span>
                  ))}
                  {product.variants.length > 4 && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      +{product.variants.length - 4} mai multe
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
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
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>Duplică</span>
              </button>
            )}
          </div>
          {onAddToInvoice && (
            <button
              onClick={onAddToInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Adaugă în factură</span>
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
      <div className="flex gap-4">
        <ProductImage product={product} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <ProductTypeBadge type={product.type} className="mb-1" />
              <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {product.name}
              </h3>
            </div>
            <ProductStatusBadge status={product.status} size="sm" />
          </div>

          <div className="flex items-end justify-between">
            <div>
              {product.sku && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  SKU: {product.sku}
                </p>
              )}
              {showStock && product.trackStock && (
                <StockIndicator product={product} />
              )}
            </div>
            {showPrice && (
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(product.price, product.currency)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  TVA {product.vatRate}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Product List Component
export function ProductList({
  products,
  onProductClick,
  onAddToInvoice,
  variant = 'grid',
  showFilters = false,
  className,
}: ProductListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(variant === 'table' ? 'list' : variant);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

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
                placeholder="Caută produse..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Produs</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Tip</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Categorie</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500 text-right">Preț</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Stoc</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="row"
                onView={() => onProductClick?.(product)}
                onAddToInvoice={() => onAddToInvoice?.(product)}
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
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută produse..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-3'
        )}
      >
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            variant={viewMode === 'grid' ? 'grid' : 'compact'}
            onView={() => onProductClick?.(product)}
            onAddToInvoice={() => onAddToInvoice?.(product)}
          />
        ))}
      </div>
    </div>
  );
}

// Product Selector Component
export function ProductSelector({
  products,
  selectedIds,
  onSelect,
  onDeselect,
  multiple = true,
  className,
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Caută produse..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {filteredProducts.map((product) => {
          const isSelected = selectedIds.includes(product.id);
          return (
            <button
              key={product.id}
              onClick={() => {
                if (isSelected) {
                  onDeselect(product.id);
                } else {
                  onSelect(product);
                }
              }}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded border flex items-center justify-center',
                  isSelected
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-slate-300 dark:border-slate-600'
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <ProductImage product={product} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {product.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatCurrency(product.price, product.currency)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Empty State Component
export function ProductEmptyState({
  onAddProduct,
  className,
}: {
  onAddProduct?: () => void;
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
        <Package className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
        Niciun produs adăugat
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Adăugați produse și servicii pentru a le folosi în facturi
      </p>
      {onAddProduct && (
        <button
          onClick={onAddProduct}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Adaugă produs</span>
        </button>
      )}
    </motion.div>
  );
}

export default ProductCard;
