const SESSION_KEY = 'quark_dev_unlocked';
export const DEV_UNLOCK_SEARCH = 'dev:5827';

type Listener = () => void;
const listeners = new Set<Listener>();

export function isDevUnlockedSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function isDevUnlockSearch(query: string): boolean {
  return query.trim().toLowerCase() === DEV_UNLOCK_SEARCH;
}

export function unlockDevSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, 'true');
  listeners.forEach((fn) => fn());
  window.dispatchEvent(new CustomEvent('quark-dev-unlocked'));
}

export function subscribeDevUnlock(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
