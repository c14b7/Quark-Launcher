import { Client, Databases, Query, type Models } from 'appwrite';

/** Same banner CMS database — Console-managed announcements. */
export const SYSTEM_MESSAGES_DB = '6a297ad10013177be1ab';
export const SYSTEM_MESSAGES_COLLECTION = 'system_messages';
export const SYSTEM_MESSAGES_PROJECT = '680d15210002f3f65ea9';
export const SYSTEM_MESSAGES_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';

export type SystemMessageType = 'update' | 'event' | 'changelog' | 'promo' | 'alert';
export type SystemMessagePriority = 'normal' | 'high';
export type SystemMessageLocale = 'all' | 'pl' | 'en';

export interface SystemMessage {
  $id: string;
  title: string;
  summary?: string | null;
  body_md: string;
  type: SystemMessageType;
  priority: SystemMessagePriority;
  image_url?: string | null;
  action_text?: string | null;
  action_url?: string | null;
  action_text_2?: string | null;
  action_url_2?: string | null;
  start_date: string;
  end_date?: string | null;
  locale: SystemMessageLocale;
  force_open: boolean;
  published: boolean;
  $createdAt?: string;
  $updatedAt?: string;
}

const client = new Client()
  .setEndpoint(SYSTEM_MESSAGES_ENDPOINT)
  .setProject(SYSTEM_MESSAGES_PROJECT);

const databases = new Databases(client);

function asMessage(doc: Models.Document): SystemMessage {
  const d = doc as Models.Document & Record<string, unknown>;
  const type = String(d.type || 'update') as SystemMessageType;
  const priority = (String(d.priority || 'normal') as SystemMessagePriority) || 'normal';
  const locale = (String(d.locale || 'all') as SystemMessageLocale) || 'all';
  return {
    $id: doc.$id,
    title: String(d.title || ''),
    summary: d.summary != null ? String(d.summary) : null,
    body_md: String(d.body_md || ''),
    type: ['update', 'event', 'changelog', 'promo', 'alert'].includes(type) ? type : 'update',
    priority: priority === 'high' ? 'high' : 'normal',
    image_url: d.image_url != null ? String(d.image_url) : null,
    action_text: d.action_text != null ? String(d.action_text) : null,
    action_url: d.action_url != null ? String(d.action_url) : null,
    action_text_2: d.action_text_2 != null ? String(d.action_text_2) : null,
    action_url_2: d.action_url_2 != null ? String(d.action_url_2) : null,
    start_date: String(d.start_date || doc.$createdAt),
    end_date: d.end_date != null ? String(d.end_date) : null,
    locale: ['all', 'pl', 'en'].includes(locale) ? locale : 'all',
    force_open: Boolean(d.force_open),
    published: d.published !== false,
    $createdAt: doc.$createdAt,
    $updatedAt: doc.$updatedAt,
  };
}

export function getMessageSummary(msg: SystemMessage): string {
  if (msg.summary?.trim()) return msg.summary.trim();
  const plain = msg.body_md.replace(/[#*_`\[\]()!]/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.slice(0, 120) + (plain.length > 120 ? '…' : '');
}

export function isMessageActive(msg: SystemMessage, now = new Date()): boolean {
  if (!msg.published) return false;
  const start = new Date(msg.start_date);
  if (Number.isNaN(start.getTime()) || start > now) return false;
  if (msg.end_date) {
    const end = new Date(msg.end_date);
    if (!Number.isNaN(end.getTime()) && end < now) return false;
  }
  return true;
}

export function matchesLocale(msg: SystemMessage, locale: 'pl' | 'en'): boolean {
  return msg.locale === 'all' || msg.locale === locale;
}

export function sortMessages(a: SystemMessage, b: SystemMessage): number {
  if (a.priority === 'high' && b.priority !== 'high') return -1;
  if (b.priority === 'high' && a.priority !== 'high') return 1;
  return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
}

/** Fetch raw list from Appwrite; filter client-side for locale/dates. */
export async function fetchSystemMessages(locale: 'pl' | 'en'): Promise<SystemMessage[]> {
  try {
    let response;
    try {
      response = await databases.listDocuments(SYSTEM_MESSAGES_DB, SYSTEM_MESSAGES_COLLECTION, [
        Query.equal('published', true),
        Query.orderDesc('start_date'),
        Query.limit(50),
      ]);
    } catch {
      response = await databases.listDocuments(SYSTEM_MESSAGES_DB, SYSTEM_MESSAGES_COLLECTION, [
        Query.orderDesc('start_date'),
        Query.limit(50),
      ]);
    }
    return response.documents
      .map(asMessage)
      .filter((m) => isMessageActive(m) && matchesLocale(m, locale))
      .sort(sortMessages);
  } catch (error) {
    console.warn('[SystemMessages] fetch failed:', error);
    return [];
  }
}

const DEEP_LINK_PREFIX = 'quark://view/';
const KNOWN_VIEWS = new Set([
  'home',
  'library',
  'store',
  'chat',
  'accounts',
  'news',
  'stats',
  'downloads',
  'recap',
]);

export function parseDeepLink(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith(DEEP_LINK_PREFIX)) return null;
  const view = trimmed.slice(DEEP_LINK_PREFIX.length).split(/[?#]/)[0]?.toLowerCase();
  if (!view || !KNOWN_VIEWS.has(view)) return null;
  return view;
}

export async function resolveSystemMessageAction(url: string): Promise<void> {
  const view = parseDeepLink(url);
  if (view) {
    if (view === 'recap') {
      window.dispatchEvent(new CustomEvent('quark-open-recap'));
      return;
    }
    window.dispatchEvent(new CustomEvent('quark-navigate', { detail: view }));
    return;
  }
  if (/^https?:\/\//i.test(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
