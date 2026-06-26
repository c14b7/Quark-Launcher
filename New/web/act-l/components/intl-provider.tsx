'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useSettings } from '@/lib/settings-context';
import { messages, defaultLocale, AppLocale } from '@/lib/i18n';

const DEFAULT_TIME_ZONE = 'Europe/Warsaw';

export function IntlProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const locale = (settings.locale || defaultLocale) as AppLocale;

  const timeZone = useMemo(() => {
    if (typeof window === 'undefined') return DEFAULT_TIME_ZONE;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
    } catch {
      return DEFAULT_TIME_ZONE;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone={timeZone}
    >
      {children}
    </NextIntlClientProvider>
  );
}
