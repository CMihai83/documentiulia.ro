'use client';

import * as React from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface KanbanItem {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: string;
  labels?: string[];
  [key: string]: unknown;
}

export interface KanbanColumn {
  id: string;
  title: string;
  items: KanbanItem[];
  color?: string;
  limit?: number;
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  onColumnReorder?: (columns: KanbanColumn[]) => void;
  onItemMove?: (itemId: string, sourceColumn: string, targetColumn: string, targetIndex: number) => void;
  onItemClick?: (item: KanbanItem, columnId: string) => void;
  onAddItem?: (columnId: string) => void;
  onAddColumn?: () => void;
  renderItem?: (item: KanbanItem, columnId: string) => React.ReactNode;
  columnClassName?: string;
  itemClassName?: string;
  className?: string;
  editable?: boolean;
}

// ============================================================================
// Priority Badge Component
// ============================================================================

const priorityColors: Record<NonNullable<KanbanItem['priority']>, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const priorityLabels: Record<NonNullable<KanbanItem['priority']>, string> = {
  low: 'Scăzută',
  medium: 'Medie',
  high: 'Ridicată',
  urgent: 'Urgentă',
};

function PriorityBadge({ priority }: { priority: NonNullable<KanbanItem['priority']> }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        priorityColors[priority]
      )}
    >
      {priorityLabels[priority]}
    </span>
  );
}

// ============================================================================
// Kanban Card Component
// ============================================================================

interface KanbanCardProps {
  item: KanbanItem;
  columnId: string;
  onClick?: (item: KanbanItem, columnId: string) => void;
  className?: string;
  isDragging?: boolean;
}

