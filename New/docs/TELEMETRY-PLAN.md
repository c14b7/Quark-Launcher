# Quark Launcher — plan systemu telemetrii i analityki

> **Status:** wdrożone (Faza 1)  
> **Cel:** zbieranie danych od wersji następnej po `0.0.5-beta01b`, przygotowanie pod panel administracyjny  
> **Data:** 2026-06-23

---

## 1. Cele biznesowe

| Cel | Metryka | Źródło |
|-----|---------|--------|
| Ile osób **realnie** korzysta z launchera | DAU / WAU / MAU, unikalne `installationId` | `telemetry_sessions` |
| Retencja | D1 / D7 / D30 (powrót po pierwszej sesji) | agregaty z sesji |
| Zaangażowanie | Średni czas sesji, liczba uruchomień gier / sesję | eventy `session.*`, `game.launch` |
| Stabilność | Crash rate, błędy API, failed launches | `telemetry_events` (level error) |
| Feature adoption | % użytkowników z Steam, znajomymi, kategoriami | eventy `feature.*` |
| Aktualizacje | Skuteczność auto-update | Electron + eventy `update.*` |
| Diagnostyka | Logi kontekstowe przy błędach (bez PII) | `telemetry_logs` |

Panel admin (później) ma **czytać** te same kolekcje — nie budujemy osobnego pipeline’u analitycznego na start.

---

## 2. Zasady prywatności i RODO

### 2.1 Co zbieramy

- **Identyfikatory techniczne:** `installationId` (UUID generowany lokalnie, nie resetuje się przy wylogowaniu), `sessionId`, opcjonalnie `userId` gdy zalogowany
- **Środowisko:** wersja app, platforma, arch, locale, rozdzielczość ekranu (bez listy procesów / plików użytkownika)
- **Zdarzenia produktowe:** uruchomienie gry (tylko `gameId` z biblioteki Quark, nie ścieżki exe), otwarcie widoku, link Steam itd.
- **Błędy:** stack trace **sanityzowany** (bez tokenów, emaili, ścieżek home usera)

### 2.2 Czego NIE zbieramy

- Hasła, tokeny sesji, zawartość czatu, treść bio/opisów
- Pełne ścieżki plików (`C:\Users\jan\...` → zamiana na `<USER>`)
- Zawartość localStorage poza flagami telemetry (np. `telemetryConsent`)
- IP w surowej formie w DB (opcjonalnie hash po stronie serwera do deduplikacji — decyzja w fazie 2)

### 2.3 Zgoda użytkownika

| Tryb | Domyślnie | Opis |
|------|-----------|------|
| **Diagnostyka (errors + crash)** | Włączone | Minimalne logi przy błędach — uzasadniony interes / poprawa produktu |
| **Analityka produktowa** | Opt-in przy pierwszym uruchomieniu lub w Ustawienia → Prywatność | Eventy użytkowania, sesje, feature usage |
| **Pełne logi debug** | Tylko `-dev` / dev build | Wszystkie poziomy logów |

Pole w `user_profiles.preferences` (JSON):

```json
{
  "telemetry": {
    "analyticsEnabled": true,
    "diagnosticsEnabled": true,
    "consentVersion": 1,
    "consentAt": "2026-06-23T12:00:00.000Z"
  }
}
```

Lokalnie (Electron `settings/telemetry.json` lub localStorage): to samo + `installationId`, `lastFlushAt`.

Użytkownik może wycofać zgodę — kolejka lokalna jest czyszczona, serwer oznacza `telemetry_opt_out` (bez kasowania historycznych danych — polityka retention osobno).

---

## 3. Architektura wysokiego poziomu

```
┌─────────────────────────────────────────────────────────────────┐
│  Renderer (Next.js)                                              │
│  TelemetryProvider → track() / log() / startSession()            │
│  Hooki w: auth, games, friends, settings, api-client             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Electron main (opcjonalnie)                                     │
│  IPC: telemetry:app-lifecycle, game-process-exit, updater        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  lib/telemetry/                                                  │
│  • batch queue (IndexedDB / electron save-user-data)               │
│  • flush co 30s lub przy 50 eventach lub przy zamknięciu           │
│  • retry exponential backoff                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /telemetry/ingest (batch)
┌──────────────────────────▼──────────────────────────────────────┐
│  Appwrite Function: telemetry-api.ts                             │
│  validate → sanitize → rate limit → write DB                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 telemetry_events   telemetry_sessions   telemetry_logs
 telemetry_daily_aggregates (cron, faza 2)
```

