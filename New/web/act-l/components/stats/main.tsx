'use client';

import { ChartNoAxesCombined } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Placeholder until Quark Recap ships in the next release. */
export function StatsView() {
  const t = useTranslations('stats');
  const tc = useTranslations('common');

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3 p-8">
      <ChartNoAxesCombined className="h-14 w-14 text-zinc-700" />
      <p className="text-lg font-medium text-zinc-400">{t('comingSoonTitle')}</p>
      <p className="text-sm text-zinc-500 text-center max-w-sm">{t('comingSoonHint')}</p>
      <p className="text-[11px] text-zinc-600">{tc('soon')}</p>
    </div>
  );
}
