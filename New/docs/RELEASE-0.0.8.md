# Release checklist — 0.0.8-beta0101

## Wersja shipping

Jedna stringa wszędzie: **`0.0.8-beta0101`**

| Miejsce | Plik |
|---------|------|
| Electron | `Windows app/package.json` → `version` |
| Web | `web/act-l/package.json` → `version` |
| What’s New | `web/act-l/content/whats-new.json` → entry `0.0.8-beta0101` |
| Updater feed | GitHub release `latest.yml` (po packu: `Windows app/dist/latest.yml`) |

Nie polegać na fallbacku do `0.0.7-beta01`.

## Packaging Electron (blocker)

W `Windows app/package.json` → `build.files` muszą być m.in.:

- `minecraft-detect.js`
- `media-smtc.js`
- `overlay-defaults.json`

Bez tego packed NSIS wywali Minecraft detect / SMTC / overlay defaults (dev działa).

## Appwrite Function

```bash
cd functions
npm run build:compile
```

Wgraj cały folder `functions/dist/` (lub ZIP Function) do Appwrite Console → Deploy.

Env Function (wymagane dla Spotify Connect):

| Key | Opis |
|-----|------|
| `APPWRITE_API_KEY` | już powinno być |
| `SPOTIFY_CLIENT_ID` | Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | j.w. |
| `SPOTIFY_REDIRECT_URI` | domyślnie `http://127.0.0.1:39211/spotify/callback` |

Redirect URI musi być dodany w Spotify App settings.

## Baza

```bash
cd functions
npm run setup-db
```

Tworzy/uzupełnia m.in. `spotify_integrations`, atrybuty `listening*` na `user_profiles`, `user_play_stats`.

## Smoke — Function

1. `GET /health` → `version: 2.2.0`, `endpoints` zawiera `/spotify` i `/stats`
2. Dev unlock → Early access: włącz **Spotify** → **Account** (nav) → Connect (bez credentials: hint, nie 404)

## Smoke — packed build (nie tylko `electron .`)

```bash
cd web/act-l && npm run build
cd "../../Windows app" && npm run pack   # lub build / release
```

1. Minecraft detect, SMTC / media card (za Early Access), overlay preview/edit  
2. Dodaj `.exe` → launch → usuń (confirm dialog)  
3. Ukryj grę → znika z library **i** sidebar; stats bez niej  
4. Usuń wykryty Minecraft → nie wraca po refresh; Library → filtr Minecraft → **Przywróć wykryty Minecraft**  
5. What’s New raz po bumpie wersji  
6. Early access default OFF; Recap grayed  
7. Badge FREE; Function health OK  

## Early access (release defaults)

Wszystkie flagi `earlyAccess.*` = **false**. Spotify / friends media / Recap są w kodzie, UI ukryte/zablokowane aż Dev je włączy.

## Świadomie poza tym releasem

Code signing, real premium gates, Xbox achievements, Prism/MultiMC pełna detekcja, paywall.
