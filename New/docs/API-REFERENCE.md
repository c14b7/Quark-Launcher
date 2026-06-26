# Quark Launcher — dokumentacja API, bazy danych i architektury

> **Cel dokumentu:** pełna referencja dla dalszego rozwoju launchera i budowy panelu administracyjnego.  
> **Ostatnia aktualizacja:** 2026-06-23  
> **Wersja API (Function):** 2.0.1

---

## Spis treści

1. [Architektura wysokiego poziomu](#1-architektura-wysokiego-poziomu)
2. [Konfiguracja i środowisko](#2-konfiguracja-i-środowisko)
3. [Baza danych Appwrite](#3-baza-danych-appwrite)
4. [Storage](#4-storage)
5. [Appwrite Function — router](#5-appwrite-function--router)
6. [API: Auth (`/auth/*`)](#6-api-auth-auth)
7. [API: Friends (`/friends/*`)](#7-api-friends-friends)
8. [API: Steam (`/steam`)](#8-api-steam-steam)
9. [API: Telemetry (`/telemetry/*`)](#9-api-telemetry-telemetry) — **nowe**
10. [Rate limiting](#10-rate-limiting)
11. [Frontend — warstwa klienta](#11-frontend--warstwa-klienta)
12. [Telemetria — SDK klienta](#12-telemetria--sdk-klienta) — **nowe**
13. [Electron — IPC](#13-electron--ipc)
14. [Panel administracyjny — wytyczne](#14-panel-administracyjny--wytyczne)
15. [Mapa plików w repozytorium](#15-mapa-plików-w-repozytorium)
16. [Operacje DevOps](#16-operacje-devops)

---

## 1. Architektura wysokiego poziomu

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Electron (Windows app/) + Next.js (web/act-l/)                          │
│  • UI, konteksty React, Electron IPC                                     │
│  • apiRequest() → Appwrite Functions.createExecution()                   │
│  • Telemetria: lib/telemetry/ → POST /telemetry/ingest (batch)           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS (sesja Appwrite JWT w nagłówkach)
┌───────────────────────────────▼─────────────────────────────────────────┐
│  Jedna Appwrite Function (functions/index.ts)                            │
│  Router: /health | /auth | /friends | /steam | /telemetry                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ API Key (server-side)
┌───────────────────────────────▼─────────────────────────────────────────┐
│  Appwrite Cloud                                                          │
│  • Database: quark_launcher_db (11 kolekcji)                             │
│  • Storage: user_media                                                   │
│  • Auth: konta użytkowników (Appwrite Account)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Zasada bezpieczeństwa:** klient **nie** ma bezpośredniego dostępu do kolekcji DB. Wszystkie operacje przechodzą przez Function z `APPWRITE_API_KEY`. Kolekcje mają puste uprawnienia (`SERVER_ONLY_PERMISSIONS`).

**Routing:** ścieżka przekazywana jako `xpath` w `createExecution` + pole `_route` w body JSON (fallback).

---

## 2. Konfiguracja i środowisko

### 2.1 Backend (Function)

| Zmienna | Plik | Opis |
|---------|------|------|
| `APPWRITE_ENDPOINT` | `functions/.env` | np. `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `functions/.env` | ID projektu Appwrite |
| `APPWRITE_API_KEY` | `functions/.env` | Klucz API z uprawnieniami do DB, Storage, Users |
| `STEAM_API_KEY` | `functions/.env` | Klucz Steam Web API |

Przykład: `functions/.env.example`

### 2.2 Frontend (Launcher)

| Zmienna | Plik | Opis |
|---------|------|------|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | `web/act-l/.env` | Endpoint Appwrite |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | `web/act-l/.env` | Project ID |
| `NEXT_PUBLIC_APPWRITE_FUNCTION_ID` | `web/act-l/.env` | ID wdrożonej Function |
| `NEXT_PUBLIC_APP_VERSION` | `next.config.ts` | Wersja app (build-time) |

### 2.3 Stałe w kodzie

```typescript
// functions/lib/config.ts
DATABASE_ID = 'quark_launcher_db'
BUCKETS.userMedia = 'user_media'
```

---

## 3. Baza danych Appwrite

**Database ID:** `quark_launcher_db`  
**Skrypt migracji:** `functions/setup-database.ts` → `npm run setup-db`

Wszystkie kolekcje: **tylko serwer** (brak `Role.users()` na kolekcji).

### 3.1 `user_profiles`

Profil Quark powiązany 1:1 z kontem Appwrite (`userId` = document ID).

| Pole | Typ | Wymagane | Domyślnie | Opis |
|------|-----|----------|-----------|------|
| `userId` | string(36) | tak | — | ID użytkownika Appwrite (= `$id` dokumentu) |
| `email` | email | tak | — | Email konta |
| `name` | string(100) | tak | — | Nazwa z rejestracji |
| `displayName` | string(32) | nie | — | Wyświetlana nazwa |
| `friendCode` | string(6) | nie | — | Unikalny kod znajomego |
| `createdAt` | datetime | tak | — | Data utworzenia profilu |
| `steamLinked` | boolean | nie | `false` | Czy podłączono Steam |
| `steamId` | string(50) | nie | — | Steam ID64 |
| `preferences` | string(5000) | nie | — | JSON: theme, locale, telemetry, pronouns, location… |
| `bio` | string(190) | nie | — | Opis profilu |
| `avatarFileId` | string(36) | nie | — | ID pliku w `user_media` |
| `bannerFileId` | string(36) | nie | — | ID banera (przyszłość) |
| `cardTheme` | string(2000) | nie | — | JSON: accentColor, gradientPreset, glowEnabled |
| `presence` | enum | nie | `offline` | `online \| idle \| dnd \| offline` |
| `customStatus` | string(128) | nie | — | Status tekstowy |
| `lastSeen` | datetime | nie | — | Ostatnia aktywność |
| `emailVerified` | boolean | nie | `false` | Weryfikacja email (Appwrite) |
| `friendCodeRegeneratedAt` | datetime | nie | — | Ostatnia regeneracja kodu |
| `subscriptionTier` | enum | nie | `free` | `free \| premium \| premium_plus` |
| `subscriptionStatus` | enum | nie | `active` | `active \| canceled \| expired \| trialing` |
| `subscriptionExpiresAt` | datetime | nie | — | Koniec subskrypcji |
| `subscriptionProvider` | enum | nie | — | `stripe \| manual` |
| `currentGameId` | string(50) | nie | — | ID gry (rich presence) |
| `currentGameName` | string(128) | nie | — | Nazwa gry (rich presence) |
| `currentActivity` | enum | nie | `none` | `playing \| menu \| idle \| none` |
| `activityUpdatedAt` | datetime | nie | — | Ostatnia aktualizacja aktywności |

**Indeksy:** `userId_idx`, `friendCode_unique` (unique)

**Przykład `preferences` (JSON w stringu):**

```json
{
  "theme": "dark",
  "locale": "pl",
  "notifications": true,
  "pronouns": "on/jego",
  "location": "Warszawa",
  "telemetry": {
    "analyticsEnabled": true,
    "diagnosticsEnabled": true,
    "consentVersion": 1,
    "consentAt": "2026-06-23T12:00:00.000Z"
  }
}
```

---

### 3.2 `steam_integrations`

| Pole | Typ | Opis |
|------|-----|------|
| `userId` | string(36) | Właściciel integracji |
| `steamId` | string(50) | Steam ID64 |
| `personaName` | string(100) | Nazwa Steam |
| `avatarUrl` | string(500) | URL avatara Steam |
| `profileUrl` | string(500) | URL profilu Steam |
| `linkedAt` | datetime | Data połączenia |

**Indeksy:** `userId_idx`, `steamId_idx`

---

### 3.3 `friend_requests`

| Pole | Typ | Opis |
|------|-----|------|
| `fromUserId` | string(36) | Nadawca |
| `toUserId` | string(36) | Odbiorca |
| `status` | enum | `pending \| accepted \| declined \| cancelled` |
| `createdAt` | datetime | Utworzenie |
| `respondedAt` | datetime | Odpowiedź (opcjonalnie) |

**Indeksy:** `fromUserId_idx`, `toUserId_status_idx`

---

### 3.4 `friendships`

| Pole | Typ | Opis |
|------|-----|------|
| `userIds` | string[](36) | Dokładnie 2 ID, posortowane leksykograficznie |
| `createdAt` | datetime | Data zaakceptowania |

**Indeksy:** `userIds_idx` (contains)

---

### 3.5 `rate_limits`

Wewnętrzna kolekcja throttlingu API (nie do panelu użytkownika).

| Pole | Typ | Opis |
|------|-----|------|
| `key` | string(128) | np. `login:1.2.3.4` lub `telemetry/ingest:{installationId}` |
| `count` | integer | Licznik w oknie |
| `windowStart` | datetime | Początek okna |

**Indeksy:** `key_idx`

---

### 3.6 `steam_friends_cache`

| Pole | Typ | Opis |
|------|-----|------|
| `userId` | string(36) | |
| `steamId` | string(50) | |
| `friendsData` | string(50000) | JSON lista znajomych Steam |
| `lastUpdated` | datetime | |

**Indeksy:** `userId_idx`

---

### 3.7 `steam_achievements_cache`

| Pole | Typ | Opis |
|------|-----|------|
| `userId` | string(36) | |
| `steamId` | string(50) | |
| `gameId` | string(50) | App ID gry Steam |
| `achievementsData` | string(100000) | JSON osiągnięć |
| `lastUpdated` | datetime | |

**Indeksy:** `userId_gameId_idx`

---

### 3.8 `steam_stats_cache`

| Pole | Typ | Opis |
|------|-----|------|
| `userId` | string(36) | |
| `steamId` | string(50) | |
| `gamesOwned` | integer | Liczba gier |
| `totalPlaytime` | integer | Suma minut |
| `recentlyPlayedData` | string(50000) | JSON |
| `lastUpdated` | datetime | |

**Indeksy:** `userId_idx`

---

### 3.9 `telemetry_installations` — **NOWE**

Jedna instalacja aplikacji (urządzenie), niezależna od konta. Document ID = `installationId`.

| Pole | Typ | Domyślnie | Opis |
|------|-----|-----------|------|
| `installationId` | string(36) | — | UUID z klienta |
| `firstSeenAt` | datetime | — | Pierwszy ingest |
| `lastSeenAt` | datetime | — | Ostatni ingest |
| `appVersion` | string(32) | — | np. `0.0.5-beta03a` |
| `platform` | enum | — | `win32 \| darwin \| linux \| web` |
| `arch` | string(16) | — | np. `x64` |
| `locale` | string(10) | — | np. `pl-PL` |
| `electronVersion` | string(32) | — | Wersja Electron |
| `screenResolution` | string(16) | — | np. `1920x1080` |
| `userId` | string(36) | — | Ostatni zalogowany user (może się zmieniać) |
| `analyticsEnabled` | boolean | `true` | Stan zgody |
| `diagnosticsEnabled` | boolean | `true` | Stan zgody |
| `optedOut` | boolean | `false` | Oba wyłączone |

**Indeksy:** `installationId_idx`, `userId_idx`, `lastSeenAt_idx`

**Panel admin — typowe zapytania:**
- Aktywni dziś: `lastSeenAt >= startOfDay`
- MAU: unikalne `installationId` z `lastSeenAt` w ostatnich 30 dniach
- Rozkład wersji: grupowanie po `appVersion`

---

### 3.10 `telemetry_sessions` — **NOWE**

Document ID = `sessionId`.

| Pole | Typ | Opis |
|------|-----|------|
| `sessionId` | string(36) | UUID sesji |
| `installationId` | string(36) | Instalacja |
| `userId` | string(36) | Opcjonalnie |
| `startedAt` | datetime | Start |
| `endedAt` | datetime | Koniec (opcjonalnie) |
| `lastActivityAt` | datetime | Ostatni heartbeat/ingest |
| `durationSec` | integer | Czas trwania |
| `appVersion` | string(32) | |
| `entryPoint` | enum | `cold_start \| resume \| login` |
| `endReason` | enum | `quit \| crash \| logout \| unknown` |

**Indeksy:** `installationId_idx`, `userId_idx`, `startedAt_idx`

**Panel admin:**
- Średni czas sesji: `avg(durationSec)` gdzie `endedAt` nie null
- Online now (przybliżenie): sesje z `lastActivityAt` w ostatnich 5 min bez `endedAt`

---

### 3.11 `telemetry_events` — **NOWE**

Document ID = `eventId` (idempotencja).

| Pole | Typ | Opis |
|------|-----|------|
| `eventId` | string(36) | UUID z klienta |
| `installationId` | string(36) | |
| `sessionId` | string(36) | |
| `userId` | string(36) | Opcjonalnie |
| `name` | string(64) | Nazwa zdarzenia (whitelist) |
| `category` | enum | Patrz sekcja 9.3 |
| `timestamp` | datetime | Czas klienta |
| `receivedAt` | datetime | Czas serwera |
| `appVersion` | string(32) | |
| `properties` | string(8000) | JSON (sanityzowany) |

**Indeksy:** `name_idx`, `userId_idx`, `installationId_idx`, `timestamp_idx`, `category_idx`

**Panel admin:**
- Ranking gier: `name = 'game.launch'`, parse `properties.gameId`, count
- Funnel: count `auth.register` → `auth.onboarding_complete` → `game.launch`

---

### 3.12 `telemetry_logs` — **NOWE**

Document ID = `logId`.

| Pole | Typ | Opis |
|------|-----|------|
| `logId` | string(36) | UUID |
| `installationId` | string(36) | |
| `sessionId` | string(36) | |
| `userId` | string(36) | Opcjonalnie |
| `level` | enum | `debug \| info \| warn \| error \| fatal` |
| `message` | string(2000) | Treść (sanityzowana) |
| `context` | string(8000) | JSON kontekstu |
| `stack` | string(8000) | Stack trace (sanityzowany) |
| `timestamp` | datetime | Czas klienta |
| `receivedAt` | datetime | Czas serwera |
| `appVersion` | string(32) | |

**Indeksy:** `level_idx`, `timestamp_idx`, `installationId_idx`

**Uwaga:** W produkcji klient wysyła tylko `warn`, `error`, `fatal` (nie `debug`/`info`).

---

## 4. Storage

### Bucket: `user_media`

| Właściwość | Wartość |
|------------|---------|
| Max rozmiar pliku | 5 MB |
| Upload | **Tylko Function** (API key) |
| Odczyt | `Permission.read(Role.any())` na każdym pliku przy uploadzie |
| Użycie | Avatary użytkowników |

**URL odczytu (frontend):**

```
{endpoint}/storage/buckets/user_media/files/{fileId}/view?project={projectId}
```

Helper: `getAvatarUrl()` w `web/act-l/lib/avatar-service.ts`

---

## 5. Appwrite Function — router

**Plik wejściowy:** `functions/index.ts`  
**Build:** `functions/dist/index.js`

| Prefix | Handler | Plik |
|--------|---------|------|
| `GET /health` | Health check | `index.ts` |
| `/auth/*` | Auth & profile | `auth-api.ts` |
| `/friends/*` | Social | `friends-api.ts` |
| `/steam` | Steam proxy | `steam-api.ts` |
| `/telemetry/*` | Telemetria | `telemetry-api.ts` |

### Wspólny format odpowiedzi

**Sukces:**

```json
{ "success": true, ...pola }
```

**Błąd:**

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "error": "Human readable message"
}
```

### Autentykacja

Function odczytuje z nagłówków żądania Appwrite:
- `x-appwrite-user-id` — ID użytkownika (gdy sesja aktywna)
- `x-appwrite-jwt` / `x-appwrite-user-jwt` — JWT do weryfikacji

`verifyAuth(req)` w `functions/lib/middleware.ts` zwraca `userId` lub `null`.

### Body

Dla POST/PATCH/DELETE body to JSON. Klient dodaje `_route` dla routingu:

```json
{
  "_route": "/auth/profile",
  "displayName": "Jan"
}
```

---

## 6. API: Auth (`/auth`)

**Handler:** `functions/auth-api.ts`  
**Klient:** `web/act-l/lib/auth-service.ts`, `avatar-service.ts`

### `POST /auth/register`

| | |
|---|---|
| **Auth** | Nie |
| **Rate limit** | 3 / godzina / IP |
| **Body** | `{ email, password, name }` |
| **Działanie** | Tworzy użytkownika Appwrite + dokument `user_profiles` |

**Odpowiedź:** `{ success, profile }` — profil prywatny (`toPrivateProfile`)

**Kody błędów:** `RATE_LIMITED`, `INVALID_EMAIL`, `WEAK_PASSWORD`, `INVALID_NAME`, `EMAIL_TAKEN`

> **Uwaga:** Obecny flow frontendu używa `account.create()` po stronie klienta + `POST /auth/profile/init`. Endpoint `/auth/register` istnieje jako alternatywa server-side.

---

### `POST /auth/login`

| | |
|---|---|
| **Auth** | Nie |
| **Rate limit** | 10 / 15 min / IP |
| **Body** | `{ email, password }` |
| **Działanie** | Tworzy sesję email (server-side fetch) |

**Odpowiedź:** `{ success, profile }`

**Kody:** `INVALID_CREDENTIALS`, `RATE_LIMITED`

> Frontend loguje przez `account.createEmailPasswordSession()` bezpośrednio, potem woła `/auth/me`.

---

### `POST /auth/profile/init`

| | |
|---|---|
| **Auth** | Tak |
| **Body** | `{ name? }` |
| **Działanie** | Tworzy profil jeśli nie istnieje (po `account.create` na kliencie) |

---

### `GET /auth/me`

| | |
|---|---|
| **Auth** | Tak |
| **Odpowiedź** | `{ success, profile, steamIntegration }` |

**Kody:** `PROFILE_NOT_FOUND`, `UNAUTHORIZED`

---

### `POST /auth/avatar`

| | |
|---|---|
| **Auth** | Tak |
| **Rate limit** | `avatar/upload` (w kodzie; bucket w LIMITS — sprawdź `rate-limit.ts`) |
| **Body** | `{ data: base64, mimeType: 'image/png' \| 'image/jpeg' \| 'image/webp' \| 'image/gif' }` |
| **Max** | 5 MB |
| **Działanie** | Upload do `user_media`, aktualizacja `avatarFileId`, usuwa stary plik |

**Odpowiedź:** `{ success, fileId, avatarUrl, profile }`

---

### `PATCH /auth/profile`

| | |
|---|---|
| **Auth** | Tak |
| **Rate limit** | 30 / godzina / user |
| **Body (opcjonalne pola)** | `displayName`, `bio`, `cardTheme`, `customStatus`, `presence`, `preferences` |
| **Nie przez PATCH** | `avatarFileId` — tylko `/auth/avatar` |

**Odpowiedź:** `{ success, profile }`

---

### `POST /auth/password`

| | |
|---|---|
| **Auth** | Tak + JWT w nagłówku |
| **Body** | `{ oldPassword, newPassword }` |

---

### `POST /auth/friend-code/regenerate`

| | |
|---|---|
| **Auth** | Tak |
| **Rate limit** | 1 / 24h / user |
| **Odpowiedź** | `{ success, friendCode }` |

---

### `POST /auth/steam/link`

| | |
|---|---|
| **Auth** | Tak |
| **Body** | `{ steamId? }` lub `{ vanityUrl? }` |
| **Działanie** | Walidacja Steam API, upsert `steam_integrations`, `steamLinked=true` |

---

### `POST /auth/steam/unlink`

| | |
|---|---|
| **Auth** | Tak |
| **Działanie** | Usuwa integrację, `steamLinked=false` |

---

### Kształty profili

**Prywatny (`toPrivateProfile`):** pełny profil z emailem, friendCode, subskrypcją.

**Publiczny (`toPublicProfile`):** dla znajomych — bez emaila; `pronouns` i `location` wyciągane z `preferences` JSON.

---

## 7. API: Friends (`/friends`)

**Handler:** `functions/friends-api.ts`  
**Klient:** `web/act-l/lib/friends-service.ts`  
**Wszystkie endpointy wymagają auth.**

### `POST /friends/lookup`

| Body | `{ code: "ABC123" }` |
| Rate limit | 20 / godzina / user |
| Odpowiedź | `{ success, profile }` — profil publiczny |

---

### `POST /friends/request`

| Body | `{ code }` |
| Wymagania | `emailVerified === true` |
| Logika | Auto-accept jeśli druga strona już wysłała zaproszenie |
| Odpowiedź | `{ success, requestId? }` lub `{ success, autoAccepted: true }` |

**Kody:** `EMAIL_NOT_VERIFIED`, `ALREADY_FRIENDS`, `REQUEST_EXISTS`, `CANNOT_ADD_SELF`

---

### `GET /friends/requests`

**Odpowiedź:**

```json
{
  "success": true,
  "incoming": [{ "id", "fromUserId", "toUserId", "status", "createdAt", "profile" }],
  "outgoing": [...]
}
```

---

### `POST /friends/requests/:id/accept`

### `POST /friends/requests/:id/decline`

### `DELETE /friends/requests/:id`

Anulowanie własnego wychodzącego zaproszenia (`cancelled`).

---

### `GET /friends`

Lista znajomych jako tablica profili publicznych.

---

### `DELETE /friends/:userId`

Usunięcie znajomości (dokument z `friendships`).

---

### `POST /friends/presence`

| Body | `{ presence, customStatus?, currentGameId?, currentGameName?, currentActivity? }` |
| Działanie | Aktualizuje `user_profiles.presence`, `lastSeen` oraz opcjonalnie rich presence (gra) |

`currentActivity`: `playing | menu | idle | none`. Przy `none`/`idle` serwer czyści `currentGameId` i `currentGameName`.

Używane przez `friends-context.tsx` (heartbeat co 30s, raport gry z `launchGame`, respektuje ręczny DND/offline).

Publiczny profil znajomego (`toPublicProfile`) zwraca pola `currentGameId`, `currentGameName`, `currentActivity`.

---

## 8. API: Steam (`/steam`)

**Handler:** `functions/steam-api.ts`  
**Klient:** `web/act-l/lib/steam-api-client.ts` → `callSteamApi(action, params)`

Wszystkie akcje: **POST** `/steam` z body:

```json
{
  "action": "getOwnedGames",
  "steamId": "76561198...",
  "appId": "570"
}
```

| Akcja | Auth | Opis |
|-------|------|------|
| `getPlayerSummary` | Nie* | Podsumowanie gracza Steam |
| `getFriends` | Tak | Lista znajomych + cache do `steam_friends_cache` |
| `getOwnedGames` | Nie* | Lista gier |
| `getAchievements` | Tak | Osiągnięcia gry (`appId` wymagane) + cache |
| `getStatsSummary` | Tak | Statystyki + cache |
| `validateSteamId` | Nie* | Walidacja ID |
| `resolveVanityUrl` | Nie* | Vanity URL → steamId |
| `getCachedFriends` | Tak | Odczyt cache znajomych |

\*Dla akcji wymagających `steamId` powiązanego z kontem: `verifySteamAccess()` — user musi mieć ten Steam w `steam_integrations`.

**Env:** `STEAM_API_KEY` na serwerze (klient nie widzi klucza).

**Electron:** skanowanie lokalnych gier przez IPC (`steam-get-installed-games`), nie przez tę Function.

---

## 9. API: Telemetry (`/telemetry`)

**Handler:** `functions/telemetry-api.ts`  
**Klient:** `web/act-l/lib/telemetry/telemetry-service.ts`

### `POST /telemetry/ingest`

Główny endpoint zbierania danych (batch).

| | |
|---|---|
| **Auth** | Opcjonalna — bez auth tylko eventy `app.launch`, `session.*` |
| **Rate limit** | 120 / 15 min / `installationId` |
| **Max batch** | 50 eventów, 20 logów |

**Body:**

```json
{
  "installation": {
    "installationId": "uuid",
    "appVersion": "0.0.5-beta03a",
    "platform": "win32",
    "arch": "x64",
    "locale": "pl-PL",
    "electronVersion": "33.2.0",
    "screenResolution": "1920x1080",
    "analyticsEnabled": true,
    "diagnosticsEnabled": true
  },
  "session": {
    "sessionId": "uuid",
    "startedAt": "2026-06-23T10:00:00.000Z",
    "entryPoint": "cold_start",
    "endedAt": "2026-06-23T11:00:00.000Z",
    "endReason": "quit",
    "durationSec": 3600
  },
  "events": [
    {
      "eventId": "uuid",
      "name": "game.launch",
      "category": "game",
      "timestamp": "2026-06-23T10:05:00.000Z",
      "properties": { "gameId": "570", "platform": "steam", "success": true }
    }
  ],
  "logs": [
    {
      "logId": "uuid",
      "level": "error",
      "message": "API request failed",
      "timestamp": "2026-06-23T10:04:00.000Z",
      "context": { "path": "/friends/requests", "code": "RATE_LIMITED" },
      "stack": "..."
    }
  ]
}
```

**Odpowiedź:**

```json
{
  "success": true,
  "accepted": { "events": 2, "logs": 1 }
}
```

Gdy `analyticsEnabled === false && diagnosticsEnabled === false`:

```json
{ "success": true, "accepted": { "events": 0, "logs": 0 }, "optedOut": true }
```

**Kody:** `INVALID_INSTALLATION`, `INVALID_SESSION`, `BATCH_TOO_LARGE`, `RATE_LIMITED`, `UNAUTHORIZED`, `INGEST_FAILED`

**Logika serwera:**
1. Upsert `telemetry_installations` (doc ID = installationId)
2. Upsert `telemetry_sessions` (doc ID = sessionId)
3. Create `telemetry_events` (idempotencja po eventId)
4. Create `telemetry_logs` (tylko warn+ w produkcji po stronie klienta)
5. Sanityzacja PII w stringach i properties

---

### `POST /telemetry/consent`

| | |
|---|---|
| **Auth** | Tak |
| **Body** | `{ installationId, analyticsEnabled, diagnosticsEnabled }` |
| **Działanie** | Aktualizuje flagi na `telemetry_installations` |

---

### 9.1 Whitelist nazw eventów

| Nazwa | Kategoria | Kiedy emitowane |
|-------|-----------|-----------------|
| `app.launch` | session | Start aplikacji |
| `session.start` | session | Nowa sesja |
| `session.end` | session | Zamknięcie / logout |
| `session.heartbeat` | session | Co 60s |
| `navigation.view` | navigation | Zmiana widoku (`home`, `library`, …) |
| `game.launch` | game | Udane uruchomienie gry |
| `game.launch_failed` | game | Błąd launch |
| `library.scan` | game | (zarezerwowane) |
| `library.game_added` | game | (zarezerwowane) |
| `auth.register` | auth | Rejestracja |
| `auth.login` | auth | Logowanie |
| `auth.logout` | auth | Wylogowanie |
| `auth.onboarding_complete` | auth | Koniec onboardingu |
| `profile.updated` | auth | (zarezerwowane) |
| `friends.request_sent` | social | Zaproszenie |
| `friends.request_accepted` | social | Akceptacja |
| `friends.request_declined` | social | Odrzucenie |
| `steam.linked` | social | Połączenie Steam |
| `steam.unlinked` | social | Odłączenie Steam |
| `settings.changed` | settings | (zarezerwowane) |
| `feature.used` | feature | (zarezerwowane) |
| `telemetry.consent_changed` | settings | Zmiana zgody |
| `update.available` | update | Electron auto-updater |
| `update.download_started` | update | Start pobierania |
| `update.download_complete` | update | Pobrano |
| `update.installed` | update | Zainstalowano |
| `update.failed` | update | Błąd aktualizacji |
| `error.api` | error | Błąd API (nie `/telemetry`) |
| `error.client` | error | (zarezerwowane) |
| `error.uncaught` | error | Global error handler |
| `overlay.toggled` | feature | Toggle nakładki Ctrl+Alt+F10 (Electron) |

---

### 9.2 Domyślna zgoda (beta)

- `analyticsEnabled: true` (opt-out)
- `diagnosticsEnabled: true` (opt-out)
- Ustawienia: **Ustawienia → Prywatność** w launcherze

---

## 10. Rate limiting

Definicje w `functions/lib/rate-limit.ts`:

| Klucz akcji | Limit | Okno |
|-------------|-------|------|
| `register` | 3 | 1 godzina |
| `login` | 10 | 15 minut |
| `friends/lookup` | 20 | 1 godzina |
| `friend-code/regenerate` | 1 | 24 godziny |
| `profile/patch` | 30 | 1 godzina |
| `telemetry/ingest` | 120 | 15 minut |

Klucz w DB: `{action}:{ip|userId|installationId}`

Przy błędzie sprawdzania limitu serwer **przepuszcza** żądanie (fail-open).

---

## 11. Frontend — warstwa klienta

### 11.1 `apiRequest()` — `web/act-l/lib/api-client.ts`

```typescript
apiRequest<T>(path, method, body?, requireAuth = true): Promise<ApiResponse<T>>
```

1. Sprawdza `NEXT_PUBLIC_APPWRITE_FUNCTION_ID`
2. Jeśli `requireAuth`: `account.get()` — sesja Appwrite
3. `functions.createExecution({ functionId, xpath: path, method, body: JSON })`
4. Parsuje `responseBody`, mapuje błędy HTTP ≥ 400
5. **Telemetria:** przy błędach (poza `/telemetry`) emituje `error.api`

### 11.2 Serwisy

| Serwis | Plik | Endpointy |
|--------|------|-----------|
| Auth | `lib/auth-service.ts` | register, login, logout, getMe, updateProfile, password, friend-code, steam link/unlink |
| Friends | `lib/friends-service.ts` | lookup, request, requests, accept/decline/cancel, friends, presence |
| Steam | `lib/steam-api-client.ts` | `callSteamApi(action, params)` |
| Avatar | `lib/avatar-service.ts` | upload przez `/auth/avatar`, `getAvatarUrl()` |
| Telemetry | `lib/telemetry/telemetry-service.ts` | ingest, consent |

### 11.3 Konteksty React

| Kontekst | Plik | Odpowiedzialność |
|----------|------|------------------|
| Auth | `lib/auth-context.tsx` | Sesja, profil, Steam, onboarding |
| Friends | `lib/friends-context.tsx` | Znajomi, zaproszenia, presence poll, powiadomienia |
| Games | `lib/games-context.tsx` | Biblioteka, launch, ulubione, historia |
| Settings | `lib/settings-context.tsx` | Motyw, locale, kategorie, ukryte gry |
| Telemetry | `lib/telemetry/provider.tsx` | Sesja, flush, global errors |

### 11.4 Dane lokalne (Electron / localStorage)

| Klucz | Opis |
|-------|------|
| `quark_profile_cache` | Cache profilu offline |
| `quark_onboarding_complete` | Flaga onboardingu |
| `quark_settings` | Ustawienia UI |
| `quark_friends_sidebar_open` | Stan panelu znajomych |
| `quark_installation_id` | UUID instalacji (telemetria) |
| `quark_telemetry_consent` | Zgoda telemetrii |
| `quark_telemetry_queue` | Kolejka offline (Electron: `settings/telemetry_queue.json`) |
| `playHistory` | Ostatnio grane (lokalnie, nie na serwerze) |

---

## 12. Telemetria — SDK klienta

**Katalog:** `web/act-l/lib/telemetry/`

| Plik | Rola |
|------|------|
| `types.ts` | Typy TypeScript |
| `consent.ts` | Zgoda, installationId |
| `queue.ts` | Kolejka persistent |
| `sanitize.ts` | Redakcja PII |
| `client.ts` | `track()`, `logTelemetry()`, `flushTelemetry()`, `initTelemetry()` |
| `provider.tsx` | `TelemetryProvider`, `useTrackView()` |
| `telemetry-service.ts` | Wywołania API |

### Cykl życia

1. `TelemetryProvider` mount → `initTelemetry()`
2. `app.launch` + `session.start`
3. Heartbeat co 60s → `session.heartbeat`
4. `track()` → kolejka → flush co 30s lub 50 eventów
5. `beforeunload` / logout → `session.end` + flush

### Integracje (gdzie szukać przy rozszerzaniu)

| Moduł | Eventy |
|-------|--------|
| `api-client.ts` | `error.api` |
| `games-context.tsx` | `game.launch`, `game.launch_failed` |
| `auth-context.tsx` | `auth.*`, `steam.*`, `session.end` na logout |
| `friends-context.tsx` | `friends.*` |
| `launcher.tsx` | `navigation.view` via `useTrackView()` |
| `main.js` | `update.*` via IPC `telemetry-main-event` |

---

## 13. Electron — IPC

**Main:** `Windows app/main.js`  
**Preload:** `Windows app/preload.js` → `window.electronAPI`  
**Typy:** `web/act-l/lib/types.ts` → `IElectronAPI`

### Okno

| Kanał | Opis |
|-------|------|
| `window-minimize` | Minimalizuj |
| `window-maximize` | Maksymalizuj / przywróć |
| `window-close` | Zamknij |
| `window-is-maximized` | Stan okna |

### Steam (lokalne + proxy)

| Kanał | Opis |
|-------|------|
| `steam-api-fetch` | Proxy do Steam Web API (CORS) |
| `steam-detect-installation` | Ścieżka instalacji Steam |
| `steam-get-installed-games` | Skan biblioteki (ACF) |
| `steam-get-owned-games` | GetOwnedGames |
| `steam-get-achievements` | Osiągnięcia |
| `steam-get-news` | Aktualności |
| `steam-get-recent-achievements` | Ostatnie odblokowania |
| `steam-openid-login` | OpenID na porcie 38492 |

### Epic

| Kanał | Opis |
|-------|------|
| `epic-get-installed-games` | Skan manifestów Epic |

### Gry

| Kanał | Opis |
|-------|------|
| `launch-game` | `{ platform, gameId, gamePath? }` → Steam/Epic/Xbox/custom exe |
| `select-game-executable` | Wybór pliku exe |
| `check-file-exists` | Sprawdzenie ścieżki |
| `open-folder` | Eksplorator plików |

### Dane użytkownika

| Kanał | Opis |
|-------|------|
| `save-user-data` | `{ key, data }` → `{userData}/settings/{key}.json` |
| `load-user-data` | `{ key }` → odczyt JSON |

### System

| Kanał | Opis |
|-------|------|
| `get-system-info` | platform, arch, wersje |
| `open-dev-tools` | DevTools (detach) |

### Aktualizacje

| Kanał / Event | Kierunek | Opis |
|---------------|----------|------|
| `start-installation` | invoke | Pobierz update |
| `update-available-to-ui` | main→renderer | Dostępna wersja |
| `update-download-progress` | main→renderer | Postęp % |
| `update-error-to-ui` | main→renderer | Błąd |
| `telemetry-main-event` | main→renderer | Eventy `update.*` do telemetrii |

---

## 14. Panel administracyjny — wytyczne

> Endpointy `/admin/*` **nie istnieją jeszcze** — poniżej specyfikacja do implementacji.

### 14.1 Architektura panelu

- **Osobna aplikacja web** lub chroniona sekcja (nie w produkcyjnym launcherze)
- **Auth:** Appwrite Team `admins` + osobna Function `admin-api.ts`
- **Odczyt:** bezpośrednio z kolekcji przez API key (jak obecne handlery)
- **Brak zapisu** do telemetrii z panelu (tylko read + ewentualnie export)

### 14.2 Proponowane endpointy admin

| Route | Metoda | Dane |
|-------|--------|------|
| `/admin/telemetry/overview` | GET | DAU, WAU, MAU, sesje dziś, błędy dziś, top wersje |
| `/admin/telemetry/installations` | GET | Paginacja, filtr `lastSeenAt`, `appVersion`, `platform` |
| `/admin/telemetry/sessions` | GET | Filtr daty, `userId`, `installationId` |
| `/admin/telemetry/events` | GET | Filtr `name`, `category`, zakres `timestamp` |
| `/admin/telemetry/logs` | GET | Filtr `level`, full-text `message` |
| `/admin/telemetry/retention` | GET | D1/D7/D30 (obliczane z `telemetry_sessions`) |
| `/admin/users` | GET | Lista `user_profiles` + statystyki aktywności |
| `/admin/users/:userId` | GET | Profil + ostatnie eventy + instalacje |

### 14.3 Przykładowe zapytania (Appwrite Query)

**DAU (unikalne instalacje dziś):**

```
telemetry_installations where lastSeenAt >= {startOfDay}
```

**Popularne gry (7 dni):**

```
telemetry_events where name = 'game.launch' AND timestamp >= {7dAgo}
→ agregacja po JSON properties.gameId (po stronie admin API lub cron)
```

**Błędy ostatnie 24h:**

```
telemetry_logs where level IN ('error','fatal') AND timestamp >= {24hAgo}
ORDER BY timestamp DESC
```

**Użytkownicy z Steam:**

```
user_profiles where steamLinked = true
```

### 14.4 Ekrany panelu (MVP)

1. **Dashboard** — wykres DAU 30d, MAU, aktywne sesje, błędy dziś
2. **Instalacje** — tabela installationId, lastSeen, wersja, platforma, user
3. **Event explorer** — filtr, drill-down properties JSON
4. **Logi** — lista błędów ze stackiem
5. **Gry** — ranking `game.launch`
6. **Użytkownicy** — lista profili + link do szczegółów
7. **Wersje** — % użytkowników na każdej `appVersion`
8. **Eksport CSV** — zakres dat (tylko admin)

### 14.5 Faza 2 — agregaty

Kolekcja `telemetry_daily_aggregates` (jeszcze **nie** w `setup-database.ts`):

| Pole | Opis |
|------|------|
| `date` | `YYYY-MM-DD` |
| `metric` | `dau`, `game_launches`, `errors`, … |
| `dimensions` | JSON `{ appVersion, platform }` |
| `value` | integer |

Cron (scheduled Function) — przeliczanie raz dziennie dla szybkiego dashboardu.

---

## 15. Mapa plików w repozytorium

```
New/
├── functions/
│   ├── index.ts              # Router Function
│   ├── auth-api.ts           # /auth/*
│   ├── friends-api.ts        # /friends/*
│   ├── steam-api.ts          # /steam
│   ├── telemetry-api.ts      # /telemetry/*  [NOWE]
│   ├── setup-database.ts     # Migracja DB
│   └── lib/
│       ├── config.ts         # DATABASE_ID, COLLECTIONS
│       ├── middleware.ts     # Auth, routing, body
│       ├── rate-limit.ts
│       ├── validators.ts
│       ├── friend-code.ts
│       ├── input-file.ts     # Upload avatara (Appwrite)
│       └── runtime.ts
├── web/act-l/
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth-service.ts
│   │   ├── auth-context.tsx
│   │   ├── friends-service.ts
│   │   ├── friends-context.tsx
│   │   ├── games-context.tsx
│   │   ├── steam-api-client.ts
│   │   ├── avatar-service.ts
│   │   ├── subscription.ts
│   │   └── telemetry/        # [NOWE]
│   └── components/
│       ├── launcher.tsx
│       └── settings-modal.tsx  # zakładka Prywatność
├── Windows app/
│   ├── main.js
│   ├── overlay-manager.js   # Ctrl+Alt+F10 nakładka
│   ├── overlay.html
│   └── preload.js
└── docs/
    ├── API-REFERENCE.md      # ten dokument
    ├── TELEMETRY-PLAN.md
    └── ZMIANY-2026-06-23.md
```

---

## 16. Operacje DevOps

### Utworzenie / aktualizacja bazy

```bash
cd functions
# .env z APPWRITE_API_KEY
npm run setup-db
npm run migrate-telemetry   # brakujące atrybuty telemetry_events/logs
npm run migrate-presence    # rich presence na user_profiles
```

### Build Function

```bash
cd functions
npm run build:compile
# deploy przez Appwrite CLI lub konsolę
```

### Build launchera

```bash
cd web/act-l
npm run build
```

### Checklist po zmianach w API

1. `setup-database.ts` — nowe kolekcje/indeksy
2. `functions/lib/config.ts` — `COLLECTIONS`
3. `build:compile` + redeploy Function
4. Frontend — nowe wywołania w serwisach
5. Dokumentacja — aktualizacja tego pliku

---

## Słownik kodów błędów (wybrane)

| Kod | HTTP | Znaczenie |
|-----|------|-----------|
| `UNAUTHORIZED` | 401 | Brak sesji |
| `FORBIDDEN` | 403 | Brak uprawnień |
| `NOT_FOUND` | 404 | Nie znaleziono |
| `RATE_LIMITED` | 429 | Za dużo żądań |
| `EMAIL_TAKEN` | 409 | Email zajęty |
| `INVALID_CREDENTIALS` | 401 | Złe logowanie |
| `PROFILE_NOT_FOUND` | 404 | Brak profilu Quark |
| `EMAIL_NOT_VERIFIED` | 403 | Znajomi wymagają weryfikacji |
| `CONFIG_ERROR` | 500 | Brak APPWRITE_API_KEY na Function |
| `FUNCTION_ERROR` | — | Błąd wykonania (klient) |
| `NETWORK_ERROR` | — | Sieć (klient) |
| `INVALID_INSTALLATION` | 400 | Telemetria — zły UUID |
| `BATCH_TOO_LARGE` | 400 | Telemetria — za duży batch |
| `INGEST_FAILED` | 500 | Telemetria — błąd zapisu (sprawdź `/health` → `telemetrySchema`) |
| `INVALID_ACTIVITY` | 400 | Nieprawidłowe `currentActivity` w presence |

---

## 17. Test plan — Beta feedback v2

| # | Scenariusz | Oczekiwany wynik |
|---|------------|------------------|
| 1 | Po `migrate-telemetry` + redeploy: uruchom launcher, graj 2 min | Brak `INGEST_FAILED` w konsoli; `/health` → `telemetrySchema.ok: true` |
| 2 | Otwórz szczegóły gry, naciśnij ESC | Widok zamyka się z dowolnego miejsca w `GameDetails` |
| 3 | Konto A uruchamia grę; konto B odświeża znajomych | A w sekcji „Teraz grają” z nazwą tytułu |
| 4 | Szczegóły gry (Steam + API key) | Min. 5 sekcji: playtime 2w, launch count, news, folder, znajomi Quark, notatki |
| 5 | Uruchom grę w Electron, Ctrl+Alt+F10 ×2 | Nakładka „Quark” (#d4ff00) w lewym górnym rogu; drugie naciśnięcie chowa |
| 6 | Znajomy uruchamia grę (powiadomienia włączone) | Powiadomienie w dzwonku; wyłączenie w Ustawienia → Prywatność |
| 7 | Profil znajomego grającego w grę z Twojej biblioteki | Przycisk „Uruchom tę samą grę” |

---

## Powiązane dokumenty

- [TELEMETRY-PLAN.md](./TELEMETRY-PLAN.md) — plan i fazy telemetrii
- [ZMIANY-2026-06-23.md](./ZMIANY-2026-06-23.md) — historia zmian produktowych
- [README.md](./README.md) — indeks dokumentacji
