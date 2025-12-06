'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type FilterType = 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'numberrange' | 'boolean' | 'custom';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  defaultValue?: unknown;
  render?: (value: unknown, onChange: (value: unknown) => void) => React.ReactNode;
}

export interface FilterValue {
  [key: string]: unknown;
}

export interface FilterPanelProps {
  filters: FilterConfig[];
  values: FilterValue;
  onChange: (values: FilterValue) => void;
  onReset?: () => void;
  onApply?: () => void;
  variant?: 'inline' | 'sidebar' | 'dropdown';
  showApplyButton?: boolean;
  showResetButton?: boolean;
  className?: string;
}

// ============================================================================
// Filter Input Components
// ============================================================================

interface FilterInputProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}

function TextFilter({ filter, value, onChange }: FilterInputProps) {
  return (
    <input
      type="text"
      value={(value as string) || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={filter.placeholder || `Caută ${filter.label.toLowerCase()}...`}
      className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function SelectFilter({ filter, value, onChange }: FilterInputProps) {
  return (
    <select
      value={(value as string) || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{filter.placeholder || 'Toate'}</option>
      {filter.options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
          {option.count !== undefined && ` (${option.count})`}
        </option>
      ))}
    </select>
  );
}

function MultiSelectFilter({ filter, value, onChange }: FilterInputProps) {
  const selectedValues = (value as string[]) || [];

  const toggleValue = (optionValue: string) => {
    if (selectedValues.includes(optionValue)) {
      onChange(selectedValues.filter((v) => v !== optionValue));
    } else {
      onChange([...selectedValues, optionValue]);
    }
  };

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {filter.options?.map((option) => (
        <label
          key={option.value}
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selectedValues.includes(option.value)}
            onChange={() => toggleValue(option.value)}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm flex-1">{option.label}</span>
          {option.count !== undefined && (
            <span className="text-xs text-muted-foreground">{option.count}</span>
          )}
        </label>
      ))}
    </div>
  );
}

