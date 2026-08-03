'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Boxes,
  ClipboardCopy,
  Database,
  Eraser,
  HardDrive,
  Megaphone,
  RefreshCw,
  Settings2,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getAppVersion } from '@/lib/build-env';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { useGames } from '@/lib/games-context';
import { getTelemetryConsent } from '@/lib/telemetry';
import { isDevUnlockedSession } from '@/lib/dev-unlock';
import {
  clearDevLog,
  getDevLog,
  pushDevLog,
  requestDevTest,
  startDevEventCapture,
  subscribeDevLog,
  type DevLogEntry,
  type DevLogSource,
} from '@/lib/dev-debug-bus';

type InspectorTab =
  | 'env'
  | 'settings'
  | 'storage'
  | 'registers'
  | 'events'
  | 'banners'
  | 'system'
  | 'actions';

const TABS: { id: InspectorTab; label: string; icon: typeof Activity }[] = [
  { id: 'env', label: 'Env', icon: Boxes },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'storage', label: 'Storage', icon: Database },
  { id: 'registers', label: 'Rejestry', icon: HardDrive },
  { id: 'events', label: 'Zdarzenia', icon: Activity },
  { id: 'banners', label: 'Banery', icon: Megaphone },
  { id: 'system', label: 'System', icon: Terminal },
  { id: 'actions', label: 'Akcje', icon: Zap },
];

function safeJson(value: unknown, space = 2): string {
  try {
    return JSON.stringify(value, null, space);
  } catch {
    return String(value);
  }
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  const text = safeJson(value);
  return (
    <div className={cn('relative group', className)}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="absolute right-2 top-2 h-7 opacity-0 group-hover:opacity-100 text-zinc-400"
        onClick={() => copyText(text)}
      >
        <ClipboardCopy className="h-3.5 w-3.5" />
      </Button>
      <pre className="rounded-lg bg-black/40 border border-white/5 p-3 text-[11px] leading-relaxed text-zinc-300 overflow-auto max-h-[60vh] font-mono whitespace-pre-wrap break-all">
        {text}
      </pre>
    </div>
  );
}

function sourceColor(source: DevLogSource): string {
  switch (source) {
    case 'telemetry':
      return 'bg-violet-500/20 text-violet-200 border-violet-500/30';
    case 'window':
      return 'bg-sky-500/20 text-sky-200 border-sky-500/30';
    case 'error':
      return 'bg-red-500/20 text-red-200 border-red-500/30';
    case 'test':
      return 'bg-orange-500/20 text-orange-200 border-orange-500/30';
    case 'ipc':
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30';
    default:
      return 'bg-zinc-500/20 text-zinc-200 border-zinc-500/30';
  }
}

interface DevInspectorProps {
  /** Standalone Electron window vs in-app panel */
  mode?: 'window' | 'panel';
  onClose?: () => void;
}

