# 🎮 Jak połączyć konto Steam w Quark Launcher

## 📋 Krok po kroku

### 1️⃣ Zdobądź Steam API Key (WYMAGANE!)

1. Przejdź na stronę: **https://steamcommunity.com/dev/apikey**
2. Zaloguj się na swoje konto Steam
3. Wypełnij formularz:
   - **Domain Name:** `localhost` (lub `127.0.0.1`)
   - Zaakceptuj warunki użytkowania
4. **Skopiuj wygenerowany klucz API** (64-znakowy ciąg, np. `A1B2C3D4E5F6...`)

⚠️ **WAŻNE:** Bez tego klucza integracja Steam NIE BĘDZIE działać!

---

### 2️⃣ Dodaj klucz API do Quark Launcher

1. W launcherze kliknij ikonę **⚙️ Ustawienia** (prawy górny róg)
2. Przejdź do zakładki **"Ogólne"**
3. Przewiń do sekcji **"Integracja Steam"**
4. Wklej skopiowany klucz w pole **"Steam API Key"**
5. Zamknij ustawienia (klucz zapisze się automatycznie)

---

### 3️⃣ Połącz konto Steam

1. W sidebarze kliknij **"Połączone konta"** (ikona użytkownika 👤)
2. Kliknij zakładkę **"Integracje"** (obok "Profil")
3. W sekcji Steam zobaczysz panel połączenia
4. Wpisz swój **Steam ID** lub **URL profilu** w jedno z formatów:
   - Steam ID (17 cyfr): `76561198012345678`
   - Custom URL: `mycustomurl`
   - Pełny URL profilu: `https://steamcommunity.com/id/mycustomurl`
   - Pełny URL z ID: `https://steamcommunity.com/profiles/76561198012345678`
5. Kliknij **"Połącz konto"**

---

### 4️⃣ Gotowe! 🎉

Po połączeniu zobaczysz:
- ✅ Twój profil Steam z avatarem
- 🎮 Listę posiadanych gier
- 🏆 Statystyki (gry, osiągnięcia, poziom Steam)
- 👥 Lista znajomych (jeśli profil publiczny)
- ⏰ Ostatnio grane gry

---

## 🔍 Gdzie znaleźć swój Steam ID?

### Metoda 1: Z profilu Steam
1. Otwórz swój profil na Steam
2. Jeśli masz custom URL, np. `steamcommunity.com/id/TWOJANAZWA` - użyj `TWOJANAZWA`
3. Jeśli masz numeryczny profil, np. `steamcommunity.com/profiles/76561198012345678` - użyj `76561198012345678`

### Metoda 2: Użyj strony SteamID.io
1. Przejdź na: https://steamid.io
2. Wpisz nazwę użytkownika lub URL profilu
3. Skopiuj **steamID64** (17 cyfr)

---

## ❌ Rozwiązywanie problemów

### "Nie można znaleźć profilu Steam"
- ✅ Sprawdź czy Steam ID/URL jest poprawny
- ✅ Upewnij się że profil Steam jest **publiczny** (nie prywatny)
- ✅ Sprawdź czy klucz API jest prawidłowy

### "Nieprawidłowe Steam ID"
- ✅ Użyj 17-cyfrowego Steam ID64 zamiast custom URL
- ✅ Usuń `https://steamcommunity.com` z URL

### Nie widzę panelu Steam w "Integracje"
- ✅ Upewnij się że jesteś w zakładce **"Integracje"**, nie "Profil"
- ✅ Sprawdź czy aplikacja jest zaktualizowana
- ✅ Przeładuj stronę (F5)

### Dane nie ładują się / "Private Profile"
- ✅ Ustaw profil Steam jako **publiczny** w ustawieniach prywatności Steam
- ✅ Dodaj klucz Steam API w ustawieniach launchera
- ✅ Poczekaj chwilę - pierwsze ładowanie może potrwać 10-30 sekund

---

## 🔒 Prywatność i bezpieczeństwo

- ✅ Klucz API jest przechowywany **lokalnie** w przeglądarce (localStorage)
- ✅ **Nie wysyłamy** Twoich danych na nasze serwery
- ✅ Wszystkie zapytania idą bezpośrednio do Steam API
- ✅ Możesz odłączyć konto w każdej chwili

---

## 📊 Jakie dane zbieramy?

Gdy połączysz Steam, pobieramy:
- 👤 Profil użytkownika (nazwa, avatar, poziom)
- 🎮 Lista posiadanych gier
- 🏆 Osiągnięcia i statystyki
- 👥 Lista znajomych (jeśli profil publiczny)
- ⏰ Historia gier (ostatnio grane)

**Wszystko jest cache'owane lokalnie** - dane są odświeżane co kilka godzin.

---

## 🚀 Co dalej?

Po połączeniu Steam:
1. Gry Steam pojawią się w zakładce **"Biblioteka"**
2. Zobaczysz statystyki w profilu Steam na sidebarze
3. Możesz uruchamiać gry bezpośrednio z launchera
4. System osiągnięć będzie zsynchronizowany

---

**💡 Potrzebujesz pomocy?** Sprawdź panel **Admin** w ustawieniach, gdzie znajdziesz narzędzia diagnostyczne!
