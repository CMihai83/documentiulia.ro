'use client';

import React, { createContext, useContext, useState, useRef, useEffect, forwardRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Command Context
// ============================================================================

interface CommandContextValue {
  search: string;
  setSearch: (search: string) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  filteredItems: CommandItemData[];
  registerItem: (item: CommandItemData) => void;
  unregisterItem: (id: string) => void;
}

interface CommandItemData {
  id: string;
  value: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect?: () => void;
}

const CommandContext = createContext<CommandContextValue | undefined>(undefined);

function useCommand() {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error('Command components must be used within a Command');
  }
  return context;
}

// ============================================================================
// Command
// ============================================================================

interface CommandProps {
  children: React.ReactNode;
  className?: string;
  filter?: (value: string, search: string) => number;
  shouldFilter?: boolean;
  onValueChange?: (value: string) => void;
}

export const Command = forwardRef<HTMLDivElement, CommandProps>(
  ({ children, className, filter, shouldFilter = true, onValueChange }, ref) => {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [items, setItems] = useState<CommandItemData[]>([]);

    const defaultFilter = useCallback((value: string, search: string) => {
      const searchLower = search.toLowerCase();
      const valueLower = value.toLowerCase();
      if (valueLower.includes(searchLower)) return 1;
      return 0;
    }, []);

    const filterFn = filter || defaultFilter;

    const filteredItems = shouldFilter && search
      ? items.filter(item => {
          if (item.disabled) return false;
          const matchValue = filterFn(item.value, search) > 0;
          const matchKeywords = item.keywords?.some(k => filterFn(k, search) > 0);
          return matchValue || matchKeywords;
        })
      : items.filter(item => !item.disabled);

    const registerItem = useCallback((item: CommandItemData) => {
      setItems(prev => {
        if (prev.find(i => i.id === item.id)) return prev;
        return [...prev, item];
      });
    }, []);

    const unregisterItem = useCallback((id: string) => {
      setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    useEffect(() => {
      setSelectedIndex(0);
    }, [search]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item && !item.disabled) {
          item.onSelect?.();
          onValueChange?.(item.value);
        }
      }
    };

    return (
      <CommandContext.Provider value={{ search, setSearch, selectedIndex, setSelectedIndex, filteredItems, registerItem, unregisterItem }}>
        <div
          ref={ref}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg',
            className
          )}
        >
          {children}
        </div>
      </CommandContext.Provider>
    );
  }
);

Command.displayName = 'Command';

// ============================================================================
// Command Input
// ============================================================================

