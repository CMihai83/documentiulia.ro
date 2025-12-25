'use client';

import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

interface ProvidersProps {
  children: ReactNode;
  messages: any;
  locale: string;
}

export function Providers({ children, messages, locale }: ProvidersProps) {
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
