# Quark Launcher - Instrukcje testowania

## Instrukcja testowania aplikacji
1. Pobierz najnowszy Release z sekcji Releases
2. Zainstaluj i uruchom aplikację
3. Testuj funkcje zgodnie z poniższym przewodnikiem
4. Zgłaszaj błędy zgodnie z instrukcją poniżej

## Główne funkcje do przetestowania

### 🎮 Biblioteka gier
- **Wyszukiwanie gier**: Użyj pola wyszukiwania w lewym panelu
- **Przeglądanie**: Sprawdź widoki Home i Biblioteka
- **Szczegóły gry**: Kliknij na grę aby zobaczyć szczegóły
- **Ulubione**: Dodawaj gry do ulubionych (ikona gwiazdki)

### ⌨️ Skróty klawiszowe
- `Ctrl + H` - Przejdź do strony głównej
- `Ctrl + L` - Przejdź do biblioteki
- `Ctrl + ,` - Otwórz ustawienia
- `Ctrl + R` - Odśwież bibliotekę gier
- `ESC` - Zamknij bieżący dialog/szczegóły

### 🎨 Personalizacja
- **Motyw**: Tryb ciemny / OLED (w ustawieniach)
- **Skala UI**: Dostosuj rozmiar interfejsu (0.8x - 1.5x)
- **Ukryte gry**: Ukryj niechciane gry z biblioteki

### 📊 Statystyki gier
- Czas gry (w minutach/godzinach/dniach)
- Data ostatniej sesji
- Rozmiar na dysku
- Liczba sesji (jeśli dostępne)
- Osiągnięcia (jeśli dostępne)

### 🔔 Powiadomienia
- System toastów dla informacji zwrotnych
- Komunikaty o sukcesie (zielone)
- Błędy (czerwone)
- Informacje (niebieskie)
- Ostrzeżenia (żółte)

### ♿ Dostępność
- Pełna obsługa klawiatury
- ARIA labels dla czytników ekranu
- Wskaźniki focus dla elementów interaktywnych
- Wysokie kontrasty dla lepszej czytelności

## Zgłaszanie błędów

### Jak zgłosić błąd:
1. Przejdź do zakładki **Issues** na GitHub
2. Kliknij **New Issue**
3. Wypełnij szablon:
   - **Tytuł**: Krótki opis problemu
   - **Opis**: Szczegółowy opis co się stało
   - **Wersja**: Podaj wersję aplikacji
   - **Kroki reprodukcji**: Jak odtworzyć błąd
   - **Zrzuty ekranu**: Jeśli możliwe, dołącz screeny
   - **Logi**: Dołącz logi błędów (jeśli dostępne)
4. Wyślij issue

### Przykład zgłoszenia:
```
Tytuł: Nie można uruchomić gry z Epic Games Store

Opis: Po kliknięciu "Uruchom grę" dla gier z Epic Games Store pojawia się błąd

Wersja: v0.1.0

Kroki reprodukcji:
1. Otwórz szczegóły gry z Epic Games Store
2. Kliknij przycisk "Uruchom grę"
3. Pojawia się komunikat o błędzie

Screenshot: [załącznik]
```

## Najczęstsze problemy

### Gry nie są wykrywane
- Upewnij się, że Steam/Epic Games/Xbox jest zainstalowany
- Sprawdź czy aplikacja ma uprawnienia do odczytu folderów gier
- Spróbuj odświeżyć bibliotekę (Ctrl + R)

### Problemy z uruchomieniem gry
- Sprawdź czy gra jest zainstalowana
- Upewnij się, że odpowiedni launcher (Steam/Epic/Xbox) jest uruchomiony
- Sprawdź logi aplikacji

### Problemy z wydajnością
- Spróbuj zmniejszyć skalę UI w ustawieniach
- Zamknij inne aplikacje
- Sprawdź użycie pamięci w menedżerze zadań

## Sugestie i uwagi
Jeśli masz pomysły na nowe funkcje lub ulepszenia, również zgłaszaj je przez Issues z etykietą "enhancement".

Dziękujemy za testowanie! 🚀
