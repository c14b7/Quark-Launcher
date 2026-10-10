/** Overlay config v2 — visibility + theme + layout (%, anchors). */

export type OverlayWidgetId = 'logo' | 'perf' | 'media' | 'toasts';
export type OverlayAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type OverlayEditorAspect = '16:9' | '21:9';
export type OverlayThemeId = 'lime' | 'ghost' | 'contrast';
export type OverlayPresetId = 'classic' | 'corners' | 'minimal' | 'media';

export interface OverlayTheme {
  id: OverlayThemeId;
  accent: string;
  panelBg: string;
  textPrimary: string;
  textMuted: string;
  blurPx: number;
  radiusPx: number;
  fontId: string;
}

export interface OverlayWidgetLayout {
  x: number;
  y: number;
  anchor: OverlayAnchor;
}

export interface OverlayVisibility {
  showLogo: boolean;
  showCpu: boolean;
  showGpu: boolean;
  showFps: boolean;
  showCpuChart: boolean;
  showRam: boolean;
  showSessionTimer: boolean;
  showDateTime: boolean;
  showPing: boolean;
  showChatNotifications: boolean;
  chatNotificationsWhenHidden: boolean;
  showNowPlaying: boolean;
}

export interface OverlaySettings extends OverlayVisibility {
  version: 2;
  scale: number;
  themeId: OverlayThemeId;
  theme?: Partial<OverlayTheme>;
  layout: Record<OverlayWidgetId, OverlayWidgetLayout>;
  presetId: OverlayPresetId;
  editorAspect: OverlayEditorAspect;
  editMode?: boolean;
}

/** @deprecated flat v1 — migrated via migrateOverlaySettings */
export type OverlaySettingsV1 = Partial<OverlayVisibility>;

export const OVERLAY_THEMES: Record<OverlayThemeId, OverlayTheme> = {
  lime: {
    id: 'lime',
    accent: '#d4ff00',
    panelBg: 'rgba(8, 8, 12, 0.55)',
    textPrimary: '#ffffff',
    textMuted: 'rgba(255,255,255,0.55)',
    blurPx: 8,
    radiusPx: 10,
    fontId: 'array',
  },
  ghost: {
    id: 'ghost',
    accent: '#f4f4f5',
    panelBg: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#fafafa',
    textMuted: 'rgba(255,255,255,0.5)',
    blurPx: 12,
    radiusPx: 14,
    fontId: 'system',
  },
  contrast: {
    id: 'contrast',
    accent: '#ffffff',
    panelBg: 'rgba(0, 0, 0, 0.85)',
    textPrimary: '#ffffff',
    textMuted: 'rgba(255,255,255,0.7)',
    blurPx: 0,
    radiusPx: 4,
    fontId: 'system',
  },
};

export const CLASSIC_LAYOUT: Record<OverlayWidgetId, OverlayWidgetLayout> = {
  logo: { x: 1.2, y: 1.5, anchor: 'top-left' },
  media: { x: 50, y: 1.5, anchor: 'top-left' },
  perf: { x: 1.2, y: 1.5, anchor: 'top-right' },
  toasts: { x: 50, y: 12, anchor: 'top-left' },
};

export const OVERLAY_PRESETS: Record<
  OverlayPresetId,
  { layout: Record<OverlayWidgetId, OverlayWidgetLayout>; label: string }
> = {
  classic: { label: 'Classic', layout: { ...CLASSIC_LAYOUT } },
  corners: {
    label: 'Corners',
    layout: {
      logo: { x: 1.2, y: 1.5, anchor: 'top-left' },
      media: { x: 1.2, y: 1.5, anchor: 'bottom-left' },
      perf: { x: 1.2, y: 1.5, anchor: 'top-right' },
      toasts: { x: 1.2, y: 1.5, anchor: 'bottom-right' },
    },
  },
  minimal: {
    label: 'Minimal',
    layout: {
      logo: { x: 1.2, y: 1.5, anchor: 'top-left' },
      media: { x: 50, y: 2, anchor: 'top-left' },
      perf: { x: 1.2, y: 1.5, anchor: 'top-right' },
      toasts: { x: 50, y: 14, anchor: 'top-left' },
    },
  },
  media: {
    label: 'Media focus',
    layout: {
      logo: { x: 1.2, y: 1.5, anchor: 'top-left' },
      media: { x: 50, y: 4, anchor: 'top-left' },
      perf: { x: 1.2, y: 1.5, anchor: 'bottom-right' },
      toasts: { x: 50, y: 18, anchor: 'top-left' },
    },
  },
};

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  version: 2,
  showLogo: true,
  showCpu: true,
  showGpu: true,
  showFps: true,
  showCpuChart: true,
  showRam: true,
  showSessionTimer: true,
  showDateTime: false,
  showPing: false,
  showChatNotifications: true,
  chatNotificationsWhenHidden: true,
  showNowPlaying: true,
  scale: 1,
  themeId: 'lime',
  layout: { ...CLASSIC_LAYOUT },
  presetId: 'classic',
  editorAspect: '16:9',
  editMode: false,
};

