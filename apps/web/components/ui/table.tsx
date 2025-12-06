'use client';

import { ReactNode, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
} from 'lucide-react';

// Basic Table Components
interface TableProps {
  children: ReactNode;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  className?: string;
}

export function Table({
  children,
  striped = false,
  hoverable = true,
  bordered = false,
  compact = false,
  className = '',
}: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`
          w-full text-sm
          ${striped ? '[&_tbody_tr:nth-child(even)]:bg-gray-50 dark:[&_tbody_tr:nth-child(even)]:bg-gray-800/50' : ''}
          ${hoverable ? '[&_tbody_tr]:hover:bg-gray-50 dark:[&_tbody_tr]:hover:bg-gray-800/50' : ''}
          ${bordered ? 'border border-gray-200 dark:border-gray-700 [&_th]:border [&_td]:border border-collapse' : ''}
          ${compact ? '[&_th]:py-2 [&_th]:px-3 [&_td]:py-2 [&_td]:px-3' : '[&_th]:py-3 [&_th]:px-4 [&_td]:py-3 [&_td]:px-4'}
          ${className}
        `}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <thead className={`bg-gray-50 dark:bg-gray-800 ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>{children}</tbody>;
}

export function TableRow({
  children,
  selected,
  onClick,
  className = '',
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={`
        transition-colors
        ${selected ? 'bg-primary/10' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children: ReactNode;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

export function TableHead({
  children,
  sortable,
  sortDirection,
  onSort,
  align = 'left',
  width,
  className = '',
}: TableHeadProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th
      onClick={sortable ? onSort : undefined}
      style={{ width }}
      className={`
        font-semibold text-gray-700 dark:text-gray-300
        ${alignClass[align]}
        ${sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
        ${className}
      `}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="text-gray-400">
            {sortDirection === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : sortDirection === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronsUpDown className="w-4 h-4" />
            )}
          </span>
        )}
      </div>
    </th>
  );
}

interface TableCellProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function TableCell({ children, align = 'left', className = '' }: TableCellProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td className={`text-gray-900 dark:text-white ${alignClass[align]} ${className}`}>
      {children}
    </td>
  );
}

export function TableFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <tfoot className={`bg-gray-50 dark:bg-gray-800 font-medium ${className}`}>
      {children}
    </tfoot>
  );
}

// Empty State
interface TableEmptyProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  colSpan: number;
}

export function TableEmpty({
  icon,
  title = 'Nu există date',
  description = 'Nu am găsit nicio înregistrare.',
  action,
  colSpan,
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        {icon && (
          <div className="flex justify-center mb-4 text-gray-400">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          {title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{description}</p>
        {action}
      </td>
    </tr>
  );
}

// Advanced Data Table
interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  loading?: boolean;
  emptyState?: ReactNode;
  rowActions?: (item: T) => { label: string; icon?: ReactNode; onClick: () => void; variant?: 'danger' }[];
  onRowClick?: (item: T) => void;
  stickyHeader?: boolean;
  striped?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  selectable,
  selectedKeys = [],
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort,
  loading,
  emptyState,
  rowActions,
  onRowClick,
  stickyHeader,
  striped = true,
  className = '',
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [openActionsRow, setOpenActionsRow] = useState<string | null>(null);

  const allSelected = data.length > 0 && selectedKeys.length === data.length;
  const someSelected = selectedKeys.length > 0 && selectedKeys.length < data.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map(keyExtractor));
    }
  };

  const handleSelectRow = (key: string) => {
    if (selectedKeys.includes(key)) {
      onSelectionChange?.(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange?.([...selectedKeys, key]);
    }
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      onSort?.(columnKey, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort?.(columnKey, 'asc');
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={`bg-gray-50 dark:bg-gray-800 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {selectable && (
                <th className="w-12 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  style={{ width: column.width }}
                  className={`
                    py-3 px-4 font-semibold text-gray-700 dark:text-gray-300
                    text-${column.align || 'left'}
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                  `}
                >
                  <div className={`flex items-center gap-2 ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : ''}`}>
                    {column.header}
                    {column.sortable && (
                      <span className="text-gray-400">
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {rowActions && <th className="w-12 py-3 px-4" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="py-12 text-center">
                  <div className="flex justify-center">
                    <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="py-12 text-center">
                  {emptyState || (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        Nu există date
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Nu am găsit nicio înregistrare.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const key = keyExtractor(item);
                const isSelected = selectedKeys.includes(key);
                const isHovered = hoveredRow === key;
                const actions = rowActions?.(item);

                return (
                  <tr
                    key={key}
                    onMouseEnter={() => setHoveredRow(key)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onRowClick?.(item)}
                    className={`
                      transition-colors
                      ${isSelected ? 'bg-primary/10' : ''}
                      ${striped && index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                      hover:bg-gray-50 dark:hover:bg-gray-800/50
                    `}
                  >
                    {selectable && (
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`py-3 px-4 text-gray-900 dark:text-white text-${column.align || 'left'}`}
                      >
                        {column.render
                          ? column.render(item, index)
                          : (item as Record<string, unknown>)[column.key] as ReactNode}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="py-3 px-4 relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenActionsRow(openActionsRow === key ? null : key)}
                          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <MoreHorizontal className="w-5 h-5 text-gray-500" />
                        </button>
                        <AnimatePresence>
                          {openActionsRow === key && actions && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenActionsRow(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-full mt-1 z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
                              >
                                {actions.map((action, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      action.onClick();
                                      setOpenActionsRow(null);
                                    }}
                                    className={`
                                      w-full flex items-center gap-2 px-4 py-2 text-sm
                                      ${action.variant === 'danger'
                                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                      }
                                    `}
                                  >
                                    {action.icon}
                                    {action.label}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Table Toolbar
interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  selectedCount?: number;
  onClearSelection?: () => void;
  bulkActions?: ReactNode;
  className?: string;
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Caută...',
  filters,
  actions,
  selectedCount,
  onClearSelection,
  bulkActions,
  className = '',
}: TableToolbarProps) {
  return (
    <div className={`flex items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center gap-4 flex-1">
        {selectedCount && selectedCount > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedCount} selectat{selectedCount > 1 ? 'e' : ''}
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Anulează selecția
            </button>
            {bulkActions}
          </div>
        ) : (
          <>
            {onSearchChange && (
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            )}
            {filters}
          </>
        )}
      </div>
      {actions}
    </div>
  );
}

