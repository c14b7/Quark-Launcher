'use client';

import { useState } from 'react';
import { X, Moon, Monitor, EyeOff, FolderPlus, Trash2, Bot, Server, Key, Shield, RefreshCw, Trash, Database, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/lib/settings-context';
import { useGames } from '@/lib/games-context';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, unhideGame, addCategory, removeCategory } = useSettings();
  const { games } = useGames();
  const { logout } = useAuth();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'hidden' | 'categories' | 'ai' | 'admin'>('general');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
        <div className="flex gap-1 p-4 border-b border-white/5 overflow-x-auto">
          {[
            { id: 'general', label: 'Ogólne' },
            { id: 'ai', label: 'Asystent AI' },
            { id: 'hidden', label: 'Ukryte gry' },
            { id: 'categories', label: 'Kategorie' },
            { id: 'admin', label: 'Admin' }
          ].map(tab => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-xl px-4 whitespace-nowrap',
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

            {activeTab === 'ai' && (
              <div className="space-y-6">
                {/* AI Info */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Bot className="h-5 w-5 text-violet-400" />
                    <h3 className="font-semibold text-white">Quark AI Assistant</h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Połącz z Open WebUI API, aby korzystać z asystenta AI. 
                    Obsługiwany model: gpt-oss:21b lub dowolny kompatybilny model.
                  </p>
                </div>

                {/* Server URL */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Adres serwera API
                  </label>
                  <Input
                    placeholder="https://your-openwebui-server.com"
                    value={settings.aiServerUrl || ''}
                    onChange={(e) => updateSettings({ aiServerUrl: e.target.value })}
                    className="rounded-xl bg-zinc-800/50 border-white/5"
                  />
                  <p className="text-xs text-zinc-500">
                    Wprowadź pełny adres URL serwera Open WebUI
                  </p>
                </div>

                {/* API Token */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Token API
                  </label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={settings.aiApiToken || ''}
                    onChange={(e) => updateSettings({ aiApiToken: e.target.value })}
                    className="rounded-xl bg-zinc-800/50 border-white/5"
                  />
                  <p className="text-xs text-zinc-500">
                    Token autoryzacji do API
                  </p>
                </div>

                {/* Model */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400">Model AI</label>
                  <Input
                    placeholder="gpt-oss:21b"
                    value={settings.aiModel || ''}
                    onChange={(e) => updateSettings({ aiModel: e.target.value })}
                    className="rounded-xl bg-zinc-800/50 border-white/5"
                  />
                  <p className="text-xs text-zinc-500">
                    Nazwa modelu do użycia (domyślnie: gpt-oss:21b)
                  </p>
                </div>

                {/* Connection Status */}
                <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Status połączenia:</span>
                    {settings.aiServerUrl && settings.aiApiToken ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Skonfigurowano
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-400 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        Tryb demo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hidden' && (
              <div className="space-y-4">
                {hiddenGamesData.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <EyeOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Brak ukrytych gier</p>
                    <p className="text-xs mt-1">Kliknij PPM na kafelek gry i wybierz &quot;Ukryj&quot;</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hiddenGamesData.map((game, index) => (
                      <div
                        key={`${game.id}_${index}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-white/5"
                      >
                        {game.image ? (
                          <img
                            src={game.image}
                            alt={game.name}
                            className="w-16 h-8 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-violet-400">
                              {game.name?.[0] || '?'}
                            </span>
                          </div>
                        )}
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

            {activeTab === 'admin' && (
              <div className="space-y-6">
                {/* Admin Warning */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-5 w-5 text-red-400" />
                    <h3 className="font-semibold text-white">Panel Administratora</h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Narzędzia deweloperskie i administracyjne. Używaj ostrożnie!
                  </p>
                </div>

                {/* Version Info */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Informacje o wersji
                  </label>
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Wersja aplikacji:</span>
                      <span className="text-white font-mono">0.1.0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Next.js:</span>
                      <span className="text-white font-mono">16.1.1</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">React:</span>
                      <span className="text-white font-mono">19.2.3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Appwrite:</span>
                      <span className="text-white font-mono">21.5.0</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    💡 Aby zmienić wersję aplikacji, edytuj <code className="text-violet-400">package.json</code> w folderze <code className="text-violet-400">New/web/act-l/</code>
                  </p>
                </div>

                <Separator className="bg-white/5" />

                {/* Storage Info */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Dane lokalne
                  </label>
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">LocalStorage:</span>
                      <span className="text-white">
                        {typeof window !== 'undefined' ? Object.keys(localStorage).length : 0} kluczy
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Onboarding:</span>
                      <Badge variant="secondary" className="text-xs">
                        {typeof window !== 'undefined' && localStorage.getItem('quark_onboarding_complete') === 'true' ? 'Ukończony' : 'Nieukończony'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Cache gier:</span>
                      <span className="text-white">{games.length} gier</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/5" />

                {/* Clear Cache */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Wyczyść cache
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="gap-2 rounded-xl border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const settings = localStorage.getItem('quark_settings');
                          localStorage.clear();
                          if (settings) localStorage.setItem('quark_settings', settings);
                          window.location.reload();
                        }
                      }}
                    >
                      <Trash className="h-4 w-4" />
                      Wyczyść cache
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 rounded-xl border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('quark_onboarding_complete');
                          window.location.reload();
                        }
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resetuj onboarding
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Wyczyść cache aby odświeżyć dane. Resetuj onboarding aby ponownie przejść przez konfigurację.
                  </p>
                </div>

                <Separator className="bg-white/5" />

                {/* Full Reset */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Pełny reset aplikacji
                  </label>
                  {!showResetConfirm ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => setShowResetConfirm(true)}
                    >
                      <Trash className="h-4 w-4" />
                      Resetuj program
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">
                          ⚠️ To usunie wszystkie dane: konto, ustawienia, cache, onboarding. Ta operacja jest nieodwracalna!
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="gap-2 rounded-xl border-white/10 text-zinc-400"
                          onClick={() => setShowResetConfirm(false)}
                        >
                          Anuluj
                        </Button>
                        <Button
                          className="gap-2 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                          onClick={async () => {
                            try {
                              // Wyloguj użytkownika
                              await logout();
                              // Wyczyść wszystkie dane
                              if (typeof window !== 'undefined') {
                                localStorage.clear();
                                sessionStorage.clear();
                                // Wyczyść cookies
                                document.cookie.split(';').forEach(c => {
                                  document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                                });
                              }
                              // Przeładuj stronę
                              window.location.href = '/';
                            } catch (err) {
                              console.error('Reset error:', err);
                            }
                          }}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          TAK, resetuj wszystko
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500">
                    Usuwa całą konfigurację, konto użytkownika i przywraca aplikację do stanu początkowego.
                  </p>
                </div>

                {/* Debug Info */}
                <Separator className="bg-white/5" />
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400">Informacje debugowania</label>
                  <div className="p-3 rounded-xl bg-zinc-800/50 border border-white/5 font-mono text-xs space-y-1">
                    <div className="text-zinc-500">Environment: <span className="text-white">{process.env.NODE_ENV || 'development'}</span></div>
                    <div className="text-zinc-500">User Agent: <span className="text-white break-all">{typeof window !== 'undefined' ? window.navigator.userAgent.substring(0, 50) + '...' : 'N/A'}</span></div>
                    <div className="text-zinc-500">Screen: <span className="text-white">{typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
