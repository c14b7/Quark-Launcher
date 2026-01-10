# 📋 Zarządzanie Wersją Aplikacji

## Gdzie zmienić wersję?

### 1. Główny numer wersji
Wersja aplikacji jest przechowywana w pliku `package.json`:

```json
{
  "name": "act-l",
  "version": "0.1.0",  // ← TUTAJ zmieniasz wersję
  "private": true,
  ...
}
```

**Lokalizacja:** `New/web/act-l/package.json`

### 2. Konwencja wersjonowania (Semantic Versioning)

Używamy standardu [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR** (główna): Zmiany niekompatybilne wstecz (np. `1.0.0` → `2.0.0`)
- **MINOR** (drugorzędna): Nowe funkcje kompatybilne wstecz (np. `1.0.0` → `1.1.0`)
- **PATCH** (poprawka): Poprawki błędów (np. `1.0.0` → `1.0.1`)

### 3. Przykłady zmian wersji

| Typ zmiany | Przed | Po | Przykład |
|------------|-------|-----|----------|
| Nowa funkcja | `0.1.0` | `0.2.0` | Dodanie panelu Admin |
| Poprawka błędu | `0.1.0` | `0.1.1` | Fix walidacji hasła |
| Breaking change | `0.1.0` | `1.0.0` | Pierwsze wydanie produkcyjne |

### 4. Jak zaktualizować wersję?

1. Otwórz `New/web/act-l/package.json`
2. Znajdź linię z `"version"`
3. Zmień numer wersji zgodnie z konwencją
4. Zapisz plik
5. Wersja będzie widoczna w **Ustawienia → Admin → Informacje o wersji**

### 5. Automatyczna aktualizacja wersji (opcjonalnie)

Możesz użyć npm do automatycznego zwiększania wersji:

```bash
# Zwiększ PATCH (0.1.0 → 0.1.1)
npm version patch

# Zwiększ MINOR (0.1.0 → 0.2.0)
npm version minor

# Zwiększ MAJOR (0.1.0 → 1.0.0)
npm version major
```

### 6. Build i deployment

Po zmianie wersji:

```bash
# Zainstaluj zależności (jeśli potrzeba)
npm install

# Zbuduj aplikację
npm run build

# Lub uruchom w trybie deweloperskim
npm run dev
```

### 7. Gdzie wersja jest wyświetlana?

- **Panel Admin:** Ustawienia → Admin → Informacje o wersji
- **Console:** Wyświetlana w logach deweloperskich
- **About:** (planowane) W oknie "O aplikacji"

## 🔧 Inne miejsca z informacjami o wersji

### Zależności
Wersje bibliotek są również w `package.json`:
- Next.js: `16.1.1`
- React: `19.2.3`
- Appwrite: `21.5.0`

### Konfiguracja TypeScript
`tsconfig.json` - nie zawiera wersji aplikacji

### Environment Variables
`.env.local` - nie zawiera wersji aplikacji

---

## 📝 Changelog (Historia zmian)

### v0.1.0 (Aktualna)
- ✅ System logowania i rejestracji
- ✅ Integracja z Appwrite
- ✅ Onboarding flow
- ✅ Integracja ze Steam
- ✅ Panel Admin z narzędziami deweloperskimi
- ✅ Funkcja resetu aplikacji

---

**💡 Wskazówka:** Zawsze aktualizuj wersję przed wydaniem nowej wersji aplikacji!
