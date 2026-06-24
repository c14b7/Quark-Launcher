'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Moon, Monitor, EyeOff, FolderPlus, Trash2, Bot, Server, Key, Shield, RefreshCw, Trash, Database, Info, AlertTriangle, ChevronDown, ChevronUp, Plus, Search, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/lib/settings-context';
import { useGames } from '@/lib/games-context';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { CategoryIcon, CATEGORY_ICON_OPTIONS, CATEGORY_COLOR_PRESETS, type CategoryIconId } from '@/lib/category-icons';
import { isDevSettingsEnabled, getAppVersion } from '@/lib/build-env';
import { getTelemetryConsent, updateTelemetryConsent } from '@/lib/telemetry';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const ts = useTranslations('settings');
  const { settings, updateSettings, unhideGame, addCategory, updateCategory, removeCategory, addGameToCategory, removeGameFromCategory } = useSettings();
  const { games } = useGames();
  const { logout } = useAuth();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'hidden' | 'categories' | 'ai' | 'privacy' | 'admin'>('general');
  const [telemetryConsent, setTelemetryConsent] = useState(getTelemetryConsent);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryGameSearch, setCategoryGameSearch] = useState('');

  const showDevSettings = isDevSettingsEnabled();
  const appVersion = getAppVersion();

  const settingsTabs = useMemo(
    () => [
      { id: 'general' as const, label: ts('tabs.general') },
      { id: 'hidden' as const, label: ts('tabs.hidden') },
      { id: 'categories' as const, label: ts('tabs.categories') },
      { id: 'privacy' as const, label: ts('tabs.privacy') },
      ...(showDevSettings ? [{ id: 'admin' as const, label: ts('tabs.admin') }] : []),
    ],
    [showDevSettings, ts]
  );

  useEffect(() => {
    if (!showDevSettings && activeTab === 'admin') {
      setActiveTab('general');
    }
  }, [showDevSettings, activeTab]);

  if (!isOpen) return null;

  const hiddenGamesData = games.filter(g => settings.hiddenGames.includes(g.id));

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory({
        name: newCategoryName.trim(),
        gameIds: [],
        color: getRandomColor(),
        icon: 'gamepad2',
      });
      setNewCategoryName('');
    }
  };

  const getRandomColor = () => {
    return CATEGORY_COLOR_PRESETS[Math.floor(Math.random() * CATEGORY_COLOR_PRESETS.length)];
  };

  const openDevTools = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.openDevTools) {
      await window.electronAPI.openDevTools();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal — stała szerokość, elastyczna wysokość z przewijaniem */}
      <div className="relative w-[48rem] max-w-[calc(100vw-2rem)] h-[min(85vh,720px)] bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">{ts('title')}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{ts('subtitle')}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs + content */}
        <div className="flex flex-1 min-h-0">
          <div className="w-44 shrink-0 border-r border-white/8 p-3 space-y-1 hidden sm:block">
            {settingsTabs.map(tab => (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start rounded-xl px-3',
                  activeTab === tab.id && 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                )}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex gap-1 p-3 border-b border-white/5 overflow-x-auto sm:hidden">
              {settingsTabs.map(tab => (
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

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-5">
            {activeTab === 'general' && (
              <>
                <div className="rounded-2xl border border-white/8 bg-zinc-900/50 p-5 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white">{ts('language')}</label>
                    <p className="text-xs text-zinc-500 mt-0.5">{ts('languageDesc')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 rounded-xl border-white/10 h-11',
                        settings.locale === 'pl' && 'bg-violet-500/10 border-violet-500 text-violet-200'
                      )}
                      onClick={() => updateSettings({ locale: 'pl' })}
                    >
                      {ts('polish')}
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 rounded-xl border-white/10 h-11',
                        settings.locale === 'en' && 'bg-violet-500/10 border-violet-500 text-violet-200'
                      )}
                      onClick={() => updateSettings({ locale: 'en' })}
                    >
                      {ts('english')}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-zinc-900/50 p-5 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white">{ts('theme')}</label>
                    <p className="text-xs text-zinc-500 mt-0.5">{ts('themeOledHint')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 gap-2 rounded-xl border-white/10 h-11',
                        settings.theme === 'dark' && 'bg-violet-500/10 border-violet-500 text-violet-200'
                      )}
                      onClick={() => updateSettings({ theme: 'dark' })}
                    >
                      <Moon className="h-4 w-4" />
                      {ts('themeDark')}
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 gap-2 rounded-xl border-white/10 h-11',
                        settings.theme === 'oled' && 'bg-violet-500/10 border-violet-500 text-violet-200'
                      )}
                      onClick={() => updateSettings({ theme: 'oled' })}
                    >
                      <Monitor className="h-4 w-4" />
                      {ts('themeOled')}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-zinc-900/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-white">{ts('uiScale')}</label>
                    <span className="text-sm font-mono text-violet-300">{Math.round(settings.uiScale * 100)}%</span>
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

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-2">
                  <label className="text-sm font-medium text-white">{ts('steamIntegration')}</label>
                  <p className="text-xs text-zinc-400 leading-relaxed">{ts('steamAccountHint')}</p>
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
                <p className="text-xs text-zinc-500">
                  Twórz kategorie i przypisuj gry. Możesz też użyć PPM na kafelku gry → Kategoria.
                </p>

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
                    className="gap-2 rounded-xl bg-violet-500 hover:bg-violet-600 shrink-0"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Dodaj
                  </Button>
                </div>

                <Separator className="bg-white/5" />

                {settings.customCategories.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <FolderPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Brak kategorii</p>
                    <p className="text-xs mt-1">Stwórz własne kategorie do organizacji gier</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {settings.customCategories.map((category) => {
                      const isExpanded = expandedCategory === category.id;
                      const categoryGames = games.filter((g) => category.gameIds.includes(g.id));
                      const availableGames = games
                        .filter((g) => !settings.hiddenGames.includes(g.id) && !category.gameIds.includes(g.id))
                        .filter((g) =>
                          !categoryGameSearch ||
                          g.name.toLowerCase().includes(categoryGameSearch.toLowerCase())
                        )
                        .slice(0, 8);

                      return (
                        <div
                          key={category.id}
                          className="rounded-xl bg-zinc-800/50 border border-white/5 overflow-hidden"
                        >
                          <div className="flex items-center gap-3 p-3">
                            <CategoryIcon icon={category.icon} color={category.color} className="h-4 w-4" />
                            <Input
                              value={category.name}
                              onChange={(e) => updateCategory(category.id, { name: e.target.value.slice(0, 32) })}
                              className="flex-1 h-8 text-sm rounded-lg bg-zinc-900/50 border-white/5"
                            />
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {category.gameIds.length}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 shrink-0"
                              onClick={() => {
                                setExpandedCategory(isExpanded ? null : category.id);
                                setCategoryGameSearch('');
                              }}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-500 hover:text-red-500 shrink-0"
                              onClick={() => removeCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
                              <div className="space-y-2">
                                <p className="text-[11px] text-zinc-500 font-medium">{ts('categoryColor')}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  {CATEGORY_COLOR_PRESETS.map((color) => (
                                    <button
                                      key={color}
                                      type="button"
                                      onClick={() => updateCategory(category.id, { color })}
                                      className={cn(
                                        'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                                        category.color === color ? 'border-white scale-110' : 'border-transparent'
                                      )}
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                  <input
                                    type="color"
                                    value={category.color}
                                    onChange={(e) => updateCategory(category.id, { color: e.target.value })}
                                    className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                                    title={ts('categoryCustomColor')}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-[11px] text-zinc-500 font-medium">{ts('categoryIcon')}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {CATEGORY_ICON_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => updateCategory(category.id, { icon: opt.id })}
                                      className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                                        (category.icon || 'gamepad2') === opt.id
                                          ? 'border-violet-500/50 bg-violet-500/10'
                                          : 'border-white/5 bg-zinc-900/50 hover:bg-zinc-800'
                                      )}
                                      title={opt.label}
                                    >
                                      <CategoryIcon icon={opt.id as CategoryIconId} color={category.color} className="h-4 w-4" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {categoryGames.length > 0 && (
                                <div className="space-y-1">
                                  {categoryGames.map((game) => (
                                    <div
                                      key={game.id}
                                      className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/50"
                                    >
                                      {game.image ? (
                                        <img src={game.image} alt="" className="w-10 h-5 object-cover rounded" />
                                      ) : (
                                        <div className="w-10 h-5 rounded bg-zinc-700" />
                                      )}
                                      <span className="flex-1 text-xs truncate">{game.name}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-zinc-500 hover:text-red-400"
                                        onClick={() => removeGameFromCategory(category.id, game.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                <Input
                                  placeholder="Dodaj grę do kategorii..."
                                  value={categoryGameSearch}
                                  onChange={(e) => setCategoryGameSearch(e.target.value)}
                                  className="pl-8 h-8 text-xs rounded-lg bg-zinc-900/50 border-white/5"
                                />
                              </div>

                              {availableGames.length > 0 ? (
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {availableGames.map((game) => (
                                    <button
                                      key={game.id}
                                      type="button"
                                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-900/80 text-left transition-colors"
                                      onClick={() => {
                                        addGameToCategory(category.id, game.id);
                                        setCategoryGameSearch('');
                                      }}
                                    >
                                      {game.image ? (
                                        <img src={game.image} alt="" className="w-10 h-5 object-cover rounded" />
                                      ) : (
                                        <div className="w-10 h-5 rounded bg-zinc-700" />
                                      )}
                                      <span className="flex-1 text-xs truncate text-zinc-300">{game.name}</span>
                                      <Plus className="h-3.5 w-3.5 text-violet-400" />
                                    </button>
                                  ))}
                                </div>
                              ) : categoryGameSearch ? (
                                <p className="text-xs text-zinc-500 text-center py-2">Brak wyników</p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/8 bg-zinc-900/50 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-white">{ts('privacyTitle')}</h3>
                    <p className="text-xs text-zinc-500 mt-1">{ts('privacyDesc')}</p>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2 border-t border-white/5">
                    <div>
                      <p className="text-sm text-white">{ts('analyticsEnabled')}</p>
                      <p className="text-xs text-zinc-500">{ts('analyticsEnabledDesc')}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-xl min-w-[4.5rem]',
                        telemetryConsent.analyticsEnabled && 'bg-violet-500/20 border-violet-500 text-violet-200'
                      )}
                      onClick={async () => {
                        const next = !telemetryConsent.analyticsEnabled;
                        await updateTelemetryConsent({ analyticsEnabled: next });
                        setTelemetryConsent(getTelemetryConsent());
                      }}
                    >
                      {telemetryConsent.analyticsEnabled ? ts('on') : ts('off')}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2 border-t border-white/5">
                    <div>
                      <p className="text-sm text-white">{ts('diagnosticsEnabled')}</p>
                      <p className="text-xs text-zinc-500">{ts('diagnosticsEnabledDesc')}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-xl min-w-[4.5rem]',
                        telemetryConsent.diagnosticsEnabled && 'bg-violet-500/20 border-violet-500 text-violet-200'
                      )}
                      onClick={async () => {
                        const next = !telemetryConsent.diagnosticsEnabled;
                        await updateTelemetryConsent({ diagnosticsEnabled: next });
                        setTelemetryConsent(getTelemetryConsent());
                      }}
                    >
                      {telemetryConsent.diagnosticsEnabled ? ts('on') : ts('off')}
                    </Button>
                  </div>

                  <p className="text-[11px] text-zinc-600 pt-2">{ts('privacyBetaNote')}</p>
                </div>
              </div>
            )}

            {activeTab === 'admin' && showDevSettings && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-5 w-5 text-red-400" />
                    <h3 className="font-semibold text-white">{ts('devPanelTitle')}</h3>
                  </div>
                  <p className="text-xs text-zinc-400">{ts('devPanelDesc')}</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    {ts('devTools')}
                  </label>
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-xl border-white/10"
                    onClick={openDevTools}
                  >
                    <Terminal className="h-4 w-4" />
                    {ts('openDevTools')}
                  </Button>
                  <p className="text-xs text-zinc-500">{ts('devToolsHint')}</p>
                </div>

                <Separator className="bg-white/5" />
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Informacje o wersji
                  </label>
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Wersja aplikacji:</span>
                      <span className="text-white font-mono">{appVersion}</span>
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
      </div>
    </div>
  );
}
