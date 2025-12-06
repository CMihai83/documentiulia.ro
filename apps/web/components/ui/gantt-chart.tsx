'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress?: number;
  color?: string;
  dependencies?: string[];
  assignee?: string;
  group?: string;
  [key: string]: unknown;
}

export interface GanttGroup {
  id: string;
  title: string;
  collapsed?: boolean;
}

export type GanttViewMode = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface GanttChartProps {
  tasks: GanttTask[];
  groups?: GanttGroup[];
  startDate?: Date;
  endDate?: Date;
  viewMode?: GanttViewMode;
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<GanttTask>) => void;
  onGroupToggle?: (groupId: string) => void;
  rowHeight?: number;
  headerHeight?: number;
  showProgress?: boolean;
  showDependencies?: boolean;
  className?: string;
  todayLineColor?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getDateRange = (tasks: GanttTask[], startDate?: Date, endDate?: Date) => {
  if (startDate && endDate) {
    return { start: startDate, end: endDate };
  }

  let minDate = new Date();
  let maxDate = new Date();

  tasks.forEach((task) => {
    if (task.startDate < minDate) minDate = task.startDate;
    if (task.endDate > maxDate) maxDate = task.endDate;
  });

  // Add padding
  minDate = new Date(minDate);
  minDate.setDate(minDate.getDate() - 7);
  maxDate = new Date(maxDate);
  maxDate.setDate(maxDate.getDate() + 7);

  return { start: startDate || minDate, end: endDate || maxDate };
};

const getDaysBetween = (start: Date, end: Date) => {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getColumnWidth = (viewMode: GanttViewMode) => {
  switch (viewMode) {
    case 'day': return 40;
    case 'week': return 100;
    case 'month': return 150;
    case 'quarter': return 200;
    case 'year': return 300;
    default: return 40;
  }
};

const formatHeaderDate = (date: Date, viewMode: GanttViewMode) => {
  const options: Intl.DateTimeFormatOptions = {};

  switch (viewMode) {
    case 'day':
      return date.getDate().toString();
    case 'week':
      return `S${Math.ceil(date.getDate() / 7)}`;
    case 'month':
      options.month = 'short';
      return new Intl.DateTimeFormat('ro-RO', options).format(date);
    case 'quarter':
      return `T${Math.ceil((date.getMonth() + 1) / 3)}`;
    case 'year':
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString('ro-RO');
  }
};

const getTimeUnits = (start: Date, end: Date, viewMode: GanttViewMode) => {
  const units: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    units.push(new Date(current));

    switch (viewMode) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'quarter':
        current.setMonth(current.getMonth() + 3);
        break;
      case 'year':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
  }

  return units;
};

// ============================================================================
// Gantt Header Component
// ============================================================================

interface GanttHeaderProps {
  timeUnits: Date[];
  viewMode: GanttViewMode;
  columnWidth: number;
  headerHeight: number;
}

