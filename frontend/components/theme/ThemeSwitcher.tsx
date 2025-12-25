'use client';

import { useTheme } from './useTheme';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Theme Switcher Component for Dashboard Header
 *
 * A premium theme switcher with elegant design, perfect for dashboard headers.
 * Features a segmented control design with smooth transitions and animations.
 *
 * Features:
 * - Three theme options: Light, Dark, System
 * - Segmented control design
 * - Smooth sliding indicator animation
 * - Tooltip on hover
 * - Accessible with keyboard navigation
 * - Prevents hydration mismatch
 */
export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder to prevent hydration mismatch
    return (
      <div className="h-10 w-36 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
    );
  }

  const themes = [
    { value: 'light', label: 'Light', icon: Sun, tooltip: 'Light mode' },
    { value: 'dark', label: 'Dark', icon: Moon, tooltip: 'Dark mode' },
    { value: 'system', label: 'Auto', icon: Monitor, tooltip: 'System preference' },
  ] as const;

  return (
    <div
      className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 transition-colors duration-200"
      role="group"
      aria-label="Theme switcher"
    >
      {themes.map(({ value, label, icon: Icon, tooltip }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
              flex items-center gap-1.5 min-w-[70px] justify-center
              ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }
            `}
            title={tooltip}
            aria-label={tooltip}
            aria-pressed={isActive}
          >
            <Icon
              className={`w-4 h-4 transition-transform duration-200 ${
                isActive ? 'scale-110' : 'scale-100'
              }`}
            />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact Theme Switcher
 *
 * A minimal version showing only icons, perfect for compact spaces.
 */
export function ThemeSwitcherCompact() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />;
  }

  const themes = [
    { value: 'light', icon: Sun, tooltip: 'Light mode' },
    { value: 'dark', icon: Moon, tooltip: 'Dark mode' },
    { value: 'system', icon: Monitor, tooltip: 'Auto' },
  ] as const;

  return (
    <div
      className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5"
      role="group"
      aria-label="Theme switcher"
    >
      {themes.map(({ value, icon: Icon, tooltip }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              p-1.5 rounded transition-all duration-200
              ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }
            `}
            title={tooltip}
            aria-label={tooltip}
            aria-pressed={isActive}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitcher;
