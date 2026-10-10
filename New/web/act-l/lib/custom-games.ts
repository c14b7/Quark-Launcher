import type { Game, GameKind } from '@/lib/types';

const STORAGE_KEY = 'customGames';

export type CustomGameRecord = Pick<
  Game,
  | 'id'
  | 'name'
  | 'platform'
  | 'gamePath'
  | 'launchArgs'
  | 'launchProtocol'
  | 'kind'
  | 'coverPath'
  | 'installDir'
  | 'image'
  | 'hero'
  | 'logo'
  | 'capsule'
  | 'background'
  | 'detected'
  | 'genres'
  | 'developers'
>;

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215">
      <rect fill="#18181b" width="460" height="215"/>
      <text x="230" y="112" fill="#d4ff00" font-family="sans-serif" font-size="28" text-anchor="middle">QUARK</text>
    </svg>`
  );

export function placeholderArt(name: string): Pick<Game, 'image' | 'hero' | 'logo' | 'capsule' | 'background'> {
  const label = name.slice(0, 18);
  const svg =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#27272a"/><stop offset="100%" stop-color="#09090b"/>
        </linearGradient></defs>
        <rect fill="url(#g)" width="460" height="215"/>
        <text x="230" y="118" fill="#d4ff00" font-family="sans-serif" font-size="22" text-anchor="middle">${escapeXml(label)}</text>
      </svg>`
    );
  return {
    image: svg,
    hero: svg,
    logo: PLACEHOLDER,
    capsule: svg,
    background: svg,
  };
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function newCustomGameId(kind: GameKind = 'manual') {
  return `custom_${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function loadCustomGames(): Promise<CustomGameRecord[]> {
  if (typeof window === 'undefined' || !window.electronAPI?.loadUserData) return [];
  try {
    const r = await window.electronAPI.loadUserData(STORAGE_KEY);
    if (r.success && Array.isArray(r.data)) return r.data as CustomGameRecord[];
  } catch {
    /* ignore */
  }
  return [];
}

export async function saveCustomGames(games: CustomGameRecord[]): Promise<void> {
  if (typeof window === 'undefined' || !window.electronAPI?.saveUserData) return;
  await window.electronAPI.saveUserData(STORAGE_KEY, games);
}

export async function customRecordToGame(rec: CustomGameRecord): Promise<Game> {
  const art = rec.coverPath
    ? {
        image: rec.coverPath,
        hero: rec.coverPath,
        logo: rec.coverPath,
        capsule: rec.coverPath,
        background: rec.coverPath,
      }
    : rec.image
      ? {
          image: rec.image,
          hero: rec.hero || rec.image,
          logo: rec.logo || rec.image,
          capsule: rec.capsule || rec.image,
          background: rec.background || rec.image,
        }
      : placeholderArt(rec.name);

  let installed = Boolean(rec.gamePath || rec.launchProtocol);
  if (rec.gamePath && window.electronAPI?.checkFileExists) {
    try {
      installed = await window.electronAPI.checkFileExists(rec.gamePath);
    } catch {
      installed = false;
    }
  }

  return {
    id: rec.id,
    name: rec.name,
    platform: 'custom',
    installed,
    installDir: rec.installDir,
    gamePath: rec.gamePath,
    launchArgs: rec.launchArgs,
    launchProtocol: rec.launchProtocol,
    kind: rec.kind || 'manual',
    coverPath: rec.coverPath,
    detected: rec.detected,
    genres: rec.genres || (rec.kind?.startsWith('minecraft') ? ['Minecraft'] : undefined),
    developers: rec.developers,
    ...art,
  };
}

export function isMinecraftKind(kind?: GameKind | string) {
  return Boolean(kind && String(kind).startsWith('minecraft'));
}
