'use client';

import { useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowUp, ArrowDown, CornerDownLeft, X } from 'lucide-react';

// Command Item Interface
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string[];
  onSelect: () => void;
  keywords?: string[];
  group?: string;
  disabled?: boolean;
}

// Command Group Interface
interface CommandGroup {
  id: string;
  label: string;
  items: CommandItem[];
}

// Command Palette Props
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items?: CommandItem[];
  groups?: CommandGroup[];
  placeholder?: string;
  emptyMessage?: string;
  recentItems?: CommandItem[];
  showRecent?: boolean;
  maxHeight?: number;
  className?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  items = [],
  groups = [],
  placeholder = 'Caută comenzi...',
  emptyMessage = 'Nu am găsit rezultate.',
  recentItems = [],
  showRecent = true,
  maxHeight = 400,
  className = '',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Flatten groups into items if using groups
  const allItems = useMemo(() => {
    if (groups.length > 0) {
      return groups.flatMap((group) =>
        group.items.map((item) => ({ ...item, group: group.label }))
      );
    }
    return items;
  }, [items, groups]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query) {
      if (showRecent && recentItems.length > 0) {
        return recentItems;
      }
      return allItems;
    }

    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) => {
      const labelMatch = item.label.toLowerCase().includes(lowerQuery);
      const descMatch = item.description?.toLowerCase().includes(lowerQuery);
      const keywordMatch = item.keywords?.some((k) => k.toLowerCase().includes(lowerQuery));
      return labelMatch || descMatch || keywordMatch;
    });
  }, [query, allItems, recentItems, showRecent]);

  // Group filtered items
  const groupedItems = useMemo(() => {
    const grouped: Record<string, CommandItem[]> = {};

    filteredItems.forEach((item) => {
      const groupName = item.group || 'Rezultate';
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(item);
    });

    return grouped;
  }, [filteredItems]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          const selectedItem = filteredItems[selectedIndex];
          if (selectedItem && !selectedItem.disabled) {
            selectedItem.onSelect();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  let itemIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className={`
              fixed z-50 top-[20%] left-1/2 -translate-x-1/2
              w-full max-w-xl
              bg-white dark:bg-gray-900 rounded-xl shadow-2xl
              border border-gray-200 dark:border-gray-700
              overflow-hidden
              ${className}
            `}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="overflow-y-auto"
              style={{ maxHeight }}
            >
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </div>
              ) : (
                Object.entries(groupedItems).map(([groupName, groupItems]) => (
                  <div key={groupName}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {!query && showRecent && recentItems.length > 0 ? 'Recente' : groupName}
                    </div>
                    {groupItems.map((item) => {
                      itemIndex++;
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          data-selected={isSelected}
                          onClick={() => {
                            if (!item.disabled) {
                              item.onSelect();
                              onClose();
                            }
                          }}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          disabled={item.disabled}
                          className={`
                            w-full flex items-center gap-3 px-4 py-3 text-left
                            transition-colors
                            ${isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }
                            ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          {item.icon && (
                            <span className="flex-shrink-0">{item.icon}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.label}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.shortcut && item.shortcut.length > 0 && (
                            <div className="flex items-center gap-1">
                              {item.shortcut.map((key, i) => (
                                <kbd
                                  key={i}
                                  className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  <ArrowDown className="w-3 h-3" />
                  navighează
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  selectează
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">esc</kbd>
                  închide
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Command Palette Trigger (keyboard shortcut listener)
interface CommandPaletteTriggerProps {
  children: (props: { isOpen: boolean; open: () => void; close: () => void }) => ReactNode;
  shortcut?: string;
}

export function CommandPaletteTrigger({
  children,
  shortcut = 'k',
}: CommandPaletteTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === shortcut) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcut]);

  return (
    <>
      {children({
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      })}
    </>
  );
}

// Quick Search (simplified command palette for search)
interface QuickSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function QuickSearch({
  isOpen,
  onClose,
  onSearch,
  suggestions = [],
  placeholder = 'Caută...',
  className = '',
}: QuickSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!query) return [];
    return suggestions.filter((s) =>
      s.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, suggestions]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const searchQuery = selectedIndex >= 0 ? filteredSuggestions[selectedIndex] : query;
    if (searchQuery) {
      onSearch(searchQuery);
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredSuggestions.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          handleSubmit();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredSuggestions, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`
              fixed z-50 top-[20%] left-1/2 -translate-x-1/2
              w-full max-w-lg
              bg-white dark:bg-gray-900 rounded-xl shadow-2xl
              border border-gray-200 dark:border-gray-700
              overflow-hidden
              ${className}
            `}
          >
            <div className="flex items-center gap-3 px-4 py-4">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              />
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
              >
                Caută
              </button>
            </div>

            {filteredSuggestions.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setQuery(suggestion);
                      handleSubmit();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                      w-full px-4 py-2 text-left flex items-center gap-3
                      ${selectedIndex === index
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <Search className="w-4 h-4 opacity-50" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Spotlight Search (macOS-style)
interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  categories: {
    id: string;
    label: string;
    icon: ReactNode;
    items: {
      id: string;
      label: string;
      description?: string;
      icon?: ReactNode;
      onSelect: () => void;
    }[];
  }[];
  placeholder?: string;
  className?: string;
}

export function SpotlightSearch({
  isOpen,
  onClose,
  categories,
  placeholder = 'Spotlight Search',
  className = '',
}: SpotlightSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = useMemo(() => {
    if (!query) return categories;

    const lowerQuery = query.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.label.toLowerCase().includes(lowerQuery) ||
            item.description?.toLowerCase().includes(lowerQuery)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [query, categories]);

  const displayedCategory = selectedCategory
    ? filteredCategories.find((c) => c.id === selectedCategory)
    : null;

  const displayedItems = displayedCategory
    ? displayedCategory.items
    : filteredCategories.flatMap((c) => c.items.slice(0, 3));

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedCategory(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
              fixed z-50 top-[15%] left-1/2 -translate-x-1/2
              w-full max-w-2xl
              bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
              border border-gray-200 dark:border-gray-700
              overflow-hidden
              ${className}
            `}
          >
            {/* Search */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <Search className="w-6 h-6 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedCategory(null);
                  setSelectedIndex(0);
                }}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              />
            </div>

            <div className="flex" style={{ minHeight: 300 }}>
              {/* Categories Sidebar */}
              <div className="w-48 border-r border-gray-200 dark:border-gray-700 py-2">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                      ${selectedCategory === cat.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    {cat.icon}
                    {cat.label}
                    <span className="ml-auto text-xs text-gray-400">{cat.items.length}</span>
                  </button>
                ))}
              </div>

              {/* Results */}
              <div className="flex-1 py-2 overflow-y-auto">
                {displayedItems.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    Nu am găsit rezultate
                  </div>
                ) : (
                  displayedItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.onSelect();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left
                        ${selectedIndex === index
                          ? 'bg-primary/10'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      {item.icon && (
                        <span className="flex-shrink-0 text-gray-400">{item.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-sm text-gray-500 truncate">{item.description}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⌘K</kbd> pentru a deschide
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
