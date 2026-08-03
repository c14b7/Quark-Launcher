import pl from '../messages/pl.json';
import en from '../messages/en.json';

export type AppLocale = 'pl' | 'en';

export const messages: Record<AppLocale, typeof pl> = { pl, en };

export const defaultLocale: AppLocale = 'pl';

/** Walk the messages tree and replace every leaf with its full key path (e.g. nav.chat). */
export function messagesAsKeyPaths(tree: unknown, prefix = ''): typeof pl {
  if (tree === null || typeof tree !== 'object' || Array.isArray(tree)) {
    return (prefix || String(tree)) as unknown as typeof pl;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tree as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = messagesAsKeyPaths(value, path);
    } else {
      out[key] = path;
    }
  }
  return out as typeof pl;
}
