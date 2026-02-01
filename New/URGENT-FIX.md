# 🔧 PILNA NAPRAWA - Brak atrybutów w bazie danych

## ❌ Problem

```
Invalid document structure: Unknown attribute: "steamLinked"
Document with the requested ID '6961b537001c5c22825d' could not be found.
```

Kolekcja `user_profiles` w Appwrite **nie ma wymaganych atrybutów** (`steamLinked`, `steamId`).

---

## ✅ Rozwiązanie - 2 opcje

### Opcja 1: Automatyczna naprawa (ZALECANE) ⚡

Uruchom skrypt naprawczy:

```bash
cd "C:\Users\gpzin\Documents\GitHub\quark-l\Quark-Launcher\New\functions"
npx ts-node fix-user-profiles.ts
```

Skrypt doda brakujące atrybuty do kolekcji `user_profiles`.

---

### Opcja 2: Ręczna naprawa w Appwrite Dashboard 🖱️

1. Idź na: https://cloud.appwrite.io/console
2. Wybierz projekt **Quark Launcher** (ID: `680d15210002f3f65ea9`)
3. Przejdź do **Databases** → `quark_launcher_db` → **user_profiles**
4. Kliknij **Attributes** → **Create attribute**

**Dodaj 2 atrybuty:**

#### Atrybut 1: steamLinked
- Type: **Boolean**
- Key: `steamLinked`
- Required: **No** (unchecked)
- Default value: `false`
- Kliknij **Create**

#### Atrybut 2: steamId  
- Type: **String**
- Key: `steamId`
- Size: `50`
- Required: **No** (unchecked)
- Kliknij **Create**

⏳ **Poczekaj 10-30 sekund** aż atrybuty będą gotowe (status zmieni się na "Available")

---

## 🔄 Po naprawie

1. **Wyloguj się** z aplikacji (użyj przycisku w Ustawieniach → Admin → "Resetuj program")
2. **Zaloguj się ponownie** - profil zostanie automatycznie utworzony z nowymi atrybutami
3. **Połącz Steam** - teraz powinno działać!

---

## 🐛 Inne błędy które naprawiłem

### CORS dla Steam API - NAPRAWIONE ✅
- Dodano Electron proxy w `main.js` i `preload.js`
- Wszystkie funkcje Steam API teraz używają proxy
- `resolveVanityUrl` i `getPlayerSummary` naprawione

### Duplikaty kluczy React - NAPRAWIONE ✅
- Dodano indeksy do kluczy w `home-view.tsx` i `library-view.tsx`

---

## 📝 Sprawdzenie czy zadziałało

Po uruchomieniu skryptu naprawczego, sprawdź w konsoli:

```
🔧 Fixing user_profiles collection...

📝 Adding steamLinked attribute...
   ✅ steamLinked attribute added

📝 Adding steamId attribute...
   ✅ steamId attribute added

✅ Done! Attributes should be ready in a few seconds.
```

Jeśli widzisz ✅ - wszystko OK!

---

## ⚠️ WAŻNE

**NIE USUWAJ** kolekcji `user_profiles` - stracisz wszystkie dane użytkowników!

Tylko **dodaj brakujące atrybuty**.

---

**💡 Po naprawie aplikacja powinna działać poprawnie!** 🚀
