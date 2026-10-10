'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  OVERLAY_PRESETS,
  OVERLAY_THEMES,
  applyOverlayPreset,
  mergeOverlaySettings,
  resolveOverlayTheme,
  type OverlayEditorAspect,
  type OverlayPresetId,
  type OverlaySettings,
  type OverlayThemeId,
  type OverlayWidgetId,
} from '@/lib/overlay-settings';

interface OverlayEditorProps {
  value: OverlaySettings;
  onChange: (next: OverlaySettings) => void;
}

const WIDGET_IDS: OverlayWidgetId[] = ['logo', 'media', 'perf', 'toasts'];

export function OverlayEditor({ value, onChange }: OverlayEditorProps) {
  const t = useTranslations('settings');
  const widgets = WIDGET_IDS.map((id) => ({
    id,
    label:
      id === 'logo'
        ? t('overlayWidgetLogo')
        : id === 'media'
          ? t('overlayWidgetMedia')
          : id === 'perf'
            ? t('overlayWidgetPerf')
            : t('overlayWidgetToasts'),
  }));
  const cfg = mergeOverlaySettings(value);
  const theme = resolveOverlayTheme(cfg);
  const [selected, setSelected] = useState<OverlayWidgetId>('perf');
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const aspectRatio = cfg.editorAspect === '21:9' ? '21 / 9' : '16 / 9';

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onOverlayLayoutChanged) return;
    return api.onOverlayLayoutChanged((data) => {
      if (!data?.layout) return;
      const current = cfgRef.current;
      onChangeRef.current(
        mergeOverlaySettings({
          ...current,
          layout: { ...current.layout, ...(data.layout as OverlaySettings['layout']) },
        })
      );
    });
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onOverlayEditExited) return;
    return api.onOverlayEditExited((data) => {
      if (data?.config) {
        onChangeRef.current(mergeOverlaySettings(data.config as OverlaySettings));
        return;
      }
      if (data?.layout) {
        const current = cfgRef.current;
        onChangeRef.current(
          mergeOverlaySettings({
            ...current,
            layout: { ...current.layout, ...(data.layout as OverlaySettings['layout']) },
            editMode: false,
          })
        );
      }
    });
  }, []);

  const setAspect = (editorAspect: OverlayEditorAspect) =>
    onChange(mergeOverlaySettings({ ...cfg, editorAspect }));

  const setTheme = (themeId: OverlayThemeId) =>
    onChange(mergeOverlaySettings({ ...cfg, themeId }));

  const setScale = (scale: number) =>
    onChange(mergeOverlaySettings({ ...cfg, scale }));

  const setPreset = (presetId: OverlayPresetId) =>
    onChange(mergeOverlaySettings({ ...cfg, ...applyOverlayPreset(presetId) }));

  const resetLayout = () =>
    onChange(mergeOverlaySettings({ ...cfg, ...applyOverlayPreset('classic'), themeId: 'lime', scale: 1 }));

  const widgetPos = useMemo(() => cfg.layout[selected], [cfg.layout, selected]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['16:9', '21:9'] as OverlayEditorAspect[]).map((a) => (
          <Button
            key={a}
            size="sm"
            variant="outline"
            className={cn(
              'rounded-xl',
              cfg.editorAspect === a && 'bg-[#d4ff00]/15 border-[#d4ff00]/40 text-[#d4ff00]'
            )}
            onClick={() => setAspect(a)}
          >
            {a}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl border-white/10"
          onClick={() => void window.electronAPI?.overlayPreviewShow?.()}
        >
          {t('overlayPreview')}
        </Button>
        <Button
          size="sm"
          className="rounded-xl bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
          onClick={() => void window.electronAPI?.overlayEnterEditMode?.()}
        >
          {t('overlayEditLive')}
        </Button>
      </div>

      <div
        className="relative w-full rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black overflow-hidden"
        style={{ aspectRatio }}
      >
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_20%_20%,#d4ff00,transparent_40%)]" />
        {(Object.keys(cfg.layout) as OverlayWidgetId[]).map((id) => {
          const L = cfg.layout[id];
          const top = L.anchor.startsWith('top');
          const left = L.anchor.endsWith('left');
          const centerMedia = id === 'media' && left && Math.abs(L.x - 50) < 1.5;
          const style: CSSProperties = {
            position: 'absolute',
            [top ? 'top' : 'bottom']: `${L.y}%`,
            ...(centerMedia
              ? { left: '50%', transform: `translateX(-50%) scale(${cfg.scale})` }
              : {
                  [left ? 'left' : 'right']: `${L.x}%`,
                  transform: `scale(${cfg.scale})`,
                  transformOrigin: `${top ? 'top' : 'bottom'} ${left ? 'left' : 'right'}`,
                }),
          };
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={cn(
                'absolute rounded-lg border px-2 py-1 text-[10px] uppercase tracking-wider backdrop-blur-sm',
                selected === id
                  ? 'border-[#d4ff00]/60 bg-[#d4ff00]/15 text-[#d4ff00]'
                  : 'border-white/15 bg-black/50 text-zinc-300'
              )}
              style={style}
            >
              {id}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">{t('overlayTheme')}</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(OVERLAY_THEMES) as OverlayThemeId[]).map((id) => (
              <Button
                key={id}
                size="sm"
                variant="outline"
                className={cn(
                  'rounded-xl capitalize',
                  cfg.themeId === id && 'border-[#d4ff00]/40 text-[#d4ff00]'
                )}
                style={
                  cfg.themeId === id
                    ? { boxShadow: `inset 0 0 0 1px ${OVERLAY_THEMES[id].accent}` }
                    : undefined
                }
                onClick={() => setTheme(id)}
              >
                {id}
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600">
            accent <span style={{ color: theme.accent }}>{theme.accent}</span>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            {t('overlayScale')}: {cfg.scale.toFixed(2)}
          </p>
          <input
            type="range"
            min={0.75}
            max={1.5}
            step={0.05}
            value={cfg.scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-full accent-[#d4ff00]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{t('overlayPresets')}</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(OVERLAY_PRESETS) as OverlayPresetId[]).map((id) => (
            <Button
              key={id}
              size="sm"
              variant="outline"
              className={cn(
                'rounded-xl',
                cfg.presetId === id && 'bg-[#d4ff00]/15 border-[#d4ff00]/40 text-[#d4ff00]'
              )}
              onClick={() => setPreset(id)}
            >
              {OVERLAY_PRESETS[id].label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="rounded-xl text-zinc-500" onClick={resetLayout}>
            {t('overlayReset')}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{t('overlayWidget')}</p>
        <div className="flex flex-wrap gap-2">
          {widgets.map((w) => (
            <Button
              key={w.id}
              size="sm"
              variant="outline"
              className={cn(
                'rounded-xl',
                selected === w.id && 'border-[#d4ff00]/40 text-[#d4ff00]'
              )}
              onClick={() => setSelected(w.id)}
            >
              {w.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-zinc-400 font-mono">
          {selected}: x={widgetPos.x}% y={widgetPos.y}% · {widgetPos.anchor}
        </p>
        <p className="text-[11px] text-zinc-600">{t('overlayEditHint')}</p>
      </div>
    </div>
  );
}
