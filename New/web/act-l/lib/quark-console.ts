import {
  pushDevLog,
  requestDevTest,
  getDevLog,
  clearDevLog,
  type DevTestAction,
} from '@/lib/dev-debug-bus';
import { unlockDevSession, isDevUnlockedSession } from '@/lib/dev-unlock';
import {
  loadPlaySessions,
  clearPlaySessions,
  endActivePlaySession,
  seedPlaySessions,
  getActiveSession,
} from '@/lib/play-session-tracker';
import { loadLaunchStats, loadPlayHistory } from '@/lib/play-history';
import {
  buildLocalPublicSummary,
  syncStatsNow,
  getLastStatsSyncPayload,
  getStatsVisibility,
} from '@/lib/stats-sync-service';

export interface QuarkConsoleAPI {
  help: () => string;
  nav: (view: string) => void;
  stats: {
    local: () => Promise<unknown>;
    sync: () => Promise<unknown>;
    seed: (n?: number) => Promise<unknown>;
    clearSessions: () => Promise<void>;
    lastPayload: () => unknown;
    visibility: () => string;
  };
  sessions: {
    list: () => Promise<unknown>;
    active: () => unknown;
    end: () => Promise<unknown>;
  };
  categories: {
    rebuildAuto: () => void;
    list: () => unknown;
  };
  sysmsg: {
    refresh: () => void;
    open: (id: string) => void;
  };
  banners: {
    test: (kind: DevTestAction) => void;
  };
  friends: {
    presence: (activity: string, game?: { gameId?: string; name?: string }) => void;
  };
  storage: {
    get: (key: string) => Promise<unknown>;
    keys: () => string[];
  };
  i18n: {
    showKeys: (on: boolean) => void;
  };
  recap: {
    open: () => void;
  };
  dev: {
    unlock: () => void;
    inspector: () => void;
    devtools: () => Promise<unknown>;
    log: () => unknown;
    clearLog: () => void;
  };
}

declare global {
  interface Window {
    quark?: QuarkConsoleAPI;
  }
}

const HELP = `
Quark Dev Console — window.quark
================================
quark.help()
quark.nav('home'|'library'|'store'|'chat'|'accounts'|'news'|'stats')
quark.stats.local() | .sync() | .seed(20) | .clearSessions() | .lastPayload() | .visibility()
quark.sessions.list() | .active() | .end()
quark.categories.rebuildAuto() | .list()
quark.sysmsg.refresh() | .open(id)
quark.banners.test('update'|'dialog'|'side'|'overlay-toast'|'os-notification')
quark.friends.presence('playing', { gameId, name })
quark.storage.get(key) | .keys()
quark.i18n.showKeys(true|false)
quark.recap.open()
quark.dev.unlock() | .inspector() | .devtools() | .log() | .clearLog()

Docs: docs/DEV-CONSOLE.md
`.trim();

function emit(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
  pushDevLog('test', name, detail);
}

export function mountQuarkConsole(): QuarkConsoleAPI {
  const api: QuarkConsoleAPI = {
    help: () => {
      console.log(HELP);
      return HELP;
    },
    nav: (view: string) => emit('quark-navigate', view),
    stats: {
      local: async () => {
        const summary = await buildLocalPublicSummary();
        console.log(summary);
        return summary;
      },
      sync: async () => {
        const r = await syncStatsNow();
        console.log(r);
        return r;
      },
      seed: async (n = 20) => {
        emit('quark-dev-seed-sessions', n);
        return { queued: n };
      },
      clearSessions: async () => {
        await clearPlaySessions();
        pushDevLog('test', 'sessions.cleared');
      },
      lastPayload: () => getLastStatsSyncPayload(),
      visibility: () => getStatsVisibility(),
    },
    sessions: {
      list: async () => {
        const list = await loadPlaySessions();
        console.table(
          list.slice(0, 30).map((s) => ({
            game: s.gameName || s.gameId,
            start: s.startedAt,
            sec: s.durationSec,
          }))
        );
        return list;
      },
      active: () => getActiveSession(),
      end: async () => endActivePlaySession(),
    },
    categories: {
      rebuildAuto: () => emit('quark-dev-rebuild-auto-categories'),
      list: () => {
        try {
          const raw = localStorage.getItem('quark-settings');
          const parsed = raw ? JSON.parse(raw) : null;
          return parsed?.customCategories || [];
        } catch {
          return [];
        }
      },
    },
    sysmsg: {
      refresh: () => emit('quark-dev-sysmsg-refresh'),
      open: (id: string) => emit('quark-dev-sysmsg-open', id),
    },
    banners: {
      test: (kind) => requestDevTest(kind),
    },
    friends: {
      presence: (activity, game) =>
        emit('quark-dev-presence', { activity, gameId: game?.gameId, name: game?.name }),
    },
    storage: {
      get: async (key: string) => {
        if (window.electronAPI?.loadUserData) {
          return (await window.electronAPI.loadUserData(key)).data;
        }
        return localStorage.getItem(`quark-${key}`);
      },
      keys: () => {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) keys.push(k);
        }
        return keys.sort();
      },
    },
    i18n: {
      showKeys: (on: boolean) => emit('quark-dev-i18n-keys', on),
    },
    recap: {
      open: () => emit('quark-open-recap'),
    },
    dev: {
      unlock: () => {
        unlockDevSession();
        console.log('Dev unlocked:', isDevUnlockedSession());
      },
      inspector: () => emit('quark-open-dev-inspector'),
      devtools: async () => window.electronAPI?.openDevTools?.(),
      log: () => getDevLog(),
      clearLog: () => clearDevLog(),
    },
  };

  window.quark = api;
  pushDevLog('system', 'quark.console.mounted');
  console.info('%cQuark Dev Console ready — type quark.help()', 'color:#d4ff00');
  return api;
}

/** Seed handler needs games from React — listen in launcher. */
export async function runSeedSessions(
  games: { id: string; name: string }[],
  count: number
) {
  return seedPlaySessions(games, count);
}

export { loadLaunchStats, loadPlayHistory };