export function KanbanCard({
  item,
  columnId,
  onClick,
  className,
  isDragging = false,
}: KanbanCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(item, columnId)}
      className={cn(
        'p-3 bg-card rounded-lg border shadow-sm cursor-pointer',
        'hover:shadow-md transition-shadow',
        isDragging && 'shadow-lg ring-2 ring-primary',
        className
      )}
    >
      <h4 className="font-medium text-sm mb-1 line-clamp-2">{item.title}</h4>

      {item.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        {item.labels?.map((label) => (
          <span
            key={label}
            className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {item.priority && <PriorityBadge priority={item.priority} />}
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          {item.dueDate && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(item.dueDate).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
            </span>
          )}

          {item.assignee && (
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-medium">
              {item.assignee.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Kanban Column Component
// ============================================================================

interface KanbanColumnProps {
  column: KanbanColumn;
  onItemClick?: (item: KanbanItem, columnId: string) => void;
  onAddItem?: (columnId: string) => void;
  renderItem?: (item: KanbanItem, columnId: string) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  editable?: boolean;
}

export function KanbanColumn({
  column,
  onItemClick,
  onAddItem,
  renderItem,
  className,
  itemClassName,
  editable = true,
}: KanbanColumnProps) {
  const isOverLimit = column.limit ? column.items.length >= column.limit : false;

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] bg-muted/50 rounded-lg',
        className
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          {column.color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
          )}
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              isOverLimit
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {column.items.length}
            {column.limit && `/${column.limit}`}
          </span>
        </div>

        {editable && onAddItem && (
          <button
            onClick={() => onAddItem(column.id)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Adaugă element"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Column Items */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        <AnimatePresence mode="popLayout">
          {column.items.map((item) =>
            renderItem ? (
              <div key={item.id}>{renderItem(item, column.id)}</div>
            ) : (
              <KanbanCard
                key={item.id}
                item={item}
                columnId={column.id}
                onClick={onItemClick}
                className={itemClassName}
              />
            )
          )}
        </AnimatePresence>

        {column.items.length === 0 && (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            Niciun element
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Kanban Board Component
// ============================================================================

export function KanbanBoard({
  columns,
  onColumnReorder,
  onItemMove,
  onItemClick,
  onAddItem,
  onAddColumn,
  renderItem,
  columnClassName,
  itemClassName,
  className,
  editable = true,
}: KanbanBoardProps) {
  const [draggedItem, setDraggedItem] = React.useState<{
    item: KanbanItem;
    sourceColumn: string;
  } | null>(null);

  const handleDragStart = (item: KanbanItem, columnId: string) => {
    setDraggedItem({ item, sourceColumn: columnId });
  };

  const handleDrop = (targetColumn: string, targetIndex: number) => {
    if (draggedItem && onItemMove) {
      onItemMove(
        draggedItem.item.id,
        draggedItem.sourceColumn,
        targetColumn,
        targetIndex
      );
    }
    setDraggedItem(null);
  };

  return (
    <div className={cn('flex gap-4 overflow-x-auto p-4', className)}>
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          onItemClick={onItemClick}
          onAddItem={onAddItem}
          renderItem={renderItem}
          className={columnClassName}
          itemClassName={itemClassName}
          editable={editable}
        />
      ))}

      {editable && onAddColumn && (
        <button
          onClick={onAddColumn}
          className={cn(
            'min-w-[280px] h-fit p-4 border-2 border-dashed rounded-lg',
            'flex items-center justify-center gap-2',
            'text-muted-foreground hover:text-foreground hover:border-foreground',
            'transition-colors'
          )}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adaugă coloană
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Kanban
// ============================================================================

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface InvoiceKanbanItem extends KanbanItem {
  invoiceNumber: string;
  client: string;
  amount: number;
  status: InvoiceStatus;
}

interface InvoiceKanbanProps {
  invoices: InvoiceKanbanItem[];
  onInvoiceClick?: (invoice: InvoiceKanbanItem) => void;
  onStatusChange?: (invoiceId: string, newStatus: InvoiceStatus) => void;
  className?: string;
}

const invoiceStatusConfig: Record<InvoiceStatus, { title: string; color: string }> = {
  draft: { title: 'Ciorne', color: '#6b7280' },
  sent: { title: 'Trimise', color: '#3b82f6' },
  paid: { title: 'Plătite', color: '#22c55e' },
  overdue: { title: 'Restante', color: '#ef4444' },
  cancelled: { title: 'Anulate', color: '#9ca3af' },
};

export function InvoiceKanban({
  invoices,
  onInvoiceClick,
  onStatusChange,
  className,
}: InvoiceKanbanProps) {
  const columns: KanbanColumn[] = React.useMemo(() => {
    const statusOrder: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

    return statusOrder.map((status) => ({
      id: status,
      title: invoiceStatusConfig[status].title,
      color: invoiceStatusConfig[status].color,
      items: invoices
        .filter((inv) => inv.status === status)
        .map((inv) => ({
          id: inv.id,
          title: inv.invoiceNumber,
          description: inv.client,
          dueDate: inv.dueDate,
          priority: inv.status === 'overdue' ? 'urgent' as const : undefined,
          amount: inv.amount,
          status: inv.status,
        })),
    }));
  }, [invoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
    }).format(amount);
  };

  const renderInvoiceCard = (item: KanbanItem, columnId: string) => {
    const invoice = invoices.find((inv) => inv.id === item.id);
    if (!invoice) return null;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => onInvoiceClick?.(invoice)}
        className="p-3 bg-card rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-sm">{invoice.invoiceNumber}</h4>
          <span className="text-sm font-medium text-primary">
            {formatCurrency(invoice.amount)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-2 truncate">{invoice.client}</p>

        {invoice.dueDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Scadență: {new Date(invoice.dueDate).toLocaleDateString('ro-RO')}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <KanbanBoard
      columns={columns}
      onItemClick={(item, columnId) => {
        const invoice = invoices.find((inv) => inv.id === item.id);
        if (invoice) onInvoiceClick?.(invoice);
      }}
      onItemMove={(itemId, sourceColumn, targetColumn) => {
        if (onStatusChange && sourceColumn !== targetColumn) {
          onStatusChange(itemId, targetColumn as InvoiceStatus);
        }
      }}
      renderItem={renderInvoiceCard}
      className={className}
      editable={false}
    />
  );
}

// ============================================================================
// Accounting-Specific: Project Kanban
// ============================================================================

type ProjectStatus = 'todo' | 'in_progress' | 'review' | 'done';

interface ProjectKanbanItem extends KanbanItem {
  project: string;
  progress: number;
  status: ProjectStatus;
}

interface ProjectKanbanProps {
  tasks: ProjectKanbanItem[];
  onTaskClick?: (task: ProjectKanbanItem) => void;
  onStatusChange?: (taskId: string, newStatus: ProjectStatus) => void;
  onAddTask?: (status: ProjectStatus) => void;
  className?: string;
}

const projectStatusConfig: Record<ProjectStatus, { title: string; color: string }> = {
  todo: { title: 'De făcut', color: '#6b7280' },
  in_progress: { title: 'În lucru', color: '#3b82f6' },
  review: { title: 'Verificare', color: '#f59e0b' },
  done: { title: 'Finalizat', color: '#22c55e' },
};

export function ProjectKanban({
  tasks,
  onTaskClick,
  onStatusChange,
  onAddTask,
  className,
}: ProjectKanbanProps) {
  const columns: KanbanColumn[] = React.useMemo(() => {
    const statusOrder: ProjectStatus[] = ['todo', 'in_progress', 'review', 'done'];

    return statusOrder.map((status) => ({
      id: status,
      title: projectStatusConfig[status].title,
      color: projectStatusConfig[status].color,
      items: tasks
        .filter((task) => task.status === status)
        .map((task) => ({
          ...task,
        })),
    }));
  }, [tasks]);

  const renderTaskCard = (item: KanbanItem, columnId: string) => {
    const task = tasks.find((t) => t.id === item.id);
    if (!task) return null;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => onTaskClick?.(task)}
        className="p-3 bg-card rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <h4 className="font-medium text-sm mb-1 line-clamp-2">{task.title}</h4>

        {task.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {task.project}
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progres</span>
            <span className="font-medium">{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {task.priority && <PriorityBadge priority={task.priority} />}

          <div className="flex items-center gap-2">
            {task.dueDate && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(task.dueDate).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
              </span>
            )}

            {task.assignee && (
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-medium">
                {task.assignee.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <KanbanBoard
      columns={columns}
      onItemClick={(item, columnId) => {
        const task = tasks.find((t) => t.id === item.id);
        if (task) onTaskClick?.(task);
      }}
      onItemMove={(itemId, sourceColumn, targetColumn) => {
        if (onStatusChange && sourceColumn !== targetColumn) {
          onStatusChange(itemId, targetColumn as ProjectStatus);
        }
      }}
      onAddItem={onAddTask ? (columnId) => onAddTask(columnId as ProjectStatus) : undefined}
      renderItem={renderTaskCard}
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type KanbanCardProps,
  type KanbanColumnProps,
  type InvoiceKanbanItem,
  type InvoiceKanbanProps,
  type ProjectKanbanItem,
  type ProjectKanbanProps,
  type InvoiceStatus,
  type ProjectStatus,
};
