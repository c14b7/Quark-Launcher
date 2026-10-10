# Release checklist — 0.0.8-beta0101

## Przyczyna błędu `Unknown route: /spotify/auth-url`

Deployowana Function używała starego `functions/dist` **bez** routerów `/spotify` i `/stats`. Kod źródłowy był OK — brakowało `npm run build:compile` + redeploy.

## Przed wydaniem (kolejność)

### 1. Appwrite Function

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

### 2. Baza

```bash
cd functions
npm run setup-db
```

Tworzy/uzupełnia m.in. `spotify_integrations`, atrybuty `listening*` na `user_profiles`, `user_play_stats`.

### 3. Smoke test po deployu

1. `GET /health` → `version: 2.2.0`, `endpoints` zawiera `/spotify` i `/stats`
2. Dev unlock → Early access: włącz **Spotify** → Accounts → Connect (bez credentials: hint, nie 404)
3. Overlay: Settings → Overlay → preview / edit / Esc
4. Ukryj grę → Stats bez tej gry
5. Badge sidebar: FREE (domyślnie)
6. Recap: wyszarzony dopóki Early access Recap = off

### 4. Launcher build

```bash
cd web/act-l
npm run build
```

Potem Electron packaging jak zwykle (`Windows app`).

## Early access (release defaults)

Wszystkie flagi `earlyAccess.*` = **false**. Spotify / friends media / Recap są w kodzie, UI ukryte/zablokowane aż Dev je włączy.
