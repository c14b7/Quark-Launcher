'use client';

import { ReactNode, useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useSettings } from '@/lib/settings-context';
import { messages, defaultLocale, AppLocale } from '@/lib/i18n';

export function IntlProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const locale = (settings.locale || defaultLocale) as AppLocale;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
