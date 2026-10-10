import whatsNewData from '@/content/whats-new.json';
import { getAppVersion } from '@/lib/build-env';

const STORAGE_KEY = 'quark-last-seen-whats-new';

export interface WhatsNewEntry {
  version: string;
  title: string;
  titlePl?: string;
  bullets: string[];
  bulletsPl?: string[];
}

export function getWhatsNewCatalog(): WhatsNewEntry[] {
  return (whatsNewData as { entries: WhatsNewEntry[] }).entries || [];
}

export function getLastSeenWhatsNewVersion(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export async function setLastSeenWhatsNewVersion(version: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, version);
  try {
    await window.electronAPI?.saveUserData?.(STORAGE_KEY, version);
  } catch {
    /* ignore */
  }
}

export async function loadLastSeenWhatsNewVersion(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    if (window.electronAPI?.loadUserData) {
      const r = await window.electronAPI.loadUserData(STORAGE_KEY);
      if (r.success && typeof r.data === 'string') {
        localStorage.setItem(STORAGE_KEY, r.data);
        return r.data;
      }
    }
  } catch {
    /* ignore */
  }
  return getLastSeenWhatsNewVersion();
}

/** Compare semver-ish strings; returns true if a > b */
export function isVersionNewer(a: string, b: string | null): boolean {
  if (!b) return true;
  const pa = a.replace(/^v/, '').split(/[-.+]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/^v/, '').split(/[-.+]/).map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return true;
    if (da < db) return false;
  }
  return a !== b && a.localeCompare(b) > 0;
}

export function getPendingWhatsNew(locale: string = 'en'): WhatsNewEntry | null {
  const version = getAppVersion();
  const last = getLastSeenWhatsNewVersion();
  if (!isVersionNewer(version, last)) return null;
  const entries = getWhatsNewCatalog();
  const match =
    entries.find((e) => e.version === version) ||
    entries.find((e) => isVersionNewer(version, e.version)) ||
    entries[0];
  if (!match) return null;
  if (locale.startsWith('pl')) {
    return {
      ...match,
      title: match.titlePl || match.title,
      bullets: match.bulletsPl || match.bullets,
    };
  }
  return match;
}
