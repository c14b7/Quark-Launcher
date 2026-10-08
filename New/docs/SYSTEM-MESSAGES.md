# System Messages (Quark announcements)

Wiadomości systemowe Quark (`system_messages`) żyją w **tej samej bazie Appwrite co banery**. Zarządzasz nimi wyłącznie z **Appwrite Console** — klient launchera tylko czyta dokumenty (SDK `listDocuments`). Status przeczytania jest lokalny (`localStorage`).

| | |
|--|--|
| **Project** | `680d15210002f3f65ea9` |
| **Database ID** | `6a297ad10013177be1ab` |
| **Collection ID** | `system_messages` (utwórz ręcznie w Console) |

Powiązane banery (bez zmian): `up_banner`, `dialog_banner`, `side_banner`.

---

## 1. Utworzenie kolekcji w Console

1. Otwórz Appwrite Console → Databases → baza `6a297ad10013177be1ab`.
2. **Create collection** → Collection ID: `system_messages` (dokładnie ta nazwa).
3. **Document Security:** wyłączone **albo** Role `any` → **Read** na poziomie kolekcji.
4. Create / Update / Delete: tylko Team/Admin / API key — **klient nie zapisuje**.
5. Dodaj atrybuty według tabeli poniżej.
6. Indeksy: `start_date` (DESC); opcjonalnie `published`, `type`.

### Atrybuty

| Atrybut | Typ | Size / enum | Required | Default | Opis |
|---------|-----|-------------|----------|---------|------|
| `title` | string | 128 | tak | — | Tytuł w dzwonku i modalu |
| `summary` | string | 256 | nie | — | Jedna linia w dzwonku; fallback ≈ 120 znaków z `body_md` |
| `body_md` | string | 10000 | tak | — | Pełna treść Markdown |
| `type` | enum | `update`, `event`, `changelog`, `promo`, `alert` | tak | — | Ikona / kolor |
| `priority` | enum | `normal`, `high` | nie | `normal` | `high` → pin na górze + mocniejszy badge |
| `image_url` | string | 500 | nie | — | Hero nad tytułem w modalu |
| `action_text` | string | 64 | nie | — | CTA primary |
| `action_url` | string | 500 | nie | — | URL lub deep-link `quark://view/...` |
| `action_text_2` | string | 64 | nie | — | Drugi CTA |
| `action_url_2` | string | 500 | nie | — | URL / deep-link drugiego CTA |
| `start_date` | datetime | — | tak | — | Od kiedy pokazywać |
| `end_date` | datetime | — | nie | — | Do kiedy; puste = bez końca |
| `locale` | enum | `all`, `pl`, `en` | nie | `all` | Filtr wg języka launchera |
| `force_open` | boolean | — | nie | `false` | Raz automatycznie otwórz modal |
| `published` | boolean | — | tak | `true` | Soft-hide bez usuwania |

> **Uwaga Appwrite:** jeśli `published` / `force_open` / `priority` mają default, ustaw `required: false` przy tworzeniu atrybutu (wymóg platformy).

---

## 2. Uprawnienia i indeksy

- **Read:** `any` (publiczny odczyt jak banery) — treść nie jest sekretna.
- **Write:** tylko Console / server key.
- Indeks `start_date` DESC — launcher sortuje najnowsze pierwsze.
- Opcjonalnie indeks złożony `published` + `start_date`.

---

## 3. Checklist publikacji

Przed zapisaniem dokumentu:

- [ ] `published` = `true`
- [ ] `start_date` ≤ teraz (lub zaplanowana data)
- [ ] `end_date` puste albo w przyszłości
- [ ] `locale` = `all` / `pl` / `en` zgodnie z grupą odbiorców
- [ ] `title` + `body_md` wypełnione; sensowny `summary`
- [ ] CTA: tekst + URL / deep-link spójne
- [ ] `force_open` tylko gdy naprawdę chcesz auto-modal (raz na urządzenie)
- [ ] Obrazy: HTTPS URL w `image_url` lub `![](https://...)` w MD

---

## 4. Przykładowe dokumenty

### Changelog

