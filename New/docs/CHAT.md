# Gaming Chat — dokumentacja

Chat Quark umożliwia rozmowy DM i grupowe między znajomymi Quark, z obsługą wiadomości rich (gry, osiągnięcia, okazje ze sklepu) oraz powiadomień w nakładce podczas gry.

## Szybki start

1. Dodaj znajomego (kod Quark lub zaproszenie).
2. Otwórz zakładkę **Chat** w sidebarze lub kliknij **Napisz** na karcie znajomego.
3. Wyślij wiadomość tekstową lub użyj quick reply (GG, Dołącz, …).
4. Udostępnij grę z **szczegółów gry** lub okazję ze **Sklepu**.

---

## Architektura

```
ChatView → ChatProvider → chat-service → Appwrite Function /chat/*
                        → chat-realtime → Appwrite Realtime (messages)
                        → electronAPI.showOverlayNotification → OverlayManager
```

| Warstwa | Pliki |
|---------|-------|
| UI | `web/act-l/components/chat/*` |
| Stan | `web/act-l/lib/chat-context.tsx` |
| API | `web/act-l/lib/chat-service.ts` |
| Realtime | `web/act-l/lib/chat-realtime.ts` |
| Backend | `functions/chat-api.ts` |
| Schemat | `functions/lib/chat-schema.ts`, `functions/migrate-chat-schema.ts` |

---

## Baza danych (Appwrite)

| Kolekcja | Opis |
|----------|------|
| `conversations` | `type`: `dm` \| `group`; `dmKey` zapobiega duplikatom DM |
| `conversation_members` | Rola, `lastReadAt`, mute, pin |
| `messages` | `type`: text, game_share, achievement_share, store_deal, lfg, system |

Migracja: `cd functions && npm run migrate-chat`

---

## Realtime

Klient subskrybuje dokumenty `messages` przez Appwrite Realtime. Każda wiadomość musi mieć uprawnienia `read` dla członków konwersacji — ustawiane w `chat-api.ts` przy tworzeniu dokumentu.

Fallback: polling listy konwersacji co 60 s gdy Realtime jest niedostępny.

---

## Typy wiadomości rich

| Typ | Źródło | `attachments.kind` |
|-----|--------|-------------------|
| Udostępnienie gry | `game-details.tsx` | `game` |
| Osiągnięcie | `game-details.tsx` (osiągnięcia Steam) | `achievement` |
| Okazja | `store-view.tsx` | `deal` |
| LFG | Composer → menu załączników | `lfg` |

---

## Nawigacja i skróty

| Akcja | Skrót / ścieżka |
|-------|-----------------|
| Przełącz wątek 1–9 | `Ctrl+1` … `Ctrl+9` |
| Otwórz chat z powiadomienia | Klik w dzwonku → wątek |
| Ostatnie rozmowy | Panel znajomych → sekcja „Ostatnie rozmowy” |

Event `quark-navigate` z `detail: 'chat'` przełącza widok launchera.

---

## Powiadomienia

- **Launcher:** inbox w `notifications-menu.tsx` + badge na zakładce Chat.
- **Nakładka:** toast w grze (patrz `docs/OVERLAY.md`).
- **OS:** gdy nakładka ukryta i włączone `chatNotificationsWhenHidden`.

Telemetria (whitelist): `chat.message_sent`, `chat.group_created`, `chat.deal_shared`, `overlay.chat_notification`.

---

## Powiązana dokumentacja

- `docs/API-REFERENCE.md` — sekcja `/chat/*`
- `docs/STORE.md` — udostępnianie okazji
- `docs/OVERLAY.md` — powiadomienia w grze
