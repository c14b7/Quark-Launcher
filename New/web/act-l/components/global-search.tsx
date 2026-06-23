'use client';

import { useRef, useEffect } from 'react';
import { Search, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGames } from '@/lib/games-context';
import { useTranslations } from 'next-intl';

export function GlobalSearch() {
  const t = useTranslations('common');
  const { searchQuery, setSearchQuery } = useGames();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative group flex-1 max-w-md mx-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
      <Input
        ref={inputRef}
        placeholder={t('search')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-8 pl-9 pr-14 text-xs bg-zinc-900/60 border-white/10 rounded-full hover:border-white/20 focus-visible:ring-1 focus-visible:ring-violet-500/50"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-40 pointer-events-none">
        <Command className="h-3 w-3" />
        <span className="text-[10px] font-medium">K</span>
      </div>
    </div>
  );
}
