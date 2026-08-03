'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useSettings } from '@/lib/settings-context';
import { messages, defaultLocale, messagesAsKeyPaths, type AppLocale } from '@/lib/i18n';

const DEFAULT_TIME_ZONE = 'Europe/Warsaw';

export function IntlProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const locale = (settings.locale || defaultLocale) as AppLocale;
  const showI18nKeys = settings.showI18nKeys === true;

  const timeZone = useMemo(() => {
    if (typeof window === 'undefined') return DEFAULT_TIME_ZONE;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
    } catch {
      return DEFAULT_TIME_ZONE;
    }
  }, []);

  const resolvedMessages = useMemo(() => {
    const base = messages[locale] || messages[defaultLocale];
    return showI18nKeys ? messagesAsKeyPaths(base) : base;
  }, [locale, showI18nKeys]);

  useEffect(() => {
    document.documentElement.lang = showI18nKeys ? 'und' : locale;
  }, [locale, showI18nKeys]);

  return (
    <NextIntlClientProvider
      locale={showI18nKeys ? 'und' : locale}
      messages={resolvedMessages}
      timeZone={timeZone}
    >
      {children}
    </NextIntlClientProvider>
  );
}
