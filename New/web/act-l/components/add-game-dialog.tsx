'use client';

import { useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGames } from '@/lib/games-context';
import { cn } from '@/lib/utils';

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddGameDialog({ open, onOpenChange }: AddGameDialogProps) {
  const t = useTranslations('library');
  const { addCustomGame } = useGames();
  const [name, setName] = useState('');
  const [gamePath, setGamePath] = useState('');
  const [args, setArgs] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickExe = async () => {
    const path = await window.electronAPI?.selectGameExecutable?.();
    if (!path) return;
    setGamePath(path);
    if (!name.trim()) {
      const base = path.split(/[/\\]/).pop()?.replace(/\.exe$/i, '') || '';
      setName(base);
    }
  };

  const submit = async () => {
    setError(null);
    if (!gamePath.trim()) {
      setError(t('addGameNeedPath'));
      return;
    }
    setBusy(true);
    try {
      const launchArgs = args
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      await addCustomGame({
        name: name.trim() || t('addGameDefaultName'),
        gamePath: gamePath.trim(),
        launchArgs: launchArgs.length ? launchArgs : undefined,
        kind: 'manual',
      });
      setName('');
      setGamePath('');
      setArgs('');
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('addGameFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#d4ff00]" />
            {t('addGameTitle')}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            {t('addGameDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-zinc-500">{t('addGameName')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-zinc-900 border-white/10"
              placeholder="My Game"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">{t('addGamePath')}</label>
            <div className="mt-1 flex gap-2">
              <Input
                value={gamePath}
                onChange={(e) => setGamePath(e.target.value)}
                className="bg-zinc-900 border-white/10 font-mono text-xs"
                placeholder="C:\\Games\\game.exe"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-white/10"
                onClick={() => void pickExe()}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500">{t('addGameArgs')}</label>
            <Input
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              className="mt-1 bg-zinc-900 border-white/10 font-mono text-xs"
              placeholder="--fullscreen"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button
            className={cn('bg-[#d4ff00] text-black hover:bg-[#e2ff4d]')}
            onClick={() => void submit()}
            disabled={busy}
          >
            {t('addGameSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
