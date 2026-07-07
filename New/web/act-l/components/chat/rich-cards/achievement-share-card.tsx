'use client';

import type { ChatAttachment } from '@/lib/chat-service';

export function AchievementShareCard({ data }: { data: ChatAttachment }) {
  return (
    <div className="flex gap-3 items-center min-w-[200px]">
      {data.icon && (
        <img src={String(data.icon)} alt="" className="w-12 h-12 rounded-lg bg-zinc-900" />
      )}
      <div>
        <p className="font-medium text-sm">{data.title || data.name}</p>
        <p className="text-[10px] text-amber-400">🏆 Osiągnięcie</p>
      </div>
    </div>
  );
}