const VIS_KEYS: (keyof OverlayVisibility)[] = [
  'showLogo',
  'showCpu',
  'showGpu',
  'showFps',
  'showCpuChart',
  'showRam',
  'showSessionTimer',
  'showDateTime',
  'showPing',
  'showChatNotifications',
  'chatNotificationsWhenHidden',
  'showNowPlaying',
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeLayout(
  raw?: Partial<Record<OverlayWidgetId, Partial<OverlayWidgetLayout>>>
): Record<OverlayWidgetId, OverlayWidgetLayout> {
  const base = { ...CLASSIC_LAYOUT };
  (Object.keys(base) as OverlayWidgetId[]).forEach((id) => {
    const r = raw?.[id];
    if (!r) return;
    base[id] = {
      x: clamp(Number(r.x ?? base[id].x), 0, 100),
      y: clamp(Number(r.y ?? base[id].y), 0, 100),
      anchor: (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(
        String(r.anchor)
      )
        ? r.anchor
        : base[id].anchor) as OverlayAnchor,
    };
  });
  return base;
}

/** Migrate v1 boolean-only or partial → full v2 */
export function migrateOverlaySettings(raw?: unknown): OverlaySettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_OVERLAY_SETTINGS, layout: { ...CLASSIC_LAYOUT } };
  const o = raw as Record<string, unknown>;
  const vis: Partial<OverlayVisibility> = {};
  for (const k of VIS_KEYS) {
    if (typeof o[k] === 'boolean') vis[k] = o[k] as boolean;
  }
  const themeId =
    o.themeId === 'ghost' || o.themeId === 'contrast' || o.themeId === 'lime'
      ? (o.themeId as OverlayThemeId)
      : 'lime';
  const presetId =
    o.presetId === 'corners' ||
    o.presetId === 'minimal' ||
    o.presetId === 'media' ||
    o.presetId === 'classic'
      ? (o.presetId as OverlayPresetId)
      : 'classic';
  const editorAspect = o.editorAspect === '21:9' ? '21:9' : '16:9';
  const scale = clamp(Number(o.scale ?? 1) || 1, 0.75, 1.5);

  return {
    ...DEFAULT_OVERLAY_SETTINGS,
    ...vis,
    version: 2,
    scale,
    themeId,
    theme: o.theme && typeof o.theme === 'object' ? (o.theme as Partial<OverlayTheme>) : undefined,
    layout: normalizeLayout(o.layout as Partial<Record<OverlayWidgetId, Partial<OverlayWidgetLayout>>>),
    presetId,
    editorAspect,
    editMode: Boolean(o.editMode),
  };
}

export function mergeOverlaySettings(raw?: Partial<OverlaySettings> | OverlaySettingsV1): OverlaySettings {
  return migrateOverlaySettings(raw);
}

export function resolveOverlayTheme(cfg: OverlaySettings): OverlayTheme {
  const base = OVERLAY_THEMES[cfg.themeId] || OVERLAY_THEMES.lime;
  return { ...base, ...cfg.theme, id: cfg.themeId };
}

export function applyOverlayPreset(presetId: OverlayPresetId): Partial<OverlaySettings> {
  const p = OVERLAY_PRESETS[presetId] || OVERLAY_PRESETS.classic;
  return { presetId, layout: { ...p.layout } };
}

export function snapPercent(v: number, grid = 2): number {
  return clamp(Math.round(v / grid) * grid, 0, 100);
}

/** Keys shown as visibility toggles in Settings (exclude chat OS-only companion if needed) */
export const OVERLAY_VISIBILITY_TOGGLE_KEYS = VIS_KEYS;

export async function syncOverlayConfigToElectron(config: OverlaySettings): Promise<void> {
  if (typeof window === 'undefined' || !window.electronAPI?.overlayUpdateConfig) return;
  await window.electronAPI.overlayUpdateConfig(config);
}