**Dlaczego jeden endpoint batch:** mniej wywołań Functions, działa offline, łatwy rate limit per `installationId`.

**Auth:** ingest wymaga zalogowania **lub** anonimowego `installationId` + podpis HMAC (faza 2). Na start: wymagana sesja Appwrite dla zalogowanych; anonimowe tylko `session.start` / `app.launch` przed logowaniem (opcjonalnie).

---

## 4. Model danych (Appwrite)

Wszystkie kolekcje: **server-only** (`SERVER_ONLY_PERMISSIONS` jak w `setup-database.ts`).

### 4.1 `telemetry_installations`

Jeden dokument na instalację aplikacji (nie na konto).

| Pole | Typ | Opis |
|------|-----|------|
| `installationId` | string(36) | PK dokumentu |
| `firstSeenAt` | datetime | |
| `lastSeenAt` | datetime | aktualizowane przy każdym ingeście |
| `appVersion` | string(32) | ostatnia znana wersja |
| `platform` | enum | `win32 \| darwin \| linux \| web` |
| `arch` | string(16) | |
| `locale` | string(10) | |
| `electronVersion` | string(32) | opcjonalnie |
| `userId` | string(36) | ostatni znany user (może się zmieniać) |
| `analyticsEnabled` | boolean | ostatni stan zgody |
| `country` | string(2) | z nagłówka CDN / GeoIP (faza 2) |

**Indeksy:** `userId`, `lastSeenAt`, `appVersion`

### 4.2 `telemetry_sessions`

| Pole | Typ | Opis |
|------|-----|------|
| `sessionId` | string(36) | PK |
| `installationId` | string(36) | |
| `userId` | string(36) | nullable |
| `startedAt` | datetime | |
| `endedAt` | datetime | nullable — ustawiane przy `session.end` lub heartbeat timeout |
| `durationSec` | integer | obliczane przy zamknięciu |
| `appVersion` | string(32) | |
| `entryPoint` | enum | `cold_start \| resume \| login` |

**Indeksy:** `installationId`, `userId`, `startedAt`

**Heartbeat:** co 60s event `session.heartbeat` → serwer aktualizuje `endedAt` provisional (last activity).

### 4.3 `telemetry_events`

Główna tabela zdarzeń (append-only).

| Pole | Typ | Opis |
|------|-----|------|
| `eventId` | string(36) | PK (UUID z klienta — idempotencja) |
| `installationId` | string(36) | |
| `sessionId` | string(36) | |
| `userId` | string(36) | nullable |
| `name` | string(64) | np. `game.launch` |
| `category` | enum | `session \| navigation \| game \| social \| auth \| settings \| update \| error \| feature` |
| `timestamp` | datetime | czas po stronie klienta |
| `receivedAt` | datetime | czas serwera |
| `appVersion` | string(32) | |
| `properties` | string(8000) | JSON (ograniczony rozmiar, whitelist kluczy) |

**Indeksy:** `name`, `userId`, `installationId`, `timestamp`, `category`

**TTL / retention:** surowe eventy 90 dni (Appwrite scheduled function lub ręczne czyszczenie); agregaty dłużej.

### 4.4 `telemetry_logs`

Strukturalne logi diagnostyczne (nie każdy `console.log`).

| Pole | Typ | Opis |
|------|-----|------|
| `logId` | string(36) | PK |
| `installationId` | string(36) | |
| `sessionId` | string(36) | |
| `userId` | string(36) | nullable |
| `level` | enum | `debug \| info \| warn \| error \| fatal` |
| `message` | string(2000) | |
| `context` | string(8000) | JSON: route, component, error code |
| `stack` | string(8000) | sanityzowany |
| `timestamp` | datetime | |
| `appVersion` | string(32) | |

**Indeksy:** `level`, `timestamp`, `installationId`

**Sampling:** `debug`/`info` tylko w dev; produkcja: `warn+` zawsze, `error` z pełnym kontekstem.

