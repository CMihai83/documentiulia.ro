'use client';

import { useTheme as useThemeContext } from '@/contexts/ThemeContext';

/**
 * Custom theme hook
 *
 * Re-exports the useTheme hook from ThemeContext.
 *
 * @returns Theme context with theme, setTheme, resolvedTheme, etc.
 */
export const useTheme = useThemeContext;

export { useTheme as default };
