const SESSIONS_KEY = 'playSessions';
const MAX_SESSIONS = 800;

export interface PlaySession {
  id: string;
  gameId: string;
  gameName?: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  source: 'launch' | 'seed' | 'manual';
}

export interface ActiveSession {
  id: string;
  gameId: string;
  gameName?: string;
  startedAt: string;
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadPlaySessions(): Promise<PlaySession[]> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.loadUserData(SESSIONS_KEY);
      if (result.success && Array.isArray(result.data)) {
        return result.data as PlaySession[];
      }
    }
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(`quark-${SESSIONS_KEY}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as PlaySession[];
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

export async function persistPlaySessions(sessions: PlaySession[]): Promise<void> {
  const trimmed = sessions.slice(0, MAX_SESSIONS);
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.saveUserData(SESSIONS_KEY, trimmed);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`quark-${SESSIONS_KEY}`, JSON.stringify(trimmed));
    }
  } catch {
    /* ignore */
  }
}

const ACTIVE_KEY = 'quark-active-play-session';

export function getActiveSession(): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}

export function setActiveSession(session: ActiveSession | null): void {
  if (typeof window === 'undefined') return;
  if (!session) sessionStorage.removeItem(ACTIVE_KEY);
  else sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
}

export async function startPlaySession(
  gameId: string,
  gameName?: string,
  source: PlaySession['source'] = 'launch'
): Promise<PlaySession> {
  // Close previous open session first
  await endActivePlaySession();

  const startedAt = new Date().toISOString();
  const session: PlaySession = {
    id: newId(),
    gameId,
    gameName,
    startedAt,
    source,
  };
  setActiveSession({ id: session.id, gameId, gameName, startedAt });

  const all = await loadPlaySessions();
  await persistPlaySessions([session, ...all]);
  return session;
}

export async function endActivePlaySession(endedAt = new Date()): Promise<PlaySession | null> {
  const active = getActiveSession();
  if (!active) return null;

  const endIso = endedAt.toISOString();
  const durationSec = Math.max(
    0,
    Math.round((endedAt.getTime() - new Date(active.startedAt).getTime()) / 1000)
  );

  const all = await loadPlaySessions();
  const idx = all.findIndex((s) => s.id === active.id);
  let updated: PlaySession;
  if (idx >= 0) {
    updated = { ...all[idx], endedAt: endIso, durationSec };
    all[idx] = updated;
  } else {
    updated = {
      id: active.id,
      gameId: active.gameId,
      gameName: active.gameName,
      startedAt: active.startedAt,
      endedAt: endIso,
      durationSec,
      source: 'launch',
    };
    all.unshift(updated);
  }
  await persistPlaySessions(all);
  setActiveSession(null);
  return updated;
}

export async function clearPlaySessions(): Promise<void> {
  setActiveSession(null);
  await persistPlaySessions([]);
}

/** Dev helper: generate N fake closed sessions across known gameIds. */
export async function seedPlaySessions(
  gameIds: { id: string; name: string }[],
  count = 20
): Promise<PlaySession[]> {
  if (gameIds.length === 0) return [];
  const now = Date.now();
  const seeded: PlaySession[] = [];
  for (let i = 0; i < count; i++) {
    const g = gameIds[i % gameIds.length];
    const durationSec = 600 + Math.floor(Math.random() * 7200);
    const startedAt = new Date(now - i * 3600_000 - durationSec * 1000).toISOString();
    const endedAt = new Date(now - i * 3600_000).toISOString();
    seeded.push({
      id: newId(),
      gameId: g.id,
      gameName: g.name,
      startedAt,
      endedAt,
      durationSec,
      source: 'seed',
    });
  }
  const existing = await loadPlaySessions();
  const next = [...seeded, ...existing].slice(0, MAX_SESSIONS);
  await persistPlaySessions(next);
  return seeded;
}
