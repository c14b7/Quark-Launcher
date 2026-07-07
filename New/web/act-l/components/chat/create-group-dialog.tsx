'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFriends } from '@/lib/friends-context';
import { useChat } from '@/lib/chat-context';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const t = useTranslations('chat');
  const { friends } = useFriends();
  const { createGroup } = useChat();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.size === 0) return;
    setLoading(true);
    await createGroup(name.trim(), [...selected]);
    setLoading(false);
    setName('');
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{t('newGroup')}</DialogTitle>
        </DialogHeader>
        <Input
          placeholder={t('groupName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-zinc-800 border-white/10"
        />
        <div className="max-h-48 overflow-y-auto space-y-1">
          {friends.map((f) => (
            <button
              key={f.userId}
              type="button"
              onClick={() => toggle(f.userId)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm',
                selected.has(f.userId) ? 'bg-lime-500/20 text-lime-200' : 'hover:bg-white/5 text-zinc-300'
              )}
            >
              {f.displayName}
            </button>
          ))}
        </div>
        <Button
          className="w-full bg-lime-500 hover:bg-lime-600 text-black"
          disabled={loading || !name.trim() || selected.size === 0}
          onClick={() => void handleCreate()}
        >
          {t('createGroup')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
