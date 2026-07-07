'use client';

import type { ChatAttachment } from '@/lib/chat-service';
import { useGames } from '@/lib/games-context';
import { Button } from '@/components/ui/button';

export function GameShareCard({ data }: { data: ChatAttachment }) {
  const { launchGame, games } = useGames();
  const owned = games.find((g) => g.id === String(data.appId));

  return (
    <div className="flex gap-3 items-center min-w-[200px]">
      {data.image && (
        <img src={String(data.image)} alt="" className="w-20 h-11 object-cover rounded-lg" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{data.name}</p>
        <p className="text-[10px] text-zinc-500 uppercase">{data.platform}</p>
        {owned && (
          <Button
            size="sm"
            className="mt-1 h-7 text-xs bg-lime-500/20 hover:bg-lime-500/30 text-lime-200"
            onClick={(e) => {
              e.stopPropagation();
              launchGame(owned);
            }}
          >
            Uruchom
          </Button>
        )}
      </div>
    </div>
  );
}
