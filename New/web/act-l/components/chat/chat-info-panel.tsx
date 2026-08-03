'use client';

import { useState } from 'react';
import {
  X,
  Pencil,
  Check,
  UserPlus,
  LogOut,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/lib/chat-context';
import { useFriends } from '@/lib/friends-context';
import { useAuth } from '@/lib/auth-context';
import { getAvatarUrl } from '@/lib/avatar-service';
import { useTranslations } from 'next-intl';
import type { ChatConversation } from '@/lib/chat-service';

interface ChatInfoPanelProps {
  conversation: ChatConversation;
  onClose: () => void;
  onLeft?: () => void;
}

export function ChatInfoPanel({ conversation, onClose, onLeft }: ChatInfoPanelProps) {
  const t = useTranslations('chat');
  const { user } = useAuth();
  const { friends } = useFriends();
  const { updateConversation, addMember, leaveConversation, refreshConversations } = useChat();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conversation.name);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const isGroup = conversation.type === 'group';
  const memberIds = new Set(conversation.memberIds);
  const friendsToAdd = friends.filter((f) => !memberIds.has(f.userId));

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === conversation.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await updateConversation(conversation.id, { name: trimmed });
    setSaving(false);
    setEditing(false);
  };

  const handleAdd = async (userId: string) => {
    setSaving(true);
    await addMember(conversation.id, userId);
    await refreshConversations();
    setSaving(false);
    setAdding(false);
  };

  const handleLeave = async () => {
    if (!user?.$id) return;
    setSaving(true);
    await leaveConversation(conversation.id, user.$id);
    setSaving(false);
    onLeft?.();
    onClose();
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0">
        <h3 className="text-sm font-semibold text-white">{t('conversationInfo')}</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-5">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{t('displayName')}</p>
            {editing ? (
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border-white/10 h-9"
                  maxLength={128}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveName();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-lime-500 text-black hover:bg-lime-600"
                  disabled={saving}
                  onClick={() => void saveName()}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-medium flex-1 truncate">{conversation.name}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setName(conversation.name);
                    setEditing(true);
                  }}
                  title={t('rename')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <p className="text-[11px] text-zinc-500">
              {isGroup ? t('groupHint') : t('dmRenameHint')}
            </p>
          </div>

          {isGroup && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  {t('members')} ({conversation.memberIds.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setAdding((v) => !v)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t('addMember')}
                </Button>
              </div>

              {adding && (
                <div className="rounded-lg border border-white/10 bg-zinc-900/80 max-h-36 overflow-y-auto">
                  {friendsToAdd.length === 0 ? (
                    <p className="text-xs text-zinc-500 p-3">{t('noFriendsToAdd')}</p>
                  ) : (
                    friendsToAdd.map((f) => (
                      <button
                        key={f.userId}
                        type="button"
                        disabled={saving}
                        onClick={() => void handleAdd(f.userId)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 text-sm text-zinc-200"
                      >
                        <Avatar className="h-6 w-6">
                          {f.avatarFileId && (
                            <AvatarImage src={getAvatarUrl(f.avatarFileId)} />
                          )}
                          <AvatarFallback className="text-[9px] bg-zinc-800">
                            {f.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {f.displayName}
                      </button>
                    ))
                  )}
                </div>
              )}

              <ul className="space-y-1">
                {(conversation.members.length > 0
                  ? conversation.members
                  : conversation.memberIds.map((id) => ({
                      userId: id,
                      displayName: id === user?.$id ? t('you') : id.slice(0, 8),
                      avatarFileId: null as string | null,
                    }))
                ).map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5"
                  >
                    <Avatar className="h-7 w-7">
                      {m.avatarFileId && (
                        <AvatarImage src={getAvatarUrl(m.avatarFileId)} />
                      )}
                      <AvatarFallback className="text-[9px] bg-zinc-800">
                        {(m.displayName || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-zinc-200 truncate flex-1">
                      {m.displayName}
                      {m.userId === user?.$id ? ` (${t('you')})` : ''}
                    </span>
                    {conversation.ownerId === m.userId && (
                      <span className="text-[10px] text-lime-400/80">{t('owner')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isGroup && (
            <Button
              variant="ghost"
              className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
              disabled={saving}
              onClick={() => void handleLeave()}
            >
              <LogOut className="h-4 w-4" />
              {t('leaveGroup')}
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
