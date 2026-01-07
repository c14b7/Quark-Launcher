'use client';

import { useState } from 'react';
import { X, Moon, Sun, Monitor, Scale, EyeOff, FolderPlus, Trash2, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useSettings, Category } from '@/lib/settings-context';
import { useGames } from '@/lib/games-context';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, unhideGame, addCategory, removeCategory } = useSettings();
  const { games } = useGames();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'hidden' | 'categories'>('general');

  if (!isOpen) return null;

  const hiddenGamesData = games.filter(g => settings.hiddenGames.includes(g.id));

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory({
        name: newCategoryName.trim(),
        gameIds: [],
        color: getRandomColor()
      });
      setNewCategoryName('');
    }
  };

  const getRandomColor = () => {
    const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Ustawienia</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 border-b border-white/5">
          {[
            { id: 'general', label: 'Ogólne' },
            { id: 'hidden', label: 'Ukryte gry' },
            { id: 'categories', label: 'Kategorie' }
          ].map(tab => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-xl px-4',
                activeTab === tab.id && 'bg-white/10'
              )}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="h-[50vh]">
          <div className="p-6 space-y-6">
            {activeTab === 'general' && (
              <>
                {/* Theme */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400">Motyw</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 gap-2 rounded-xl border-white/10',
                        settings.theme === 'dark' && 'bg-white/10 border-violet-500'
                      )}
                      onClick={() => updateSettings({ theme: 'dark' })}
                    >
                      <Moon className="h-4 w-4" />
                      Ciemny
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 gap-2 rounded-xl border-white/10',
                        settings.theme === 'oled' && 'bg-white/10 border-violet-500'
                      )}
                      onClick={() => updateSettings({ theme: 'oled' })}
                    >
                      <Monitor className="h-4 w-4" />
                      OLED
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Tryb OLED używa czystej czerni dla oszczędności energii na ekranach OLED
                  </p>
                </div>

                <Separator className="bg-white/5" />

                {/* UI Scale */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-400">Skala interfejsu</label>
                    <span className="text-sm text-white">{Math.round(settings.uiScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.1"
                    value={settings.uiScale}
                    onChange={(e) => updateSettings({ uiScale: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>80%</span>
                    <span>100%</span>
                    <span>150%</span>
                  </div>
                </div>

                <Separator className="bg-white/5" />

                {/* Steam Integration */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400">Integracja Steam</label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Steam API Key"
                      value={settings.steamApiKey || ''}
                      onChange={(e) => updateSettings({ steamApiKey: e.target.value })}
                      className="rounded-xl bg-zinc-800/50 border-white/5"
                    />
                    <Input
                      placeholder="Steam User ID"
                      value={settings.steamUserId || ''}
                      onChange={(e) => updateSettings({ steamUserId: e.target.value })}
                      className="rounded-xl bg-zinc-800/50 border-white/5"
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    Potrzebne do wyświetlania osiągnięć i statystyk gracza
                  </p>
                </div>
              </>
            )}

            {activeTab === 'hidden' && (
              <div className="space-y-4">
                {hiddenGamesData.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <EyeOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Brak ukrytych gier</p>
                    <p className="text-xs mt-1">Kliknij PPM na kafelek gry i wybierz "Ukryj"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hiddenGamesData.map(game => (
                      <div
                        key={game.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-white/5"
                      >
                        <img
                          src={game.image}
                          alt={game.name}
                          className="w-16 h-8 object-cover rounded-lg"
                        />
                        <span className="flex-1 text-sm font-medium">{game.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-zinc-400 hover:text-white"
                          onClick={() => unhideGame(game.id)}
                        >
                          <EyeOff className="h-4 w-4" />
                          Pokaż
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="space-y-4">
                {/* Add new category */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nazwa nowej kategorii..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    className="rounded-xl bg-zinc-800/50 border-white/5"
                  />
                  <Button
                    onClick={handleAddCategory}
                    className="gap-2 rounded-xl bg-violet-500 hover:bg-violet-600"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Dodaj
                  </Button>
                </div>

                <Separator className="bg-white/5" />

                {/* Categories list */}
                {settings.customCategories.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <FolderPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Brak kategorii</p>
                    <p className="text-xs mt-1">Stwórz własne kategorie do organizacji gier</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {settings.customCategories.map(category => (
                      <div
                        key={category.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-white/5"
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="flex-1 text-sm font-medium">{category.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {category.gameIds.length} gier
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-red-500"
                          onClick={() => removeCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
