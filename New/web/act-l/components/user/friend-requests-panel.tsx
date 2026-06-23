'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserCard } from './user-card';
import { useFriends } from '@/lib/friends-context';
import { Check, X, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function FriendRequestsPanel() {
  const { incomingRequests, outgoingRequests, acceptRequest, declineRequest, cancelRequest } = useFriends();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (incomingRequests.length === 0 && outgoingRequests.length === 0) {
    return null;
  }

  const handleAccept = async (id: string) => {
    setLoadingId(id);
    await acceptRequest(id);
    setLoadingId(null);
  };

  const handleDecline = async (id: string) => {
    setLoadingId(id);
    await declineRequest(id);
    setLoadingId(null);
  };

  const handleCancel = async (id: string) => {
    setLoadingId(id);
    await cancelRequest(id);
    setLoadingId(null);
  };

  return (
    <div className="border-t border-zinc-800 px-2 py-3 space-y-3">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2">
        Zaproszenia ({incomingRequests.length + outgoingRequests.length})
      </p>

      <ScrollArea className="max-h-48">
        <div className="space-y-2">
          {incomingRequests.map((req) => (
            <div key={req.id} className="px-2 py-2 rounded-lg bg-zinc-800/40 space-y-2">
              {req.profile && <UserCard profile={req.profile} compact showBio={false} />}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                  onClick={() => handleAccept(req.id)}
                  disabled={loadingId === req.id}
                >
                  {loadingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                  Akceptuj
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleDecline(req.id)}
                  disabled={loadingId === req.id}
                >
                  <X className="h-3 w-3 mr-1" />
                  Odrzuć
                </Button>
              </div>
            </div>
          ))}

          {outgoingRequests.map((req) => (
            <div key={req.id} className="px-2 py-2 rounded-lg bg-zinc-800/40 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-zinc-300 truncate">
                  Do: {req.profile?.displayName || 'Użytkownik'}
                </p>
                <p className="text-xs text-zinc-500">Oczekuje...</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs shrink-0"
                onClick={() => handleCancel(req.id)}
                disabled={loadingId === req.id}
              >
                Anuluj
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