### 4.5 `telemetry_daily_aggregates` (faza 2 — pod szybki panel)

| Pole | Typ | Opis |
|------|-----|------|
| `date` | string(10) | `YYYY-MM-DD` |
| `metric` | string(64) | np. `dau`, `game_launches`, `errors` |
| `dimensions` | string(2000) | JSON: `{ appVersion, platform }` |
| `value` | integer | |
| `uniqueInstallations` | integer | opcjonalnie |

PK złożony: `date + metric + hash(dimensions)`.

Cron (Appwrite scheduled function): raz dziennie przelicza z `telemetry_events` / `telemetry_sessions`.

---

## 5. Taksonomia zdarzeń (v1)

### 5.1 Sesja i aplikacja

| Event | Properties | Gdzie emitować |
|-------|------------|----------------|
| `app.launch` | `coldStart`, `appVersion` | `layout.tsx` / Electron ready |
| `session.start` | `entryPoint` | TelemetryProvider mount |
| `session.end` | `durationSec`, `reason` (`quit \| crash \| logout`) | `beforeunload`, Electron `window-all-closed` |
| `session.heartbeat` | — | interval 60s |

### 5.2 Nawigacja

| Event | Properties |
|-------|------------|
| `navigation.view` | `view`: `home \| library \| friends \| account \| settings \| news` |

### 5.3 Gry

| Event | Properties |
|-------|------------|
| `game.launch` | `gameId`, `platform` (`steam \| epic \| xbox \| custom`), `success` |
| `game.launch_failed` | `gameId`, `platform`, `errorCode` |
| `library.scan` | `source` (`steam \| epic`), `gameCount` |
| `library.game_added` | `gameId`, `source` |

### 5.4 Auth i profil

| Event | Properties |
|-------|------------|
| `auth.register` | — (bez email) |
| `auth.login` | `method` (`email \| steam`) |
| `auth.logout` | — |
| `auth.onboarding_complete` | `stepsCompleted` |
| `profile.updated` | `fields`: array flag (`avatar`, `bio`, `theme`, …) |

### 5.5 Social

| Event | Properties |
|-------|------------|
| `friends.request_sent` | — |
| `friends.request_accepted` | — |
| `steam.linked` | — |
| `steam.unlinked` | — |

### 5.6 Ustawienia i funkcje

| Event | Properties |
|-------|------------|
| `settings.changed` | `key` (whitelist), `category` |
| `feature.used` | `feature`: `categories`, `ai_chat`, `notifications`, … |
| `telemetry.consent_changed` | `analyticsEnabled`, `diagnosticsEnabled` |

### 5.7 Aktualizacje (Electron)

| Event | Properties |
|-------|------------|
| `update.available` | `version` |
| `update.download_started` | `version` |
| `update.download_complete` | `version`, `sizeMb` |
| `update.installed` | `fromVersion`, `toVersion` |
| `update.failed` | `stage`, `errorCode` |

### 5.8 Błędy

| Event | Properties |
|-------|------------|
| `error.api` | `path`, `code`, `latencyMs` |
| `error.client` | `component`, `errorName` |
| `error.uncaught` | global handler + React error boundary |

---

## 6. SDK po stronie klienta

### 6.1 Struktura plików (do implementacji)

```
web/act-l/lib/telemetry/
  types.ts           # TelemetryEvent, TelemetryLog, batch payload
  installation.ts    # getOrCreateInstallationId()
  consent.ts         # read/write consent (sync z preferences)
  sanitize.ts        # redakcja PII ze stacków i properties
  queue.ts           # persistent queue
  client.ts          # track(), log(), flush()
  provider.tsx       # React context + session lifecycle
  hooks.ts           # useTrackView(), useTrackFeature()
```

### 6.2 API publiczne

```typescript
track(name: string, properties?: Record<string, unknown>, category?: EventCategory): void
log(level: LogLevel, message: string, context?: Record<string, unknown>): void
setUser(userId: string | null): void
flush(): Promise<void>  // manual / on visibility hidden
```

### 6.3 Integracje (miejsca podpięcia)