function GanttHeader({ timeUnits, viewMode, columnWidth, headerHeight }: GanttHeaderProps) {
  return (
    <div
      className="flex border-b bg-muted/50 sticky top-0 z-10"
      style={{ height: headerHeight }}
    >
      {timeUnits.map((date, index) => (
        <div
          key={index}
          className="flex items-center justify-center border-r text-xs font-medium text-muted-foreground shrink-0"
          style={{ width: columnWidth }}
        >
          {formatHeaderDate(date, viewMode)}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Gantt Task Bar Component
// ============================================================================

interface GanttTaskBarProps {
  task: GanttTask;
  dateRange: { start: Date; end: Date };
  totalDays: number;
  columnWidth: number;
  rowHeight: number;
  showProgress: boolean;
  onClick?: (task: GanttTask) => void;
}

function GanttTaskBar({
  task,
  dateRange,
  totalDays,
  columnWidth,
  rowHeight,
  showProgress,
  onClick,
}: GanttTaskBarProps) {
  const taskStart = Math.max(0, getDaysBetween(dateRange.start, task.startDate));
  const taskDuration = getDaysBetween(task.startDate, task.endDate) + 1;
  const dayWidth = columnWidth;

  const left = taskStart * dayWidth;
  const width = taskDuration * dayWidth;

  const defaultColor = '#3b82f6';
  const taskColor = task.color || defaultColor;

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      className={cn(
        'absolute rounded-md cursor-pointer overflow-hidden',
        'hover:ring-2 hover:ring-ring transition-shadow'
      )}
      style={{
        left,
        width,
        top: (rowHeight - 28) / 2,
        height: 28,
        backgroundColor: taskColor,
        transformOrigin: 'left',
      }}
      onClick={() => onClick?.(task)}
    >
      {/* Progress overlay */}
      {showProgress && task.progress !== undefined && (
        <div
          className="absolute inset-y-0 left-0 bg-black/20"
          style={{ width: `${100 - task.progress}%`, right: 0, left: 'auto' }}
        />
      )}

      {/* Task label */}
      <div className="px-2 py-1 text-xs font-medium text-white truncate">
        {task.title}
        {showProgress && task.progress !== undefined && (
          <span className="ml-1 opacity-80">({task.progress}%)</span>
        )}
      </div>

      {/* Assignee avatar */}
      {task.assignee && (
        <div
          className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold text-white"
        >
          {task.assignee.charAt(0).toUpperCase()}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Gantt Row Component
// ============================================================================

interface GanttRowProps {
  task: GanttTask;
  dateRange: { start: Date; end: Date };
  totalDays: number;
  columnWidth: number;
  rowHeight: number;
  showProgress: boolean;
  onClick?: (task: GanttTask) => void;
  timeUnits: Date[];
}

function GanttRow({
  task,
  dateRange,
  totalDays,
  columnWidth,
  rowHeight,
  showProgress,
  onClick,
  timeUnits,
}: GanttRowProps) {
  return (
    <div
      className="relative border-b hover:bg-muted/30 transition-colors"
      style={{ height: rowHeight }}
    >
      {/* Grid lines */}
      <div className="absolute inset-0 flex">
        {timeUnits.map((_, index) => (
          <div
            key={index}
            className="border-r border-border/50 shrink-0"
            style={{ width: columnWidth }}
          />
        ))}
      </div>

      {/* Task bar */}
      <GanttTaskBar
        task={task}
        dateRange={dateRange}
        totalDays={totalDays}
        columnWidth={columnWidth}
        rowHeight={rowHeight}
        showProgress={showProgress}
        onClick={onClick}
      />
    </div>
  );
}

// ============================================================================
// Gantt Sidebar Component
// ============================================================================

interface GanttSidebarProps {
  tasks: GanttTask[];
  groups?: GanttGroup[];
  rowHeight: number;
  headerHeight: number;
  onTaskClick?: (task: GanttTask) => void;
  onGroupToggle?: (groupId: string) => void;
}

function GanttSidebar({
  tasks,
  groups,
  rowHeight,
  headerHeight,
  onTaskClick,
  onGroupToggle,
}: GanttSidebarProps) {
  const groupedTasks = React.useMemo(() => {
    if (!groups) return { ungrouped: tasks };

    const result: Record<string, GanttTask[]> = {};
    groups.forEach((g) => (result[g.id] = []));
    result.ungrouped = [];

    tasks.forEach((task) => {
      if (task.group && result[task.group]) {
        result[task.group].push(task);
      } else {
        result.ungrouped.push(task);
      }
    });

    return result;
  }, [tasks, groups]);

  return (
    <div className="w-64 border-r bg-background shrink-0">
      {/* Header */}
      <div
        className="flex items-center px-4 border-b bg-muted/50 font-medium text-sm"
        style={{ height: headerHeight }}
      >
        Activități
      </div>

      {/* Task list */}
      <div className="overflow-y-auto">
        {groups?.map((group) => (
          <React.Fragment key={group.id}>
            {/* Group header */}
            <button
              onClick={() => onGroupToggle?.(group.id)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <svg
                className={cn(
                  'w-4 h-4 transition-transform',
                  group.collapsed && '-rotate-90'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="font-medium text-sm">{group.title}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                ({groupedTasks[group.id]?.length || 0})
              </span>
            </button>

            {/* Group tasks */}
            {!group.collapsed &&
              groupedTasks[group.id]?.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="flex items-center px-4 pl-8 border-b cursor-pointer hover:bg-muted/30 transition-colors"
                  style={{ height: rowHeight }}
                >
                  <span className="text-sm truncate">{task.title}</span>
                </div>
              ))}
          </React.Fragment>
        ))}

        {/* Ungrouped tasks */}
        {groupedTasks.ungrouped?.map((task) => (
          <div
            key={task.id}
            onClick={() => onTaskClick?.(task)}
            className="flex items-center px-4 border-b cursor-pointer hover:bg-muted/30 transition-colors"
            style={{ height: rowHeight }}
          >
            <span className="text-sm truncate">{task.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Today Line Component
// ============================================================================

interface TodayLineProps {
  dateRange: { start: Date; end: Date };
  columnWidth: number;
  headerHeight: number;
  color?: string;
}

function TodayLine({ dateRange, columnWidth, headerHeight, color = '#ef4444' }: TodayLineProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < dateRange.start || today > dateRange.end) return null;

  const daysFromStart = getDaysBetween(dateRange.start, today);
  const left = daysFromStart * columnWidth + columnWidth / 2;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
      style={{ left, backgroundColor: color, top: headerHeight }}
    >
      <div
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

// ============================================================================
// Main Gantt Chart Component
// ============================================================================

export function GanttChart({
  tasks,
  groups,
  startDate,
  endDate,
  viewMode = 'day',
  onTaskClick,
  onTaskUpdate,
  onGroupToggle,
  rowHeight = 48,
  headerHeight = 48,
  showProgress = true,
  showDependencies = false,
  className,
  todayLineColor,
}: GanttChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dateRange = getDateRange(tasks, startDate, endDate);
  const totalDays = getDaysBetween(dateRange.start, dateRange.end);
  const columnWidth = getColumnWidth(viewMode);
  const timeUnits = getTimeUnits(dateRange.start, dateRange.end, viewMode);

  // Filter visible tasks based on groups
  const visibleTasks = React.useMemo(() => {
    if (!groups) return tasks;

    const collapsedGroups = new Set(
      groups.filter((g) => g.collapsed).map((g) => g.id)
    );

    return tasks.filter((task) => !task.group || !collapsedGroups.has(task.group));
  }, [tasks, groups]);

  return (
    <div className={cn('flex border rounded-lg overflow-hidden bg-background', className)}>
      {/* Sidebar */}
      <GanttSidebar
        tasks={visibleTasks}
        groups={groups}
        rowHeight={rowHeight}
        headerHeight={headerHeight}
        onTaskClick={onTaskClick}
        onGroupToggle={onGroupToggle}
      />

      {/* Main chart area */}
      <div ref={containerRef} className="flex-1 overflow-auto relative">
        {/* Header */}
        <GanttHeader
          timeUnits={timeUnits}
          viewMode={viewMode}
          columnWidth={columnWidth}
          headerHeight={headerHeight}
        />

        {/* Task rows */}
        <div className="relative">
          {visibleTasks.map((task) => (
            <GanttRow
              key={task.id}
              task={task}
              dateRange={dateRange}
              totalDays={totalDays}
              columnWidth={columnWidth}
              rowHeight={rowHeight}
              showProgress={showProgress}
              onClick={onTaskClick}
              timeUnits={timeUnits}
            />
          ))}
        </div>

        {/* Today line */}
        <TodayLine
          dateRange={dateRange}
          columnWidth={columnWidth}
          headerHeight={headerHeight}
          color={todayLineColor}
        />
      </div>
    </div>
  );
}

// ============================================================================
// View Mode Selector Component
// ============================================================================

interface GanttViewSelectorProps {
  value: GanttViewMode;
  onChange: (mode: GanttViewMode) => void;
  className?: string;
}

const viewModeLabels: Record<GanttViewMode, string> = {
  day: 'Zi',
  week: 'Săptămână',
  month: 'Lună',
  quarter: 'Trimestru',
  year: 'An',
};

export function GanttViewSelector({ value, onChange, className }: GanttViewSelectorProps) {
  const modes: GanttViewMode[] = ['day', 'week', 'month', 'quarter', 'year'];

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-muted rounded-lg', className)}>
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            value === mode
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {viewModeLabels[mode]}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Project Timeline
// ============================================================================

interface ProjectTimelineProps {
  projects: Array<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    progress: number;
    status: 'active' | 'completed' | 'delayed' | 'planned';
    client?: string;
    budget?: number;
  }>;
  onProjectClick?: (projectId: string) => void;
  className?: string;
}

const projectStatusColors: Record<string, string> = {
  active: '#3b82f6',
  completed: '#22c55e',
  delayed: '#ef4444',
  planned: '#6b7280',
};

export function ProjectTimeline({
  projects,
  onProjectClick,
  className,
}: ProjectTimelineProps) {
  const [viewMode, setViewMode] = React.useState<GanttViewMode>('week');

  const tasks: GanttTask[] = projects.map((project) => ({
    id: project.id,
    title: project.name,
    startDate: project.startDate,
    endDate: project.endDate,
    progress: project.progress,
    color: projectStatusColors[project.status],
    assignee: project.client,
  }));

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cronologie Proiecte</h3>
        <GanttViewSelector value={viewMode} onChange={setViewMode} />
      </div>

      <GanttChart
        tasks={tasks}
        viewMode={viewMode}
        onTaskClick={(task) => onProjectClick?.(task.id)}
        showProgress
        rowHeight={52}
      />
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Timeline
// ============================================================================

interface InvoiceTimelineProps {
  invoices: Array<{
    id: string;
    number: string;
    issueDate: Date;
    dueDate: Date;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    client: string;
    amount: number;
  }>;
  onInvoiceClick?: (invoiceId: string) => void;
  className?: string;
}

const invoiceStatusColors: Record<string, string> = {
  draft: '#6b7280',
  sent: '#3b82f6',
  paid: '#22c55e',
  overdue: '#ef4444',
};

export function InvoiceTimeline({
  invoices,
  onInvoiceClick,
  className,
}: InvoiceTimelineProps) {
  const [viewMode, setViewMode] = React.useState<GanttViewMode>('month');

  const tasks: GanttTask[] = invoices.map((invoice) => ({
    id: invoice.id,
    title: `${invoice.number} - ${invoice.client}`,
    startDate: invoice.issueDate,
    endDate: invoice.dueDate,
    progress: invoice.status === 'paid' ? 100 : invoice.status === 'sent' ? 50 : 0,
    color: invoiceStatusColors[invoice.status],
    assignee: invoice.client,
  }));

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cronologie Facturi</h3>
        <GanttViewSelector value={viewMode} onChange={setViewMode} />
      </div>

      <GanttChart
        tasks={tasks}
        viewMode={viewMode}
        onTaskClick={(task) => onInvoiceClick?.(task.id)}
        showProgress
        rowHeight={44}
      />
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type GanttHeaderProps,
  type GanttTaskBarProps,
  type GanttRowProps,
  type GanttSidebarProps,
  type TodayLineProps,
  type GanttViewSelectorProps,
  type ProjectTimelineProps,
  type InvoiceTimelineProps,
};
