'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ showLabel = false, size = 'md' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`${sizeClasses[size]} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors flex items-center gap-2`}
        aria-label="Toggle theme"
        title={`Current theme: ${theme}`}
      >
        <ThemeIcon className={iconSizes[size]} />
        {showLabel && (
          <span className="text-sm">
            {theme === 'system' ? 'Auto' : theme === 'dark' ? 'Întunecat' : 'Luminos'}
          </span>
        )}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <button
            onClick={() => {
              setTheme('light');
              setShowMenu(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
              theme === 'light' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Sun className="w-4 h-4" />
            Luminos
            {theme === 'light' && <span className="ml-auto text-primary-500">✓</span>}
          </button>
          <button
            onClick={() => {
              setTheme('dark');
              setShowMenu(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
              theme === 'dark' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Moon className="w-4 h-4" />
            Întunecat
            {theme === 'dark' && <span className="ml-auto text-primary-500">✓</span>}
          </button>
          <button
            onClick={() => {
              setTheme('system');
              setShowMenu(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
              theme === 'system' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Sistem
            {theme === 'system' && <span className="ml-auto text-primary-500">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}

// Simple toggle button (no dropdown)
export function ThemeToggleSimple({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`${sizeClasses[size]} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-all duration-200`}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className={`${iconSizes[size]} transition-transform hover:rotate-45`} />
      ) : (
        <Moon className={`${iconSizes[size]} transition-transform hover:-rotate-12`} />
      )}
    </button>
  );
}

export default ThemeToggle;
