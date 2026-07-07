'use client';

import type { ChatAttachment } from '@/lib/chat-service';

export function LfgCard({ data, body }: { data: ChatAttachment; body?: string }) {
  return (
    <div className="space-y-1 min-w-[200px]">
      <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wide">LFG</p>
      <p className="font-medium">{data.gameName || data.name}</p>
      {data.mode && <p className="text-xs text-zinc-400">Tryb: {String(data.mode)}</p>}
      {data.slots != null && <p className="text-xs text-zinc-400">Miejsca: {String(data.slots)}</p>}
      {body && <p className="text-sm text-zinc-300 mt-1">{body}</p>}
    </div>
  );
}
