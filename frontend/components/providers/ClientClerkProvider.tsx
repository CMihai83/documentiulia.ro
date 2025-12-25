'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * Client-side Clerk provider that handles missing publishable key gracefully.
 * In development or when Clerk is not configured, it bypasses Clerk entirely.
 */
export function ClientClerkProvider({ children }: Props) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // If no Clerk key is configured, render children without Clerk
  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}

export default ClientClerkProvider;
