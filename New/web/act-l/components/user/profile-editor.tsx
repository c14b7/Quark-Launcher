'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { UserCard } from './user-card';
import { GRADIENT_PRESETS } from '@/lib/friends-service';
import type { CardTheme } from '@/lib/types';
import { cn } from '@/lib/utils';

const GRADIENT_OPTIONS = Object.keys(GRADIENT_PRESETS);

export function ProfileEditor() {
  const { profile, updateProfile, cardTheme } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [theme, setTheme] = useState<CardTheme>(cardTheme);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || profile.name);
      setBio(profile.bio || '');
      setCustomStatus(profile.customStatus || '');
      setTheme(cardTheme);
    }
  }, [profile, cardTheme]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const result = await updateProfile({
      displayName,
      bio,
      customStatus,
      cardTheme: theme,
    });
    setSaving(false);
    setMessage(result.success ? 'Zapisano!' : result.error || 'Błąd zapisu');
  };

  if (!profile) return null;

  const previewProfile = {
    ...profile,
    displayName,
    bio,
    customStatus,
    cardTheme: JSON.stringify(theme),
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400 mb-1 block">Wyświetlana nazwa</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={32}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 mb-1 block">O mnie</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={190}
            rows={3}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <p className="text-xs text-zinc-600 mt-1">{bio.length}/190</p>
        </div>
        <div>
          <label className="text-sm text-zinc-400 mb-1 block">Status</label>
          <Input
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            maxLength={128}
            placeholder="Czym się zajmujesz?"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 mb-1 block">Kolor akcentu</label>
          <input
            type="color"
            value={theme.accentColor}
            onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
            className="h-10 w-full rounded cursor-pointer bg-transparent"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 mb-2 block">Gradient bannera</label>
          <div className="flex flex-wrap gap-2">
            {GRADIENT_OPTIONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTheme({ ...theme, gradientPreset: preset })}
                className={cn(
                  'h-8 w-16 rounded-md bg-gradient-to-r',
                  GRADIENT_PRESETS[preset],
                  theme.gradientPreset === preset && 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                )}
              />
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={theme.glowEnabled ?? false}
            onChange={(e) => setTheme({ ...theme, glowEnabled: e.target.checked })}
            className="rounded"
          />
          Świecący efekt karty i kodu
        </label>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600"
        >
          {saving ? 'Zapisywanie...' : 'Zapisz profil'}
        </Button>
        {message && (
          <p className={cn('text-sm text-center', message.includes('!') ? 'text-green-400' : 'text-red-400')}>
            {message}
          </p>
        )}
      </div>
      <div>
        <p className="text-sm text-zinc-500 mb-3">Podgląd karty</p>
        <UserCard profile={previewProfile} />
      </div>
    </div>
  );
}
