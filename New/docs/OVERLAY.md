# Nakładka w grze (Overlay) — dokumentacja

Nakładka Quark to przezroczyste, **pełnoekranowe** okno Electron nad grą (workArea). Widgety (logo, media, perf, toasty) są pozycjonowane absolutnie w % z kotwicami. Domyślnie click-through; tryb edycji włącza mysz.

## Szybki start

1. Uruchom grę z Quark.
2. **Ctrl+Alt+F10** — włącz/wyłącz nakładkę (wymaga aktywnej sesji gry).
3. **Ustawienia → Nakładka** — editor (16:9 / 21:9), motywy, skala, presety, visibility.
4. **Edit on screen** — przeciąganie widgetów; **Esc** kończy edit mode.
5. Preview bez gry: przycisk Preview / `quark.overlay.preview()`.

Sesja gry: max **8 h**.

---

## Config v2 (`OverlaySettings`)

Źródło: `web/act-l/lib/overlay-settings.ts` + `Windows app/overlay-defaults.json`.

| Pole | Opis |
|------|------|
| `show*` | Visibility (logo, CPU, GPU, FPS, chart, RAM, timer, clock, ping, chat, Now Playing) |
| `scale` | 0.75–1.5 |
| `themeId` | `lime` \| `ghost` \| `contrast` |
| `layout` | `Record<widgetId, { x, y, anchor }>` — % + kotwica |
| `presetId` | `classic` \| `corners` \| `minimal` \| `media` |
| `editorAspect` | `16:9` \| `21:9` (tylko mock edytora) |
| `editMode` | runtime — nie persystować jako true |

Migracja: stare flat booleans → `migrateOverlaySettings()` → Classic layout.

---

## Layout ekranu (Classic)

```
┌─────────────────────────────────────────────────────────────┐
│ Quark              [Now Playing]              [perf panel]  │
│                                                             │
│                         [toasts]                            │
└─────────────────────────────────────────────────────────────┘
```

Okno = cały **workArea**. `setIgnoreMouseEvents(true)` poza edit mode.

---

## IPC

| Kanał | Kierunek | Opis |
|-------|----------|------|
| `overlay-update-config` | Launcher → Main | Pełny config v2 |
| `overlay-config` | Main → Overlay | Sync |
| `overlay-enter-edit-mode` / `exit` | Launcher ↔ Main | Edit + focusable |
| `overlay-preview-show` / `hide` | Launcher → Main | Preview bez gry |
| `overlay-layout-patch` | Overlay → Main | Drag patch |
| `overlay-layout-changed` | Main → Launcher | Persist layout |
| `overlay-edit-exited` | Main → Launcher | Esc finished |
| `overlay-metrics` / `session-start` / `media` / `notification` | Main → Overlay | Runtime data |

---

## Pliki

| Plik | Rola |
|------|------|
| `overlay-manager.js` | Okno full workArea, edit/preview, shortcut |
| `overlay.html` / `.css` / `overlay-renderer.js` | DOM, CSS vars, layout, drag |
| `overlay-defaults.json` | Defaults shared with Electron |
| `overlay-preload.js` | `overlayAPI` |
| `web/.../overlay-settings.ts` | Schema + migrate |
| `web/.../components/overlay/overlay-editor.tsx` | WYSIWYG settings UI |

---

## Dev console

```js
quark.overlay.preview()
quark.overlay.edit()
quark.overlay.reset()
```

---

## Troubleshooting

- Brak klików w grze = zamierzony click-through; użyj Edit on screen.
- Toasty poza ekranem (stary 100px HUD) — naprawione w v2 (full viewport).
- GPU / FPS — jak wcześniej (nvidia-smi / estimate).
