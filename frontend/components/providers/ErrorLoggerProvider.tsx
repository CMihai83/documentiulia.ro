'use client';

import { useEffect, ReactNode } from 'react';
import { useErrorLogger, setGlobalErrorLogger } from '@/hooks/useErrorLogger';

interface ErrorLoggerProviderProps {
  children: ReactNode;
}

export function ErrorLoggerProvider({ children }: ErrorLoggerProviderProps) {
  const { logError } = useErrorLogger({
    enabled: true, // Always enabled - errors are important
    batchSize: 5,
    flushInterval: 10000,
  });

  // Set global logger for use outside React
  useEffect(() => {
    setGlobalErrorLogger(logError);
    return () => setGlobalErrorLogger(null);
  }, [logError]);

  return <>{children}</>;
}