function DateFilter({ filter, value, onChange }: FilterInputProps) {
  return (
    <input
      type="date"
      value={(value as string) || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function DateRangeFilter({ filter, value, onChange }: FilterInputProps) {
  const range = (value as { start?: string; end?: string }) || {};

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-muted-foreground">De la</label>
        <input
          type="date"
          value={range.start || ''}
          onChange={(e) => onChange({ ...range, start: e.target.value || undefined })}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Până la</label>
        <input
          type="date"
          value={range.end || ''}
          onChange={(e) => onChange({ ...range, end: e.target.value || undefined })}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}

function NumberFilter({ filter, value, onChange }: FilterInputProps) {
  return (
    <input
      type="number"
      value={(value as number) ?? ''}
      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
      placeholder={filter.placeholder}
      min={filter.min}
      max={filter.max}
      className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function NumberRangeFilter({ filter, value, onChange }: FilterInputProps) {
  const range = (value as { min?: number; max?: number }) || {};

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={range.min ?? ''}
        onChange={(e) => onChange({ ...range, min: e.target.value ? parseFloat(e.target.value) : undefined })}
        placeholder="Min"
        min={filter.min}
        max={filter.max}
        className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <span className="text-muted-foreground">-</span>
      <input
        type="number"
        value={range.max ?? ''}
        onChange={(e) => onChange({ ...range, max: e.target.value ? parseFloat(e.target.value) : undefined })}
        placeholder="Max"
        min={filter.min}
        max={filter.max}
        className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function BooleanFilter({ filter, value, onChange }: FilterInputProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={filter.id}
          checked={value === true}
          onChange={() => onChange(true)}
          className="w-4 h-4 text-primary focus:ring-primary"
        />
        <span className="text-sm">Da</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={filter.id}
          checked={value === false}
          onChange={() => onChange(false)}
          className="w-4 h-4 text-primary focus:ring-primary"
        />
        <span className="text-sm">Nu</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={filter.id}
          checked={value === null || value === undefined}
          onChange={() => onChange(null)}
          className="w-4 h-4 text-primary focus:ring-primary"
        />
        <span className="text-sm">Toate</span>
      </label>
    </div>
  );
}

function FilterInput({ filter, value, onChange }: FilterInputProps) {
  switch (filter.type) {
    case 'text':
      return <TextFilter filter={filter} value={value} onChange={onChange} />;
    case 'select':
      return <SelectFilter filter={filter} value={value} onChange={onChange} />;
    case 'multiselect':
      return <MultiSelectFilter filter={filter} value={value} onChange={onChange} />;
    case 'date':
      return <DateFilter filter={filter} value={value} onChange={onChange} />;
    case 'daterange':
      return <DateRangeFilter filter={filter} value={value} onChange={onChange} />;
    case 'number':
      return <NumberFilter filter={filter} value={value} onChange={onChange} />;
    case 'numberrange':
      return <NumberRangeFilter filter={filter} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanFilter filter={filter} value={value} onChange={onChange} />;
    case 'custom':
      return filter.render ? <>{filter.render(value, onChange)}</> : null;
    default:
      return null;
  }
}

// ============================================================================
// Main Filter Panel Component
// ============================================================================

export function FilterPanel({
  filters,
  values,
  onChange,
  onReset,
  onApply,
  variant = 'inline',
  showApplyButton = false,
  showResetButton = true,
  className,
}: FilterPanelProps) {
  const activeFilterCount = Object.values(values).filter(
    (v) => v !== null && v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const handleFilterChange = (filterId: string, value: unknown) => {
    onChange({ ...values, [filterId]: value });
  };

  const handleReset = () => {
    const resetValues: FilterValue = {};
    filters.forEach((f) => {
      resetValues[f.id] = f.defaultValue ?? null;
    });
    onChange(resetValues);
    onReset?.();
  };

  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-wrap items-center gap-4', className)}>
        {filters.map((filter) => (
          <div key={filter.id} className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              {filter.label}:
            </label>
            <div className="min-w-[150px]">
              <FilterInput
                filter={filter}
                value={values[filter.id]}
                onChange={(value) => handleFilterChange(filter.id, value)}
              />
            </div>
          </div>
        ))}

        {(showResetButton || showApplyButton) && (
          <div className="flex items-center gap-2 ml-auto">
            {showResetButton && activeFilterCount > 0 && (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Resetează
              </button>
            )}
            {showApplyButton && (
              <button
                onClick={onApply}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Aplică
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={cn('w-64 p-4 border-r bg-card', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Filtre</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {filters.map((filter) => (
            <div key={filter.id}>
              <label className="block text-sm font-medium mb-1.5">{filter.label}</label>
              <FilterInput
                filter={filter}
                value={values[filter.id]}
                onChange={(value) => handleFilterChange(filter.id, value)}
              />
            </div>
          ))}
        </div>

        {(showResetButton || showApplyButton) && (
          <div className="flex flex-col gap-2 mt-6 pt-4 border-t">
            {showApplyButton && (
              <button
                onClick={onApply}
                className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Aplică filtrele
              </button>
            )}
            {showResetButton && activeFilterCount > 0 && (
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Resetează filtrele
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={cn('relative', className)}>
      <DropdownFilter
        filters={filters}
        values={values}
        onChange={onChange}
        onReset={handleReset}
        onApply={onApply}
        activeCount={activeFilterCount}
        showApplyButton={showApplyButton}
        showResetButton={showResetButton}
      />
    </div>
  );
}

// ============================================================================
// Dropdown Filter Component
// ============================================================================

interface DropdownFilterProps {
  filters: FilterConfig[];
  values: FilterValue;
  onChange: (values: FilterValue) => void;
  onReset: () => void;
  onApply?: () => void;
  activeCount: number;
  showApplyButton: boolean;
  showResetButton: boolean;
}

function DropdownFilter({
  filters,
  values,
  onChange,
  onReset,
  onApply,
  activeCount,
  showApplyButton,
  showResetButton,
}: DropdownFilterProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (filterId: string, value: unknown) => {
    onChange({ ...values, [filterId]: value });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 border rounded-md transition-colors',
          open ? 'bg-muted border-primary' : 'hover:bg-muted'
        )}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="text-sm font-medium">Filtre</span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 w-80 p-4 bg-card border rounded-lg shadow-lg z-50"
          >
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {filters.map((filter) => (
                <div key={filter.id}>
                  <label className="block text-sm font-medium mb-1.5">{filter.label}</label>
                  <FilterInput
                    filter={filter}
                    value={values[filter.id]}
                    onChange={(value) => handleFilterChange(filter.id, value)}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              {showResetButton && activeCount > 0 ? (
                <button
                  onClick={onReset}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Resetează
                </button>
              ) : (
                <div />
              )}

              {showApplyButton ? (
                <button
                  onClick={() => {
                    onApply?.();
                    setOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Aplică
                </button>
              ) : (
                <button
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Închide
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Accounting-Specific: Invoice Filter Panel
// ============================================================================

export interface InvoiceFilterPanelProps {
  values: FilterValue;
  onChange: (values: FilterValue) => void;
  onApply?: () => void;
  variant?: 'inline' | 'sidebar' | 'dropdown';
  className?: string;
}

export function InvoiceFilterPanel({
  values,
  onChange,
  onApply,
  variant = 'dropdown',
  className,
}: InvoiceFilterPanelProps) {
  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      type: 'multiselect',
      options: [
        { value: 'draft', label: 'Ciornă' },
        { value: 'sent', label: 'Trimisă' },
        { value: 'paid', label: 'Plătită' },
        { value: 'overdue', label: 'Restantă' },
        { value: 'cancelled', label: 'Anulată' },
      ],
    },
    {
      id: 'dateRange',
      label: 'Perioadă',
      type: 'daterange',
    },
    {
      id: 'amountRange',
      label: 'Sumă (RON)',
      type: 'numberrange',
      min: 0,
    },
    {
      id: 'client',
      label: 'Client',
      type: 'text',
      placeholder: 'Caută client...',
    },
  ];

  return (
    <FilterPanel
      filters={filters}
      values={values}
      onChange={onChange}
      onApply={onApply}
      variant={variant}
      showApplyButton={variant !== 'inline'}
      className={className}
    />
  );
}

// ============================================================================
// Accounting-Specific: Expense Filter Panel
// ============================================================================

export interface ExpenseFilterPanelProps {
  values: FilterValue;
  onChange: (values: FilterValue) => void;
  categories?: FilterOption[];
  onApply?: () => void;
  variant?: 'inline' | 'sidebar' | 'dropdown';
  className?: string;
}

export function ExpenseFilterPanel({
  values,
  onChange,
  categories = [],
  onApply,
  variant = 'dropdown',
  className,
}: ExpenseFilterPanelProps) {
  const filters: FilterConfig[] = [
    {
      id: 'category',
      label: 'Categorie',
      type: 'multiselect',
      options: categories,
    },
    {
      id: 'dateRange',
      label: 'Perioadă',
      type: 'daterange',
    },
    {
      id: 'amountRange',
      label: 'Sumă (RON)',
      type: 'numberrange',
      min: 0,
    },
    {
      id: 'deductible',
      label: 'Deductibil',
      type: 'boolean',
    },
  ];

  return (
    <FilterPanel
      filters={filters}
      values={values}
      onChange={onChange}
      onApply={onApply}
      variant={variant}
      showApplyButton={variant !== 'inline'}
      className={className}
    />
  );
}

// ============================================================================
// Active Filters Display
// ============================================================================

export interface ActiveFiltersProps {
  filters: FilterConfig[];
  values: FilterValue;
  onRemove: (filterId: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilters({
  filters,
  values,
  onRemove,
  onClearAll,
  className,
}: ActiveFiltersProps) {
  const activeFilters = filters.filter((filter) => {
    const value = values[filter.id];
    return value !== null && value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true);
  });

  if (activeFilters.length === 0) return null;

  const getFilterLabel = (filter: FilterConfig, value: unknown): string => {
    if (filter.type === 'select' || filter.type === 'multiselect') {
      const selectedValues = Array.isArray(value) ? value : [value];
      return selectedValues
        .map((v) => filter.options?.find((o) => o.value === v)?.label || v)
        .join(', ');
    }
    if (filter.type === 'daterange') {
      const range = value as { start?: string; end?: string };
      const parts = [];
      if (range.start) parts.push(`de la ${range.start}`);
      if (range.end) parts.push(`până la ${range.end}`);
      return parts.join(' ');
    }
    if (filter.type === 'numberrange') {
      const range = value as { min?: number; max?: number };
      const parts = [];
      if (range.min !== undefined) parts.push(`min ${range.min}`);
      if (range.max !== undefined) parts.push(`max ${range.max}`);
      return parts.join(' - ');
    }
    if (filter.type === 'boolean') {
      return value ? 'Da' : 'Nu';
    }
    return String(value);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">Filtre active:</span>

      {activeFilters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
        >
          {filter.label}: {getFilterLabel(filter, values[filter.id])}
          <button
            onClick={() => onRemove(filter.id)}
            className="ml-1 hover:text-primary/70"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}

      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Șterge toate
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  type FilterInputProps,
  type DropdownFilterProps,
  type ActiveFiltersProps as ActiveFiltersDisplayProps,
};
