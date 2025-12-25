'use client';

import { useTheme } from './useTheme';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  /**
   * Show label text next to icon
   * @default false
   */
  showLabel?: boolean;
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Show dropdown with all theme options
   * @default true
   */
  showDropdown?: boolean;
  /**
   * Custom className
   */
  className?: string;
}

/**
 * Theme Toggle Component
 *
 * A button component that allows users to switch between light, dark, and system themes.
 * Can be displayed as a simple toggle or a dropdown with all options.
 *
 * Features:
 * - Multiple size variants (sm, md, lg)
 * - Optional label text
 * - Dropdown menu with all theme options
 * - Smooth animations and transitions
 * - Accessible with proper ARIA labels
 * - Prevents hydration mismatch
 */
export function ThemeToggle({
  showLabel = false,
  size = 'md',
  showDropdown = true,
  className = '',
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Get current icon based on resolved theme
  const ThemeIcon = mounted ? (resolvedTheme === 'dark' ? Moon : Sun) : Sun;

  // Get theme label
  const getThemeLabel = (t: string) => {
    switch (t) {
      case 'light':
        return 'Luminos';
      case 'dark':
        return 'Întunecat';
      case 'system':
        return 'Sistem';
      default:
        return 'Sistem';
    }
  };

  // Simple toggle between light and dark
  const handleSimpleToggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) {
    // Return placeholder to prevent hydration mismatch
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg ${className}`}
        style={{ width: showLabel ? '100px' : '40px' }}
      />
    );
  }

  if (!showDropdown) {
    // Simple toggle button
    return (
      <button
        onClick={handleSimpleToggle}
        className={`${sizeClasses[size]} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-all duration-200 flex items-center gap-2 ${className}`}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Current theme: ${getThemeLabel(theme || 'system')}`}
      >
        <ThemeIcon
          className={`${iconSizes[size]} transition-transform duration-200 ${
            resolvedTheme === 'dark' ? 'rotate-0' : 'rotate-0'
          }`}
        />
        {showLabel && <span>{getThemeLabel(resolvedTheme || 'system')}</span>}
      </button>
    );
  }

  // Dropdown toggle
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${sizeClasses[size]} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-all duration-200 flex items-center gap-2`}
        aria-label="Toggle theme menu"
        aria-expanded={isOpen}
        title={`Current theme: ${getThemeLabel(theme || 'system')}`}
      >
        <ThemeIcon className={`${iconSizes[size]} transition-transform duration-200`} />
        {showLabel && <span>{getThemeLabel(theme || 'system')}</span>}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-scale-in">
            <div className="py-1" role="menu">
              <button
                onClick={() => {
                  setTheme('light');
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                  theme === 'light'
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                role="menuitem"
              >
                <Sun className="w-4 h-4" />
                <span className="flex-1">Luminos</span>
                {theme === 'light' && <span className="text-primary-500">✓</span>}
              </button>

              <button
                onClick={() => {
                  setTheme('dark');
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                  theme === 'dark'
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                role="menuitem"
              >
                <Moon className="w-4 h-4" />
                <span className="flex-1">Întunecat</span>
                {theme === 'dark' && <span className="text-primary-500">✓</span>}
              </button>

              <button
                onClick={() => {
                  setTheme('system');
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                  theme === 'system'
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                role="menuitem"
              >
                <Monitor className="w-4 h-4" />
                <span className="flex-1">Sistem</span>
                {theme === 'system' && <span className="text-primary-500">✓</span>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ThemeToggle;
