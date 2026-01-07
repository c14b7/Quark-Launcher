# Quark Launcher

Ultra-nowoczesny launcher gier dla Windows, zbudowany z użyciem Electron + Next.js + shadcn/ui.

![Quark Launcher](./preview.png)

## Funkcje

✅ **Automatyczne wykrywanie gier Steam** - Skanuje zainstalowane gry ze Steam
✅ **Ulubione gry** - Wyróżnione duże karty na górze ekranu głównego
✅ **Szczegóły gry** - Pełne informacje z tłem i grafikami
✅ **Uruchamianie gier** - Bezpośrednie uruchamianie przez Steam
✅ **Wyszukiwanie** - Szybkie wyszukiwanie w bibliotece
✅ **Ciemny motyw** - Nowoczesny interfejs z gradientami

## Architektura

```
New/
├── Windows app/          # Aplikacja Electron
│   ├── main.js          # Główny proces Electron
│   ├── preload.js       # Bridge API
│   └── package.json     # Zależności Electron
│
└── web/act-l/           # Aplikacja Next.js (renderer)
    ├── app/             # App Router
    ├── components/      # Komponenty React
    │   ├── ui/          # shadcn/ui
    │   ├── launcher.tsx # Główny komponent
    │   ├── sidebar.tsx
    │   ├── game-card.tsx
    │   ├── game-details.tsx
    │   └── ...
    └── lib/             # Utilities i konteksty
        ├── games-context.tsx
        ├── types.ts
        └── utils.ts
```

## Uruchomienie (Development)

### 1. Uruchom Next.js

```bash
cd New/web/act-l
npm install
npm run dev
```

### 2. Uruchom Electron

```bash
cd New/Windows\ app
npm install
npm start
```

Lub użyj skryptu `dev` który uruchamia oba jednocześnie:

```bash
cd New/Windows\ app
npm run dev
```

## Budowanie

```bash
cd New/Windows\ app
npm run build
```

## Technologie

- **Electron** - Framework desktop
- **Next.js 16** - React framework z App Router
- **shadcn/ui** - Komponenty UI (New York style)
- **Tailwind CSS 4** - Stylowanie
- **Lucide Icons** - Ikony
- **TypeScript** - Typowanie

## Struktura danych gier

```typescript
interface Game {
  id: string;
  name: string;
  platform: 'steam' | 'xbox' | 'epic' | 'custom';
  installed: boolean;
  
  // Obrazy
  image: string;      // Header 460x215
  hero: string;       // Hero 1920x620
  logo: string;       // Logo przezroczyste
  capsule: string;    // Pionowa 600x900
  background: string; // Pełne tło
  
  // Opcjonalne
  isFavorite?: boolean;
  playtime?: number;
  lastPlayed?: string;
}
```

## API Steam

Obrazy gier Steam są ładowane z CDN:
- Header: `https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg`
- Hero: `https://cdn.akamai.steamstatic.com/steam/apps/{appid}/library_hero.jpg`
- Logo: `https://cdn.akamai.steamstatic.com/steam/apps/{appid}/logo.png`
- Capsule: `https://cdn.akamai.steamstatic.com/steam/apps/{appid}/library_600x900.jpg`

## Licencja

MIT