// Column Visibility Toggle
interface ColumnToggleProps {
  columns: { key: string; label: string }[];
  visibleColumns: string[];
  onToggle: (columnKey: string) => void;
  className?: string;
}

export function ColumnToggle({
  columns,
  visibleColumns,
  onToggle,
  className = '',
}: ColumnToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <Eye className="w-4 h-4" />
        Coloane
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2"
            >
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => onToggle(column.key)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{column.label}</span>
                </label>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Expandable Row
interface ExpandableRowProps {
  children: ReactNode;
  expandedContent: ReactNode;
  colSpan: number;
  defaultExpanded?: boolean;
}

export function ExpandableRow({
  children,
  expandedContent,
  colSpan,
  defaultExpanded = false,
}: ExpandableRowProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <>
      <tr
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        {children}
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <td colSpan={colSpan} className="bg-gray-50 dark:bg-gray-800/50 p-4">
              {expandedContent}
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

// Inline Editable Cell
interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'number';
  className?: string;
}

export function EditableCell({
  value,
  onSave,
  type = 'text',
  className = '',
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          autoFocus
          className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded focus:ring-2 focus:ring-primary/20 focus:border-primary"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <button
          onClick={handleSave}
          className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 cursor-pointer ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <span>{value}</span>
      <Edit className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// Status Badge for Tables
interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  label: string;
  className?: string;
}

const statusStyles = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${statusStyles[status]}
        ${className}
      `}
    >
      {label}
    </span>
  );
}

// Currency Cell
interface CurrencyCellProps {
  value: number;
  currency?: string;
  locale?: string;
  className?: string;
}

export function CurrencyCell({
  value,
  currency = 'RON',
  locale = 'ro-RO',
  className = '',
}: CurrencyCellProps) {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);

  return (
    <span className={`font-medium ${value < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'} ${className}`}>
      {formatted}
    </span>
  );
}

// Date Cell
interface DateCellProps {
  date: Date | string;
  format?: 'short' | 'medium' | 'long' | 'relative';
  locale?: string;
  className?: string;
}

export function DateCell({
  date,
  format = 'short',
  locale = 'ro-RO',
  className = '',
}: DateCellProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const getFormatted = () => {
    if (format === 'relative') {
      const now = new Date();
      const diff = now.getTime() - dateObj.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) return 'Astăzi';
      if (days === 1) return 'Ieri';
      if (days < 7) return `Acum ${days} zile`;
      return dateObj.toLocaleDateString(locale);
    }

    const options: Intl.DateTimeFormatOptions =
      format === 'short'
        ? { day: '2-digit', month: '2-digit', year: 'numeric' }
        : format === 'medium'
          ? { day: 'numeric', month: 'short', year: 'numeric' }
          : { day: 'numeric', month: 'long', year: 'numeric' };

    return dateObj.toLocaleDateString(locale, options);
  };

  return (
    <span className={`text-gray-600 dark:text-gray-400 ${className}`}>
      {getFormatted()}
    </span>
  );
}

// User Cell (with avatar)
interface UserCellProps {
  name: string;
  email?: string;
  avatar?: string;
  className?: string;
}

export function UserCell({ name, email, avatar, className = '' }: UserCellProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {avatar ? (
        <img src={avatar} alt={name} className="w-8 h-8 rounded-full" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{name}</p>
        {email && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{email}</p>
        )}
      </div>
    </div>
  );
}
