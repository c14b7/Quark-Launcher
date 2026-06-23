'use client';

import { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FriendCodeDisplayProps {
  code: string;
  onRegenerate?: () => Promise<void>;
  glowEnabled?: boolean;
  className?: string;
}

function formatCode(code: string): string {
  const c = code.replace(/\s/g, '');
  if (c.length <= 3) return c;
  return `${c.slice(0, 3)} ${c.slice(3)}`;
}

export function FriendCodeDisplay({ code, onRegenerate, glowEnabled = true, className }: FriendCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className={cn('p-3 rounded-lg bg-zinc-900/80 border border-zinc-800', className)}>
      <p className="text-xs text-zinc-500 mb-2">Twój kod znajomego</p>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex-1 text-center font-mono text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400',
            glowEnabled && 'animate-pulse'
          )}
        >
          {formatCode(code)}
        </div>
        <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0 text-zinc-400 hover:text-white">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
        {onRegenerate && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="shrink-0 text-zinc-400 hover:text-white"
            title="Wygeneruj nowy kod (1×/24h)"
          >
            <RefreshCw className={cn('h-4 w-4', regenerating && 'animate-spin')} />
          </Button>
        )}
      </div>
    </div>
  );
}
