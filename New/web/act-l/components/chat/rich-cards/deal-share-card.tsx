'use client';

import type { ChatAttachment } from '@/lib/chat-service';
import { Button } from '@/components/ui/button';

export function DealShareCard({ data }: { data: ChatAttachment }) {
  return (
    <div className="min-w-[200px] space-y-2">
      <p className="font-medium text-sm">{data.title || data.name}</p>
      <div className="flex items-center gap-2 text-xs">
        {data.discount != null && (
          <span className="text-lime-400 font-bold">-{data.discount}%</span>
        )}
        {data.price && <span className="text-zinc-300">{data.price}</span>}
      </div>
      {data.url && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-lime-500/30"
          onClick={() => window.open(String(data.url), '_blank')}
        >
          Zobacz okazję
        </Button>
      )}
    </div>
  );
}
