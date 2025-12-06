'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Constants
// ============================================================================

export type SearchInputSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<SearchInputSize, { input: string; icon: string; clear: string }> = {
  sm: { input: 'h-8 text-sm pl-8 pr-8', icon: 'w-4 h-4 left-2', clear: 'w-4 h-4 right-2' },
  md: { input: 'h-10 text-base pl-10 pr-10', icon: 'w-5 h-5 left-3', clear: 'w-5 h-5 right-3' },
  lg: { input: 'h-12 text-lg pl-12 pr-12', icon: 'w-6 h-6 left-4', clear: 'w-6 h-6 right-4' },
};

// ============================================================================
// Search Input Component
// ============================================================================

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  size?: SearchInputSize;
  loading?: boolean;
  showClearButton?: boolean;
  debounceMs?: number;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue = '',
      onChange,
      onSearch,
      onClear,
      size = 'md',
      loading = false,
      showClearButton = true,
      debounceMs = 300,
      disabled,
      placeholder = 'Cauta...',
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const debounceRef = React.useRef<NodeJS.Timeout>();

    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);

      // Debounced search
      if (onSearch && debounceMs > 0) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          onSearch(newValue);
        }, debounceMs);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && onSearch) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        onSearch(currentValue);
      }
      if (e.key === 'Escape') {
        handleClear();
      }
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue('');
      }
      onChange?.('');
      onClear?.();
      inputRef.current?.focus();
    };

    React.useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, []);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    return (
      <div className={cn('relative', className)}>
        {/* Search Icon */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none',
            sizeClasses[size].icon
          )}
        >
          {loading ? (
            <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="search"
          value={currentValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-md border border-input bg-background transition-colors',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            sizeClasses[size].input,
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...props}
        />

        {/* Clear Button */}
        <AnimatePresence>
          {showClearButton && currentValue && !loading && (
            <motion.button
              type="button"
              onClick={handleClear}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors',
                'focus:outline-none',
                sizeClasses[size].clear
              )}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

// ============================================================================
// Search with Suggestions
// ============================================================================

interface SearchSuggestion {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  category?: string;
}

interface SearchWithSuggestionsProps extends Omit<SearchInputProps, 'onSearch' | 'onSelect'> {
  suggestions?: SearchSuggestion[];
  onSelect?: (suggestion: SearchSuggestion) => void;
  onSearch?: (value: string) => void;
  renderSuggestion?: (suggestion: SearchSuggestion) => React.ReactNode;
  emptyMessage?: string;
  maxSuggestions?: number;
}

export function SearchWithSuggestions({
  suggestions = [],
  onSelect,
  onSearch,
  renderSuggestion,
  emptyMessage = 'Niciun rezultat gasit',
  maxSuggestions = 10,
  value,
  onChange,
  ...props
}: SearchWithSuggestionsProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const displayedSuggestions = suggestions.slice(0, maxSuggestions);

  const handleSelect = (suggestion: SearchSuggestion) => {
    onSelect?.(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < displayedSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : displayedSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && displayedSuggestions[highlightedIndex]) {
          handleSelect(displayedSuggestions[highlightedIndex]);
        } else if (value) {
          onSearch?.(value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open suggestions when value changes
  React.useEffect(() => {
    if (value && suggestions.length > 0) {
      setIsOpen(true);
    }
  }, [value, suggestions.length]);

  return (
    <div ref={containerRef} className="relative">
      <SearchInput
        value={value}
        onChange={(val) => {
          onChange?.(val);
          if (val) setIsOpen(true);
        }}
        onSearch={onSearch}
        onKeyDown={handleKeyDown}
        {...props}
      />

      <AnimatePresence>
        {isOpen && value && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg"
          >
            {displayedSuggestions.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto py-1">
                {displayedSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSelect(suggestion)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                      'hover:bg-muted focus:bg-muted focus:outline-none',
                      highlightedIndex === index && 'bg-muted'
                    )}
                  >
                    {renderSuggestion ? (
                      renderSuggestion(suggestion)
                    ) : (
                      <>
                        {suggestion.icon && (
                          <span className="text-muted-foreground">{suggestion.icon}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{suggestion.label}</div>
                          {suggestion.description && (
                            <div className="truncate text-sm text-muted-foreground">
                              {suggestion.description}
                            </div>
                          )}
                        </div>
                        {suggestion.category && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {suggestion.category}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Global Search (Command Palette Style)
// ============================================================================

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (value: string) => void;
  suggestions?: SearchSuggestion[];
  onSelect?: (suggestion: SearchSuggestion) => void;
  recentSearches?: string[];
  onClearRecent?: () => void;
}

export function GlobalSearch({
  isOpen,
  onClose,
  onSearch,
  suggestions = [],
  onSelect,
  recentSearches = [],
  onClearRecent,
}: GlobalSearchProps) {
  const [searchValue, setSearchValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setSearchValue('');
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="relative flex items-start justify-center pt-[20vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl mx-4 rounded-lg border border-border bg-background shadow-2xl"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border p-4">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                onSearch?.(e.target.value);
              }}
              placeholder="Cauta facturi, clienti, produse..."
              className="flex-1 bg-transparent text-lg focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border bg-muted px-2 text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {searchValue ? (
              suggestions.length > 0 ? (
                <div className="py-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => {
                        onSelect?.(suggestion);
                        onClose();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
                    >
                      {suggestion.icon && (
                        <span className="text-muted-foreground">{suggestion.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{suggestion.label}</div>
                        {suggestion.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {suggestion.description}
                          </div>
                        )}
                      </div>
                      {suggestion.category && (
                        <span className="text-xs text-muted-foreground">
                          {suggestion.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <svg className="mx-auto w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p>Niciun rezultat pentru &quot;{searchValue}&quot;</p>
                </div>
              )
            ) : recentSearches.length > 0 ? (
              <div className="py-2">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Cautari recente
                  </span>
                  {onClearRecent && (
                    <button
                      type="button"
                      onClick={onClearRecent}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Sterge tot
                    </button>
                  )}
                </div>
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSearchValue(search);
                      onSearch?.(search);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-muted transition-colors"
                  >
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{search}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Incepe sa scrii pentru a cauta</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border bg-muted">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded border bg-muted">↓</kbd>
                navigare
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border bg-muted">Enter</kbd>
                selecteaza
              </span>
            </div>
            <span className="hidden sm:block">Cauta oriunde cu Ctrl+K</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// Accounting-Specific Search Components
// ============================================================================

interface InvoiceSearchProps extends Omit<SearchInputProps, 'placeholder'> {}

export function InvoiceSearch(props: InvoiceSearchProps) {
  return (
    <SearchInput
      placeholder="Cauta facturi (numar, client, suma)..."
      {...props}
    />
  );
}

interface ClientSearchProps extends Omit<SearchInputProps, 'placeholder'> {}

export function ClientSearch(props: ClientSearchProps) {
  return (
    <SearchInput
      placeholder="Cauta clienti (nume, CUI, email)..."
      {...props}
    />
  );
}

interface ProductSearchProps extends Omit<SearchInputProps, 'placeholder'> {}

export function ProductSearch(props: ProductSearchProps) {
  return (
    <SearchInput
      placeholder="Cauta produse (nume, cod, categorie)..."
      {...props}
    />
  );
}

// ============================================================================
// Filter Search (with filter tags)
// ============================================================================

interface FilterTag {
  id: string;
  label: string;
  value: string;
}

interface FilterSearchProps extends Omit<SearchInputProps, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  filters?: FilterTag[];
  onRemoveFilter?: (filterId: string) => void;
  onClearFilters?: () => void;
}

export function FilterSearch({
  value = '',
  onChange,
  filters = [],
  onRemoveFilter,
  onClearFilters,
  className,
  ...props
}: FilterSearchProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <SearchInput value={value} onChange={onChange} {...props} />

      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <motion.span
              key={filter.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
            >
              <span className="text-muted-foreground">{filter.label}:</span>
              <span className="font-medium">{filter.value}</span>
              {onRemoveFilter && (
                <button
                  type="button"
                  onClick={() => onRemoveFilter(filter.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </motion.span>
          ))}

          {onClearFilters && filters.length > 1 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sterge toate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
