# Dev Console Cheatsheet (`window.quark`)

Po odblokowaniu Dev (`dev:5827` + Ctrl+Shift+N) lub w Electronie DevTools Console wpisz:

```js
quark.help()
```

API montuje się automatycznie przy starcie launchera (`mountQuarkConsole`).

---

## Nawigacja

```js
quark.nav('home')
quark.nav('library')
quark.nav('store')
quark.nav('chat')
quark.nav('accounts')
quark.nav('news')
quark.nav('stats')
quark.nav('downloads')
```

## Stats / sesje

```js
await quark.stats.local()          // lokalny public summary
await quark.stats.sync()           // PUT /stats/summary
await quark.stats.seed(20)         // fake sessions
await quark.stats.clearSessions()
quark.stats.lastPayload()
quark.stats.visibility()           // friends | private

await quark.sessions.list()
quark.sessions.active()
await quark.sessions.end()
```

## Kategorie

```js
quark.categories.rebuildAuto()
quark.categories.list()
```

## System messages / banery

```js
quark.sysmsg.refresh()
quark.sysmsg.open('DOCUMENT_ID')

quark.banners.test('update')
quark.banners.test('dialog')
quark.banners.test('side')
quark.banners.test('overlay-toast')
quark.banners.test('os-notification')
```

## Friends / storage / i18n

```js
quark.friends.presence('playing', { gameId: '570', name: 'Dota 2' })

await quark.storage.get('launchStats')
quark.storage.keys()

quark.i18n.showKeys(true)
quark.i18n.showKeys(false)
```

## Recap / Dev

```js
quark.recap.open()

quark.dev.unlock()
quark.dev.inspector()
await quark.dev.devtools()
quark.dev.log()
quark.dev.clearLog()
```

---

## Ustawienia UI

**Ustawienia → Dev** (po unlock):

- Otwórz Chromium DevTools / Dev Inspector
- Kopiuj cheatsheet
- Seed sesji, rebuild auto-kategorii, force stats sync, clear sessions
- Nav do Stats / Recap

Pełny opis stats sync: kolekcja `user_play_stats`, endpointy `/stats/*` (redeploy Function + `setup-database`).
