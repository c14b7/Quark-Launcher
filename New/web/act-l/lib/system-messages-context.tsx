'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSettings } from '@/lib/settings-context';
import {
  fetchSystemMessages,
  getMessageSummary,
  type SystemMessage,
} from '@/lib/system-messages-service';

const READS_KEY = 'quark-system-message-reads';
const FORCE_SHOWN_KEY = 'quark-system-force-shown';
const HISTORY_MS = 30 * 24 * 60 * 60 * 1000;
const POLL_MS = 5 * 60 * 1000;

type ReadMap = Record<string, string>;

interface SystemMessagesContextValue {
  messages: SystemMessage[];
  visibleMessages: SystemMessage[];
  unreadCount: number;
  openMessageId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  isRead: (id: string) => boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  openMessage: (id: string) => void;
  closeMessage: () => void;
  getSummary: (msg: SystemMessage) => string;
}

const SystemMessagesContext = createContext<SystemMessagesContextValue | null>(null);

function loadReads(): ReadMap {
  try {
    const raw = localStorage.getItem(READS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ReadMap | string[];
    // migrate legacy string[] → map
    if (Array.isArray(parsed)) {
      const map: ReadMap = {};
      const now = new Date().toISOString();
      parsed.forEach((id) => {
        if (typeof id === 'string') map[id] = now;
      });
      return map;
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveReads(map: ReadMap) {
  try {
    localStorage.setItem(READS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function loadForceShown(): string[] {
  try {
    const raw = localStorage.getItem(FORCE_SHOWN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveForceShown(ids: string[]) {
  try {
    localStorage.setItem(FORCE_SHOWN_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function pruneReads(map: ReadMap): ReadMap {
  const cutoff = Date.now() - HISTORY_MS;
  const next: ReadMap = {};
  for (const [id, at] of Object.entries(map)) {
    const t = new Date(at).getTime();
    if (!Number.isNaN(t) && t >= cutoff) next[id] = at;
  }
  return next;
}

export function SystemMessagesProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const locale = settings.locale === 'en' ? 'en' : 'pl';
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [reads, setReads] = useState<ReadMap>({});
  const [forceShown, setForceShown] = useState<string[]>([]);
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setReads(pruneReads(loadReads()));
    setForceShown(loadForceShown());
    setHydrated(true);
  }, []);

  const refresh = useCallback(async () => {
    const list = await fetchSystemMessages(locale);
    setMessages(list);
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    if (!hydrated) return;
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [hydrated, refresh]);

  const isRead = useCallback((id: string) => Boolean(reads[id]), [reads]);

  const visibleMessages = useMemo(() => {
    const cutoff = Date.now() - HISTORY_MS;
    return messages.filter((m) => {
      const readAt = reads[m.$id];
      if (!readAt) return true;
      const t = new Date(readAt).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
  }, [messages, reads]);

  const unreadCount = useMemo(
    () => visibleMessages.filter((m) => !reads[m.$id]).length,
    [visibleMessages, reads]
  );

  const markRead = useCallback((id: string) => {
    setReads((prev) => {
      if (prev[id]) return prev;
      const next = pruneReads({ ...prev, [id]: new Date().toISOString() });
      saveReads(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReads((prev) => {
      const next = { ...prev };
      const now = new Date().toISOString();
      visibleMessages.forEach((m) => {
        if (!next[m.$id]) next[m.$id] = now;
      });
      const pruned = pruneReads(next);
      saveReads(pruned);
      return pruned;
    });
  }, [visibleMessages]);

  const openMessage = useCallback(
    (id: string) => {
      markRead(id);
      setOpenMessageId(id);
    },
    [markRead]
  );

  const closeMessage = useCallback(() => setOpenMessageId(null), []);

  // force_open once per message id
  useEffect(() => {
    if (!hydrated || loading || openMessageId) return;
    const candidate = messages.find(
      (m) => m.force_open && !reads[m.$id] && !forceShown.includes(m.$id)
    );
    if (!candidate) return;
    const nextShown = [...forceShown, candidate.$id];
    setForceShown(nextShown);
    saveForceShown(nextShown);
    openMessage(candidate.$id);
  }, [hydrated, loading, messages, reads, forceShown, openMessageId, openMessage]);

  const value = useMemo<SystemMessagesContextValue>(
    () => ({
      messages,
      visibleMessages,
      unreadCount,
      openMessageId,
      loading,
      refresh,
      isRead,
      markRead,
      markAllRead,
      openMessage,
      closeMessage,
      getSummary: getMessageSummary,
    }),
    [
      messages,
      visibleMessages,
      unreadCount,
      openMessageId,
      loading,
      refresh,
      isRead,
      markRead,
      markAllRead,
      openMessage,
      closeMessage,
    ]
  );

  return (
    <SystemMessagesContext.Provider value={value}>{children}</SystemMessagesContext.Provider>
  );
}

export function useSystemMessages(): SystemMessagesContextValue {
  const ctx = useContext(SystemMessagesContext);
  if (!ctx) {
    throw new Error('useSystemMessages must be used within SystemMessagesProvider');
  }
  return ctx;
}
