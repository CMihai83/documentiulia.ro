'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Theme Provider Component
 *
 * Wraps the application with next-themes provider for theme management.
 * Handles theme persistence, system preference detection, and smooth transitions.
 *
 * Features:
 * - Persists theme preference in localStorage
 * - Respects system preference by default
 * - Prevents flash of unstyled content (FOUC)
 * - Supports light, dark, and system themes
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