```json
{
  "title": "Quark 0.0.7 — Chat & Store",
  "summary": "Czat grupowy, sklep i powiadomienia overlay.",
  "body_md": "## Co nowego\n\n- **Chat** z grupami i odpowiedziami\n- **Store** — Steam / Epic free / deals\n- Overlay toast przy wiadomościach\n\n![Hero](https://example.com/changelog.png)",
  "type": "changelog",
  "priority": "high",
  "image_url": "https://example.com/changelog-hero.png",
  "action_text": "Zobacz sklep",
  "action_url": "quark://view/store",
  "action_text_2": "Otwórz czat",
  "action_url_2": "quark://view/chat",
  "start_date": "2026-09-01T10:00:00.000Z",
  "end_date": null,
  "locale": "all",
  "force_open": true,
  "published": true
}
```

### Event

```json
{
  "title": "Weekendowy event — podwójne punkty",
  "summary": "Sobota–niedziela: bonusy w wydarzeniu społeczności.",
  "body_md": "Dołącz do eventu i zgarnij nagrody.\n\n- Start: **piątek 18:00**\n- Koniec: **niedziela 23:59**",
  "type": "event",
  "priority": "normal",
  "action_text": "Przejdź do newsa",
  "action_url": "quark://view/news",
  "start_date": "2026-09-05T00:00:00.000Z",
  "end_date": "2026-09-08T00:00:00.000Z",
  "locale": "pl",
  "force_open": false,
  "published": true
}
```

### Alert

```json
{
  "title": "Przerwa techniczna API",
  "summary": "Krótka niedostępność serwera Quark.",
  "body_md": "**Alert:** w godzinach 02:00–03:00 UTC możliwe błędy logowania i czatu.\n\nBiblioteka lokalna działa offline.",
  "type": "alert",
  "priority": "high",
  "start_date": "2026-09-04T20:00:00.000Z",
  "end_date": "2026-09-05T04:00:00.000Z",
  "locale": "all",
  "force_open": true,
  "published": true
}
```

---

## 5. Deep-linki `quark://view/...`

CTA `action_url` / `action_url_2`:

| URL | Widok launchera |
|-----|-----------------|
| `quark://view/home` | Home |
| `quark://view/library` | Biblioteka |
| `quark://view/store` | Sklep |
| `quark://view/chat` | Czat |
| `quark://view/accounts` | Konto |
| `quark://view/news` | Newsy |
| `quark://view/stats` | Statystyki |
| `quark://view/recap` | Quark Recap |
| `https://...` | Otwiera zewnętrznie (`shell.openExternal` / `window.open`) |

Implementacja: CustomEvent `quark-navigate` z `detail` = nazwa widoku.

---

## 6. Markdown w `body_md`

- Obrazy: `![opis](https://...)` — renderer: `max-w-full rounded-xl`
- Linki, `##`, listy, **bold**, bloki kodu
- **Bez** surowego HTML (`react-markdown` bez `rehype-raw`)
- Przyciski CTA = pola `action_*`, nie Markdown

---

## 7. Troubleshooting

| Objaw | Sprawdź |
|-------|---------|
| Nie widać wiadomości | `published`, `start_date` / `end_date`, `locale` vs język UI |
| Brak w dzwonku mimo Console | Collection ID = `system_messages`, read dla `any`, indeks `start_date` |
| Auto-modal nie działa | `force_open` + czy ID nie jest już w `quark-system-force-shown` |
| Stare przeczytane zniknęły | Historia lokalna: max 30 dni od `readAt` |
| CTA nie nawiguje | Prefiks `quark://view/` i znana nazwa widoku |
| Błąd size / attribute | Zmniejsz `body_md` / `summary`; w Appwrite limity size kolekcji |

Lokalne klucze:

- `quark-system-message-reads` — mapa `{ [id]: readAt ISO }`
- `quark-system-force-shown` — `string[]` ID już auto-otwartych

Polling klienta: start + co ~5 minut.

---

## Faza 2 (nie w MVP)

Reakcje emoji, ankieta 1 pytanie, targetowanie per `userId`, Realtime push, server-side rollup telemetrii do Recap.
