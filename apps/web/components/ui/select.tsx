'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Selectează...',
  label,
  error,
  required,
  disabled = false,
  searchable = false,
  multiple = false,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable && search
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.description?.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // Normalize value to array for internal use
  const getSelectedValues = (): string[] => {
    if (multiple) {
      return Array.isArray(value) ? value : [];
    }
    return typeof value === 'string' && value ? [value] : [];
  };

  const selectedValues = getSelectedValues();
  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));

  const handleSelect = (optValue: string) => {
    if (multiple) {
      const isSelected = selectedValues.includes(optValue);
      const newValue = isSelected
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue];
      onChange(newValue);
    } else {
      onChange(optValue);
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleRemove = (optValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      const newValue = selectedValues.filter((v) => v !== optValue);
      onChange(newValue);
    } else {
      onChange('');
    }
  };

  const displayValue = multiple
    ? selectedOptions.length > 0
      ? `${selectedOptions.length} selectat${selectedOptions.length > 1 ? 'e' : ''}`
      : placeholder
    : selectedOptions[0]?.label || placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            : 'bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-600'
        } ${
          error
            ? 'border-red-300 dark:border-red-700'
            : isOpen
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        {/* Selected items for multiple */}
        {multiple && selectedOptions.length > 0 ? (
          <div className="flex-1 flex flex-wrap gap-1">
            {selectedOptions.slice(0, 3).map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
              >
                {opt.label}
                <button
                  onClick={(e) => handleRemove(opt.value, e)}
                  className="hover:bg-primary/20 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedOptions.length > 3 && (
              <span className="text-xs text-gray-500">
                +{selectedOptions.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className={`flex-1 text-sm truncate ${selectedValues.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
            {displayValue}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            {/* Search */}
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Caută..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                  Nu au fost găsite opțiuni
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      disabled={option.disabled}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        option.disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {option.icon && (
                        <span className="flex-shrink-0">{option.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                          {option.label}
                        </p>
                        {option.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {option.description}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
