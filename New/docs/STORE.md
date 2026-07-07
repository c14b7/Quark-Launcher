# Sklep Quark — dokumentacja

Wieloplatformowy widok sklepu w launcherze: promocje Steam, agregator okazji kluczy (CheapShark) oraz darmowe gry Epic.

## Zakładki

| Zakładka | Źródło danych | IPC (Electron) |
|----------|---------------|----------------|
| **Steam** | `store.steampowered.com` (publiczne API) | `steam-store-search`, `steam-store-featured`, `steam-store-details` |
| **Okazje kluczy** | [CheapShark API](https://www.cheapshark.com/api) | `cheapshark-deals` |
| **Epic — darmowe** | Epic promotions (nieoficjalne) | `epic-free-games` |

---

## Architektura

```
StoreView → StoreProvider → store-service → electronAPI → store-api.js → zewnętrzne API
```

| Plik | Rola |
|------|------|
| `web/act-l/components/store-view.tsx` | UI z tabami i siatką kart |
| `web/act-l/lib/store-context.tsx` | Cache, debounce wyszukiwania |
| `web/act-l/lib/store-service.ts` | Wrapper IPC |
| `Windows app/store-api.js` | Fetch + cache TTL 15 min |
| `Windows app/main.js` | Handlery IPC |

Cache: `userData/cache/store/` — ogranicza rate limit Steam.

---

## Integracja z biblioteką

Karty pokazują badge **Owned** / **Installed** na podstawie `games-context.tsx` (cross-ref `appId` / nazwy).

---

## Udostępnianie w chacie

Przycisk **Udostępnij w chacie** na karcie okazji tworzy wiadomość `store_deal` z attachmentem `kind: deal` i przechodzi do zakładki Chat.

Telemetria: `store.search`.

---

## Ograniczenia

| Platforma | Uwaga |
|-----------|-------|
| Steam | Rate limits — cache + debounce 400 ms |
| Epic | Tylko sekcja darmowych; API może być niestabilne |
| G2A/Kinguin | Brak browse API — redirect przez CheapShark `dealID` |
| GOG / Xbox | Placeholder „Wkrótce” |

---

## Powiązana dokumentacja

- `docs/CHAT.md` — wiadomości `store_deal`
- `docs/API-REFERENCE.md` — sekcja Electron IPC