interface CommandInputProps {
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export const CommandInput = forwardRef<HTMLInputElement, CommandInputProps>(
  ({ placeholder = 'Cauta...', className, icon }, ref) => {
    const { search, setSearch } = useCommand();

    return (
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-3">
        {icon || (
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
        <input
          ref={ref}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'flex-1 px-3 py-3 text-sm bg-transparent outline-none placeholder:text-gray-400',
            className
          )}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

CommandInput.displayName = 'CommandInput';

// ============================================================================
// Command List
// ============================================================================

interface CommandListProps {
  children: React.ReactNode;
  className?: string;
}

export function CommandList({ children, className }: CommandListProps) {
  return (
    <div className={cn('max-h-[300px] overflow-y-auto p-2', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Command Empty
// ============================================================================

interface CommandEmptyProps {
  children?: React.ReactNode;
  className?: string;
}

export function CommandEmpty({ children, className }: CommandEmptyProps) {
  const { filteredItems, search } = useCommand();

  if (filteredItems.length > 0 || !search) return null;

  return (
    <div className={cn('py-6 text-center text-sm text-gray-500 dark:text-gray-400', className)}>
      {children || 'Niciun rezultat gasit.'}
    </div>
  );
}

// ============================================================================
// Command Group
// ============================================================================

interface CommandGroupProps {
  children: React.ReactNode;
  heading?: string;
  className?: string;
}

export function CommandGroup({ children, heading, className }: CommandGroupProps) {
  return (
    <div className={cn('py-1', className)}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Command Item
// ============================================================================

interface CommandItemProps {
  children: React.ReactNode;
  value: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect?: () => void;
  className?: string;
  icon?: React.ReactNode;
  shortcut?: string;
}

export const CommandItem = forwardRef<HTMLDivElement, CommandItemProps>(
  ({ children, value, keywords, disabled = false, onSelect, className, icon, shortcut }, ref) => {
    const { filteredItems, selectedIndex, setSelectedIndex, registerItem, unregisterItem } = useCommand();
    const id = useRef(`command-item-${Math.random().toString(36).slice(2)}`).current;

    useEffect(() => {
      registerItem({ id, value, keywords, disabled, onSelect });
      return () => unregisterItem(id);
    }, [id, value, keywords, disabled, onSelect, registerItem, unregisterItem]);

    const itemIndex = filteredItems.findIndex(item => item.id === id);
    const isSelected = itemIndex === selectedIndex;
    const isVisible = itemIndex !== -1;

    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        onClick={() => !disabled && onSelect?.()}
        onMouseEnter={() => setSelectedIndex(itemIndex)}
        className={cn(
          'flex items-center justify-between px-2 py-2 text-sm rounded-md cursor-pointer transition-colors duration-150',
          isSelected && 'bg-gray-100 dark:bg-gray-800',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && !isSelected && 'hover:bg-gray-100 dark:hover:bg-gray-800',
          className
        )}
      >
        <span className="flex items-center gap-2">
          {icon && <span className="w-4 h-4 text-gray-500">{icon}</span>}
          {children}
        </span>
        {shortcut && (
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
            {shortcut}
          </kbd>
        )}
      </div>
    );
  }
);

CommandItem.displayName = 'CommandItem';

// ============================================================================
// Command Separator
// ============================================================================

interface CommandSeparatorProps {
  className?: string;
}

export function CommandSeparator({ className }: CommandSeparatorProps) {
  return <div className={cn('h-px my-1 bg-gray-200 dark:bg-gray-700', className)} />;
}

// ============================================================================
// Command Shortcut
// ============================================================================

interface CommandShortcutProps {
  children: React.ReactNode;
  className?: string;
}

export function CommandShortcut({ children, className }: CommandShortcutProps) {
  return (
    <span className={cn('ml-auto text-xs text-gray-400 dark:text-gray-500', className)}>
      {children}
    </span>
  );
}

// ============================================================================
// Command Dialog
// ============================================================================

interface CommandDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function CommandDialog({ open = false, onOpenChange, children, className }: CommandDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange?.(!open);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onOpenChange?.(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange?.(false)}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'fixed left-1/2 top-1/4 z-50 -translate-x-1/2 w-full max-w-lg',
              className
            )}
          >
            <Command className="shadow-2xl">
              {children}
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Simple Command Palette
// ============================================================================

interface SimpleCommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  groups: Array<{
    heading: string;
    items: Array<{
      icon?: React.ReactNode;
      label: string;
      description?: string;
      shortcut?: string;
      onSelect: () => void;
    }>;
  }>;
  className?: string;
}

export function SimpleCommandPalette({
  open = false,
  onOpenChange,
  placeholder = 'Cauta comenzi...',
  groups,
  className,
}: SimpleCommandPaletteProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange?.(!open);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onOpenChange?.(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const filteredGroups = groups.map(group => ({
    ...group,
    items: search
      ? group.items.filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.description?.toLowerCase().includes(search.toLowerCase())
        )
      : group.items,
  })).filter(group => group.items.length > 0);

  const handleSelect = (onSelect: () => void) => {
    onSelect();
    onOpenChange?.(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange?.(false)}
            className="fixed inset-0 z-50 bg-black/50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'fixed left-1/2 top-1/4 z-50 -translate-x-1/2 w-full max-w-lg',
              className
            )}
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Input */}
              <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 px-3 py-4 text-sm bg-transparent outline-none placeholder:text-gray-400"
                />
                <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto p-2">
                {filteredGroups.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Niciun rezultat gasit.
                  </div>
                ) : (
                  filteredGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="mb-2">
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {group.heading}
                      </div>
                      {group.items.map((item, itemIndex) => (
                        <button
                          key={itemIndex}
                          type="button"
                          onClick={() => handleSelect(item.onSelect)}
                          className="flex items-center justify-between w-full px-2 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                        >
                          <span className="flex items-center gap-3">
                            {item.icon && <span className="w-5 h-5 text-gray-500">{item.icon}</span>}
                            <span>
                              <span className="text-gray-900 dark:text-white">{item.label}</span>
                              {item.description && (
                                <span className="ml-2 text-gray-500 dark:text-gray-400">{item.description}</span>
                              )}
                            </span>
                          </span>
                          {item.shortcut && (
                            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                              {item.shortcut}
                            </kbd>
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">↓</kbd>
                    <span className="ml-1">navigare</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">↵</kbd>
                    <span className="ml-1">selectare</span>
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">K</kbd>
                  <span className="ml-1">deschide</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Spotlight Search
// ============================================================================

interface SpotlightSearchProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  onSearch?: (query: string) => Promise<Array<{
    id: string;
    type: 'page' | 'action' | 'recent' | 'file';
    title: string;
    description?: string;
    icon?: React.ReactNode;
    onSelect: () => void;
  }>>;
  recentSearches?: string[];
  className?: string;
}

export function SpotlightSearch({
  open = false,
  onOpenChange,
  placeholder = 'Cauta orice...',
  onSearch,
  recentSearches = [],
  className,
}: SpotlightSearchProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setSearch('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!search) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      if (onSearch) {
        const searchResults = await onSearch(search);
        setResults(searchResults);
      }
      setIsLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, onSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange?.(!open);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onOpenChange?.(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (onSelect: () => void) => {
    onSelect();
    onOpenChange?.(false);
  };

  const typeIcons = {
    page: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    action: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    recent: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    file: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange?.(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed left-1/2 top-[15%] z-50 -translate-x-1/2 w-full max-w-2xl',
              className
            )}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Input */}
              <div className="flex items-center px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 px-4 text-lg bg-transparent outline-none placeholder:text-gray-400"
                />
                {isLoading && (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto">
                {!search && recentSearches.length > 0 && (
                  <div className="p-3">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cautari recente
                    </div>
                    {recentSearches.map((recent, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSearch(recent)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {typeIcons.recent}
                        <span className="text-gray-700 dark:text-gray-300">{recent}</span>
                      </button>
                    ))}
                  </div>
                )}

                {search && results.length === 0 && !isLoading && (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Niciun rezultat pentru &quot;{search}&quot;</p>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="p-3">
                    {results.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleSelect(result.onSelect)}
                        className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                      >
                        <span className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                          {result.icon || typeIcons[result.type as keyof typeof typeIcons]}
                        </span>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {result.title}
                          </div>
                          {result.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {result.description}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                          {result.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-center gap-6 px-5 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono">Tab</kbd>
                  <span>navigare</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono">↵</kbd>
                  <span>selectare</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono">Esc</kbd>
                  <span>inchide</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default Command;