| Moduł | Zmiana |
|-------|--------|
| `api-client.ts` | wrapper: czas odpowiedzi + `error.api` przy `success: false` |
| `games-context.tsx` | `game.launch` / `game.launch_failed` w `launchGame()` |
| `auth-context.tsx` | login/logout/register, `setUser()` |
| `friends-context.tsx` | request sent/accepted |
| `settings-modal.tsx` | `settings.changed`, consent UI |
| `layout.tsx` | `TelemetryProvider` |
| `loading-screen.tsx` | `app.launch` po pierwszym paint |
| `Windows app/main.js` | IPC lifecycle + updater events → preload → renderer |
| `preload.js` | `onTelemetryEvent`, `reportMainProcessLog` |

### 6.4 Kolejka i flush

- Max **50 eventów** lub **30 s** → `POST /telemetry/ingest`
- Payload: `{ installation, session, events[], logs[] }`
- Przy błędzie sieci: kolejka rośnie (max 500 eventów — drop najstarsze z ostrzeżeniem lokalnym)
- `navigator.sendBeacon` przy `visibilitychange === hidden` (web); Electron: `save-user-data` + flush przy quit

---

## 7. Backend API

### 7.1 Nowy moduł: `functions/telemetry-api.ts`

| Route | Metoda | Opis |
|-------|--------|------|
| `/telemetry/ingest` | POST | Batch events + logs (główny) |
| `/telemetry/heartbeat` | POST | Lekki endpoint tylko session ping (opcjonalnie w ingest) |
| `/telemetry/consent` | POST | Sync zgody do `user_profiles.preferences` |

### 7.2 Routing w `index.ts`

```typescript
if (path.startsWith('/telemetry')) return handleTelemetryApiRequest(req, res, log);
```

### 7.3 Logika ingest

1. `verifyAuth` — JWT opcjonalny dla pre-login events (whitelist: `app.launch`, `session.start`)
2. Rate limit: 120 req / 15 min / `installationId` (osobny bucket w `rate_limits`)
3. Walidacja schematu (Zod): max rozmiar batch, whitelist `name` i kluczy `properties`
4. `sanitizeProperties()` — strip email, token, paths
5. Upsert `telemetry_installations`
6. Bulk create `telemetry_events` + `telemetry_logs` (idempotencja po `eventId`/`logId`)
7. Update `telemetry_sessions` jeśli `session.end` / heartbeat

### 7.4 Endpointy admin (faza 2 — tylko spec, bez UI)

Wszystkie wymagają roli admin (Appwrite Teams `admins`):

| Route | Opis |
|-------|------|
| `GET /admin/telemetry/overview` | DAU, WAU, MAU, active sessions (last 5 min) |
| `GET /admin/telemetry/events` | Paginacja, filtry: date, name, userId |
| `GET /admin/telemetry/installations` | Lista instalacji z lastSeen |
| `GET /admin/telemetry/logs` | Filtr level, full-text message |
| `GET /admin/telemetry/retention` | D1/D7/D30 |
| `GET /admin/telemetry/versions` | Rozkład `appVersion` |

Na razie **nie implementujemy** admin routes — tylko projektujemy kolekcje tak, by te zapytania były możliwe (indeksy!).

---

## 8. Panel administracyjny (przyszłość) — wymagania danych

Ekrany które dane muszą wspierać:

1. **Dashboard** — wykres DAU (30 dni), MAU, sesje dziś, błędy dziś, top wersje
2. **Użytkownicy aktywni** — tabela: user / installation / last seen / wersja / platforma
3. **Event explorer** — filtr po nazwie, drill-down properties
4. **Logi diagnostyczne** — podobnie do Sentry-lite: stack, kontekst, installation
5. **Gry** — ranking `game.launch` (popularne tytuły w Quark)
6. **Funnel** — install → register → onboarding → first game launch
7. **Aktualizacje** — % na najnowszej wersji, failed updates
8. **Eksport CSV** — zakres dat (admin only)

Wszystkie widoki czytają z Appwrite przez **osobną funkcję admin-api** (nie z klienta launchera).

---

## 9. Bezpieczeństwo

- Kolekcje telemetry: **zero** uprawnień dla `Role.users()` — tylko API key funkcji
- Rate limiting per installation + per user
- Max rozmiar body ingest: 256 KB
- Whitelist nazw eventów — nieznane odrzucane (lub logowane jako `unknown` w dev)
- Admin: Appwrite Team + osobny JWT scope (faza 2)
- Rotacja: nie logować `APPWRITE_API_KEY`, Steam keys itd.

