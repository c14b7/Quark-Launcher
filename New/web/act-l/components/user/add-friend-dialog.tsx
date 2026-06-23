'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCard } from './user-card';
import { useFriends } from '@/lib/friends-context';
import type { QuarkFriend } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFriendDialog({ open, onOpenChange }: AddFriendDialogProps) {
  const { lookupByCode, sendRequest } = useFriends();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<QuarkFriend | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const normalizedCode = code.replace(/\s/g, '').slice(0, 6);

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits);
    setPreview(null);
    setError(null);
    setSuccess(null);
  };

  const handleLookup = async () => {
    if (normalizedCode.length !== 6) {
      setError('Wpisz 6-cyfrowy kod');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await lookupByCode(normalizedCode);
    setLoading(false);
    if (result.success && result.profile) {
      setPreview(result.profile);
    } else {
      setError(result.error || 'Nie znaleziono użytkownika');
    }
  };

  const handleSend = async () => {
    if (!normalizedCode) return;
    setSending(true);
    setError(null);
    const result = await sendRequest(normalizedCode);
    setSending(false);
    if (result.success) {
      setSuccess(result.autoAccepted ? 'Znajomy dodany!' : 'Zaproszenie wysłane!');
      setTimeout(() => {
        onOpenChange(false);
        setCode('');
        setPreview(null);
        setSuccess(null);
      }, 1500);
    } else {
      setError(result.error || 'Nie udało się wysłać zaproszenia');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Dodaj znajomego</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Wpisz 6-cyfrowy kod znajomego Quark
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="000 000"
              className="font-mono text-center text-lg tracking-widest bg-zinc-800 border-zinc-700"
              maxLength={7}
            />
            <Button onClick={handleLookup} disabled={loading || normalizedCode.length !== 6} variant="secondary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Szukaj'}
            </Button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}

          {preview && (
            <div className="space-y-3">
              <UserCard profile={preview} compact />
              <Button
                onClick={handleSend}
                disabled={sending}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Wyślij zaproszenie
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