export function DevInspector({ mode = 'window', onClose }: DevInspectorProps) {
  const [tab, setTab] = useState<InspectorTab>('env');
  const [log, setLog] = useState<DevLogEntry[]>([]);
  const [eventFilter, setEventFilter] = useState('');
  const [storageSnap, setStorageSnap] = useState<Record<string, string>>({});
  const [sessionSnap, setSessionSnap] = useState<Record<string, string>>({});
  const [userDataKeys, setUserDataKeys] = useState<string[]>([]);
  const [userDataPreview, setUserDataPreview] = useState<Record<string, unknown>>({});
  const [systemInfo, setSystemInfo] = useState<Record<string, unknown> | null>(null);
  const [gameSession, setGameSession] = useState<Record<string, unknown> | null>(null);
  const [tick, setTick] = useState(0);

  const { settings } = useSettings();
  const { user, profile, isAuthenticated } = useAuth();
  const { games } = useGames();

  useEffect(() => {
    startDevEventCapture();
    setLog(getDevLog());
    return subscribeDevLog(() => setLog(getDevLog()));
  }, []);

  const refreshStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    const ls: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) ls[key] = localStorage.getItem(key) ?? '';
    }
    const ss: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) ss[key] = sessionStorage.getItem(key) ?? '';
    }
    setStorageSnap(ls);
    setSessionSnap(ss);
    setTick((t) => t + 1);
  }, []);

  const refreshRegisters = useCallback(async () => {
    refreshStorage();
    if (!window.electronAPI?.listUserDataKeys) {
      setUserDataKeys([]);
      setUserDataPreview({});
      return;
    }
    const listed = await window.electronAPI.listUserDataKeys();
    const keys = listed.success ? listed.keys ?? [] : [];
    setUserDataKeys(keys);
    const preview: Record<string, unknown> = {};
    for (const key of keys.slice(0, 40)) {
      const res = await window.electronAPI.loadUserData(key);
      preview[key] = res.data;
    }
    setUserDataPreview(preview);
  }, [refreshStorage]);

  const refreshSystem = useCallback(async () => {
    if (window.electronAPI?.getSystemInfo) {
      setSystemInfo(await window.electronAPI.getSystemInfo());
    } else {
      setSystemInfo({
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        language: navigator.language,
      });
    }
    if (window.electronAPI?.getGameSessionState) {
      setGameSession(await window.electronAPI.getGameSessionState());
    }
  }, []);

  useEffect(() => {
    refreshStorage();
    void refreshRegisters();
    void refreshSystem();
  }, [refreshStorage, refreshRegisters, refreshSystem]);

  useEffect(() => {
    if (tab === 'storage' || tab === 'registers') void refreshRegisters();
    if (tab === 'system') void refreshSystem();
    if (tab === 'settings') refreshStorage();
  }, [tab, refreshRegisters, refreshSystem, refreshStorage]);

  const envVars = useMemo(
    () => ({
      NEXT_PUBLIC_APP_VERSION: getAppVersion(),
      NODE_ENV: process.env.NODE_ENV,
      isElectron: typeof window !== 'undefined' && !!window.electronAPI,
      electronVersions: typeof window !== 'undefined' ? window.electronAPI?.versions : undefined,
      platform: typeof window !== 'undefined' ? window.electronAPI?.platform ?? navigator.platform : undefined,
      href: typeof window !== 'undefined' ? window.location.href : undefined,
      online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
      gamesCached: games.length,
      auth: { isAuthenticated, userId: user?.$id, displayName: profile?.displayName },
      telemetryConsent: getTelemetryConsent(),
      devUnlocked: isDevUnlockedSession(),
      refreshedAt: tick,
    }),
    [games.length, isAuthenticated, user?.$id, profile?.displayName, tick]
  );

  const filteredLog = useMemo(() => {
    const q = eventFilter.trim().toLowerCase();
    if (!q) return log;
    return log.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        safeJson(e.data).toLowerCase().includes(q)
    );
  }, [log, eventFilter]);

  const shellClass =
    mode === 'window'
      ? 'fixed inset-0 z-[300] flex flex-col bg-[#0a0a0c] text-zinc-100'
      : 'fixed inset-4 z-[300] flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0c] text-zinc-100 shadow-2xl';

  return (
    <div className={shellClass}>
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-white">Quark Dev Inspector</h1>
          <p className="text-[11px] text-zinc-500">
            v{getAppVersion()} · podgląd zmiennych, rejestrów, zdarzeń i testów
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg border-white/10 h-8"
            onClick={() => {
              refreshStorage();
              void refreshRegisters();
              void refreshSystem();
              pushDevLog('system', 'inspector.refresh');
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Odśwież
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <nav className="w-44 shrink-0 border-r border-white/10 p-2 space-y-0.5 overflow-y-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                  tab === t.id
                    ? 'bg-orange-500/15 text-orange-100 border border-orange-500/30'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <ScrollArea className="flex-1 min-w-0">
          <div className="p-4 space-y-4">
            {tab === 'env' && (
              <section className="space-y-2">
                <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Zmienne / runtime</h2>
                <JsonBlock value={envVars} />
              </section>
            )}

            {tab === 'settings' && (
              <section className="space-y-2">
                <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">AppSettings (live)</h2>
                <JsonBlock value={settings} />
              </section>
            )}

            {tab === 'storage' && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                    localStorage ({Object.keys(storageSnap).length})
                  </h2>
                  <JsonBlock value={storageSnap} />
                </div>
                <Separator className="bg-white/5" />
                <div>
                  <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                    sessionStorage ({Object.keys(sessionSnap).length})
                  </h2>
                  <JsonBlock value={sessionSnap} />
                </div>
              </section>
            )}

            {tab === 'registers' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Electron userData/settings
                  </h2>
                  <Badge variant="secondary" className="text-[10px]">
                    {userDataKeys.length} plików
                  </Badge>
                </div>
                {userDataKeys.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    Brak kluczy albo poza Electronem. Klucze: settings/*.json w userData.
                  </p>
                ) : (
                  <JsonBlock value={userDataPreview} />
                )}
                <Separator className="bg-white/5" />
                <div>
                  <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                    Znane klucze localStorage
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(storageSnap)
                      .sort()
                      .map((k) => (
                        <Badge key={k} variant="outline" className="text-[10px] font-mono border-white/10">
                          {k}
                        </Badge>
                      ))}
                  </div>
                </div>
              </section>
            )}

            {tab === 'events' && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    placeholder="Filtruj zdarzenia…"
                    className="flex-1 min-w-[160px] h-8 rounded-lg bg-black/40 border border-white/10 px-2.5 text-xs text-white outline-none focus:border-orange-500/40"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-white/10"
                    onClick={() => clearDevLog()}
                  >
                    <Eraser className="h-3.5 w-3.5 mr-1.5" />
                    Wyczyść
                  </Button>
                  <Badge variant="secondary" className="text-[10px]">
                    {filteredLog.length}/{log.length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {filteredLog.length === 0 && (
                    <p className="text-xs text-zinc-500 py-6 text-center">Brak zdarzeń w buforze.</p>
                  )}
                  {filteredLog.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn('text-[9px] border', sourceColor(e.source))}>{e.source}</Badge>
                        <span className="font-mono text-zinc-200">{e.name}</span>
                        <span className="ml-auto text-zinc-600 font-mono">{e.ts}</span>
                      </div>
                      {e.data !== undefined && (
                        <pre className="text-zinc-500 font-mono whitespace-pre-wrap break-all max-h-28 overflow-auto">
                          {safeJson(e.data)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === 'banners' && (
              <section className="space-y-3">
                <p className="text-xs text-zinc-500">
                  Testy renderują się w oknie głównym launchera (BroadcastChannel). Zamknij inspector i sprawdź UI.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start border-white/10 h-auto py-3"
                    onClick={() => requestDevTest('update-banner')}
                  >
                    Test update banner
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start border-white/10 h-auto py-3"
                    onClick={() => requestDevTest('dialog-banner')}
                  >
                    Test dialog banner
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start border-white/10 h-auto py-3"
                    onClick={() => requestDevTest('side-banner')}
                  >
                    Test side banner
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start border-white/10 h-auto py-3"
                    onClick={() => requestDevTest('overlay-toast')}
                  >
                    Test overlay toast
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start border-white/10 h-auto py-3"
                    onClick={() => requestDevTest('os-notification')}
                  >
                    Test OS notification
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start border-white/10 h-auto py-3"
                    onClick={() => requestDevTest('custom-event')}
                  >
                    Emit quark-navigate → home
                  </Button>
                </div>
              </section>
            )}

            {tab === 'system' && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">System info</h2>
                  <JsonBlock value={systemInfo} />
                </div>
                <div>
                  <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Game session / overlay</h2>
                  <JsonBlock value={gameSession} />
                </div>
              </section>
            )}

            {tab === 'actions' && (
              <section className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-white/10"
                    onClick={async () => {
                      if (window.electronAPI?.openDevTools) {
                        await window.electronAPI.openDevTools();
                        pushDevLog('ipc', 'openDevTools');
                      }
                    }}
                  >
                    Otwórz Chromium DevTools
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/10"
                    onClick={() => {
                      pushDevLog('test', 'manual.ping', { at: Date.now() });
                    }}
                  >
                    Ping do logu zdarzeń
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/10"
                    onClick={() => {
                      console.log('[DevInspector]', { settings, envVars, storageSnap, userDataPreview });
                      pushDevLog('system', 'console.dump');
                    }}
                  >
                    Dump do console
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/10"
                    onClick={() => {
                      copyText(
                        safeJson({
                          env: envVars,
                          settings,
                          storage: storageSnap,
                          userData: userDataPreview,
                          events: log.slice(0, 50),
                        })
                      );
                      pushDevLog('system', 'clipboard.export');
                    }}
                  >
                    Kopiuj snapshot JSON
                  </Button>
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