---

## 10. Fazy implementacji

### Faza 1 — MVP zbierania danych (priorytet)

- [ ] Kolekcje w `setup-database.ts`: `telemetry_installations`, `telemetry_sessions`, `telemetry_events`, `telemetry_logs`
- [ ] `telemetry-api.ts` + route w `index.ts`
- [ ] `lib/telemetry/*` + `TelemetryProvider`
- [ ] Eventy: sesja, app launch, game launch, auth login/logout, API errors
- [ ] Consent w ustawieniach (podstawowy toggle)
- [ ] Electron: session end + updater events
- [ ] Deploy funkcji + migracja DB

**Szacunek:** ~2–3 dni robocze

### Faza 2 — jakość i panel-ready

- [ ] `telemetry_daily_aggregates` + cron
- [ ] Heartbeat sesji + wykrywanie crash (brak `session.end` + timeout)
- [ ] Admin API (`/admin/telemetry/*`) + Team admins
- [ ] Geo country (opcjonalnie)
- [ ] HMAC dla anonimowego ingest przed logowaniem
- [ ] Retention job (usuwanie > 90 dni)

### Faza 3 — panel admin UI

- [ ] Osobna aplikacja web lub chroniona sekcja (nie w launcherze produkcyjnym)
- [ ] Wykresy (recharts / podobne)
- [ ] Real-time „online now” z heartbeat

---

## 11. Przykładowy payload ingest

```json
{
  "installation": {
    "installationId": "a1b2c3d4-...",
    "appVersion": "0.0.6-beta01",
    "platform": "win32",
    "arch": "x64",
    "locale": "pl-PL",
    "electronVersion": "33.2.0",
    "analyticsEnabled": true
  },
  "session": {
    "sessionId": "e5f6...",
    "startedAt": "2026-06-23T10:00:00.000Z",
    "entryPoint": "cold_start"
  },
  "events": [
    {
      "eventId": "uuid-1",
      "name": "app.launch",
      "category": "session",
      "timestamp": "2026-06-23T10:00:01.000Z",
      "properties": { "coldStart": true }
    },
    {
      "eventId": "uuid-2",
      "name": "game.launch",
      "category": "game",
      "timestamp": "2026-06-23T10:05:00.000Z",
      "properties": { "gameId": "570", "platform": "steam", "success": true }
    }
  ],
  "logs": [
    {
      "logId": "uuid-3",
      "level": "error",
      "message": "API request failed",
      "timestamp": "2026-06-23T10:04:00.000Z",
      "context": { "path": "/friends/requests", "code": "RATE_LIMITED" }
    }
  ]
}
```

---

## 12. Metryki sukcesu wdrożenia

- ≥ 95% eventów dociera do serwera (porównanie licznik lokalny vs receivedAt)
- Średnie opóźnienie ingest < 2 min (batch)
- Zero wycieków PII w próbkach logów (audit przed prod)
- Panel admin może policzyć DAU bez full scan — po fazie 2 z agregatami

---

## 13. Otwarte decyzje (do ustalenia przed kodem)

1. **Anonimowy ingest przed logowaniem** — tak/nie? (rekomendacja: tak, tylko `app.launch` + `session.start`)
2. **Domyślna zgoda na analitykę** — opt-in (RODO-safe) vs opt-out (więcej danych)?
3. **Retention 90 dni** — OK prawnie?
4. **Osobna funkcja Appwrite** dla telemetry vs ten sam router (rekomendacja: ten sam router, osobny plik handler)
5. **Sentry w przyszłości** — czy zostajemy przy własnym `telemetry_logs` (rekomendacja: tak na start, Sentry opcjonalnie później dla stack traces)

---

## 14. Następny krok

### Wdrożenie na Appwrite (ręcznie)

```bash
cd functions
# upewnij się, że .env ma APPWRITE_API_KEY
npm run setup-db          # tworzy kolekcje telemetry_*
npm run build:compile
# zdeployuj funkcję (Appwrite CLI / konsola)
```

Po deployu dane zaczną spływać automatycznie z launcherów z włączoną telemetrią (domyślnie: włączona w beta).
