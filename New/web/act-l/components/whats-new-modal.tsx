'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  getPendingWhatsNew,
  loadLastSeenWhatsNewVersion,
  setLastSeenWhatsNewVersion,
  type WhatsNewEntry,
} from '@/lib/whats-new';
import { getAppVersion } from '@/lib/build-env';
import { cn } from '@/lib/utils';

export function WhatsNewModal() {
  const t = useTranslations('whatsNew');
  const locale = useLocale();
  const [entry, setEntry] = useState<WhatsNewEntry | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      await loadLastSeenWhatsNewVersion();
      const pending = getPendingWhatsNew(locale);
      if (pending) {
        setEntry(pending);
        setOpen(true);
      }
    })();
  }, [locale]);

  const dismiss = async () => {
    await setLastSeenWhatsNewVersion(getAppVersion());
    setOpen(false);
  };

  if (!open || !entry) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => void dismiss()}
      />
      <div
        className={cn(
          'relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-300 overflow-hidden'
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#d4ff00] via-[#a3e635] to-transparent" />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#d4ff00]">
            <Sparkles className="h-5 w-5" />
            <p className="text-xs uppercase tracking-[0.2em] font-medium">{t('eyebrow')}</p>
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">{entry.title}</h2>
          <p className="text-xs text-zinc-500 font-mono">{getAppVersion()}</p>
          <ul className="space-y-2.5">
            {entry.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-[#d4ff00] mt-0.5 shrink-0">▸</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <Button
            className="w-full mt-2 bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
            onClick={() => void dismiss()}
          >
            {t('gotIt')}
          </Button>
        </div>
      </div>
    </div>
  );
}
