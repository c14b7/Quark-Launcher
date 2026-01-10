'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Game } from '@/lib/types';

interface GamesContextType {
  games: Game[];
  favoriteGames: Game[];
  isLoading: boolean;
  error: string | null;
  selectedGame: Game | null;
  setSelectedGame: (game: Game | null) => void;
  refreshGames: () => Promise<void>;
  toggleFavorite: (gameId: string) => void;
  launchGame: (game: Game) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredGames: Game[];
}

const GamesContext = createContext<GamesContextType | undefined>(undefined);

export function GamesProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load games on mount
  useEffect(() => {
    refreshGames();
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.loadUserData('favorites');
        if (result.success && result.data) {
          setFavoriteIds(result.data as string[]);
        }
      }
    } catch (err) {
      console.error('Failed to load user settings:', err);
    }
  };

  const refreshGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        // Pobierz gry ze wszystkich platform
        const [steamGames, epicGames] = await Promise.all([
          window.electronAPI.steamGetInstalledGames(),
          window.electronAPI.epicGetInstalledGames()
        ]);
        
        // Połącz gry z różnych platform
        const allGames = [...steamGames, ...epicGames];
        setGames(allGames);
      } else {
        // Mock data for development without Electron
        setGames(getMockGames());
      }
    } catch (err) {
      setError('Nie udało się załadować gier');
      console.error('Failed to load games:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback(async (gameId: string) => {
    setFavoriteIds(prev => {
      const newFavorites = prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId];
      
      // Save to storage
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.saveUserData('favorites', newFavorites);
      }
      
      return newFavorites;
    });
  }, []);

  const launchGame = useCallback(async (game: Game) => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.launchGame({
          platform: game.platform,
          gameId: game.id
        });
        
        if (!result.success) {
          setError(result.error || 'Nie udało się uruchomić gry');
        }
      } else {
        // Development fallback
        window.open(`steam://rungameid/${game.id}`, '_blank');
      }
    } catch (err) {
      setError('Nie udało się uruchomić gry');
      console.error('Failed to launch game:', err);
    }
  }, []);

  // Compute derived state
  const gamesWithFavorites = games.map(game => ({
    ...game,
    isFavorite: favoriteIds.includes(game.id)
  }));

  const favoriteGames = gamesWithFavorites.filter(g => g.isFavorite);

  const filteredGames = gamesWithFavorites.filter(game =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <GamesContext.Provider
      value={{
        games: gamesWithFavorites,
        favoriteGames,
        isLoading,
        error,
        selectedGame,
        setSelectedGame,
        refreshGames,
        toggleFavorite,
        launchGame,
        searchQuery,
        setSearchQuery,
        filteredGames
      }}
    >
      {children}
    </GamesContext.Provider>
  );
}

export function useGames() {
  const context = useContext(GamesContext);
  if (context === undefined) {
    throw new Error('useGames must be used within a GamesProvider');
  }
  return context;
}

// Mock data for development
function getMockGames(): Game[] {
  return [
    {
      id: '1245620',
      name: 'Elden Ring',
      platform: 'steam',
      installed: true,
      playtime: 7200, // 120 hours - experienced
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/page_bg_generated_v6b.jpg'
    },
    {
      id: '1091500',
      name: 'Cyberpunk 2077',
      platform: 'steam',
      installed: true,
      playtime: 90, // 1.5 hours - yellow "Nowy" badge
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/page_bg_generated_v6b.jpg'
    },
    {
      id: '1716740',
      name: 'Starfield',
      platform: 'steam',
      installed: true,
      playtime: undefined, // Never played - blue "Nowy" badge
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1716740/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/1716740/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/1716740/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/1716740/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/1716740/page_bg_generated_v6b.jpg'
    },
    {
      id: '730',
      name: 'Counter-Strike 2',
      platform: 'steam',
      installed: true,
      playtime: 18000, // 300 hours - experienced
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/730/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/730/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/730/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/730/page_bg_generated_v6b.jpg'
    },
    {
      id: '1172470',
      name: "Apex Legends",
      platform: 'steam',
      installed: true,
      playtime: 60, // 1 hour - yellow "Nowy" badge
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/1172470/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/1172470/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/1172470/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/1172470/page_bg_generated_v6b.jpg'
    },
    {
      id: '271590',
      name: 'Grand Theft Auto V',
      platform: 'steam',
      installed: true,
      playtime: 4800, // 80 hours - experienced
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/page_bg_generated_v6b.jpg'
    },
    {
      id: '1174180',
      name: 'Red Dead Redemption 2',
      platform: 'steam',
      installed: true,
      playtime: undefined, // Never played - blue "Nowy" badge
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/1174180/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/1174180/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/1174180/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/1174180/page_bg_generated_v6b.jpg'
    },
    {
      id: '2050650',
      name: 'Resident Evil 4',
      platform: 'steam',
      installed: true,
      playtime: 900, // 15 hours - experienced
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/2050650/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/2050650/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/2050650/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/2050650/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/2050650/page_bg_generated_v6b.jpg'
    },
    {
      id: '892970',
      name: 'Valheim',
      platform: 'steam',
      installed: true,
      playtime: 120, // 2 hours - yellow "Nowy" badge
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/892970/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/892970/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/892970/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/892970/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/892970/page_bg_generated_v6b.jpg'
    },
    {
      id: '570',
      name: 'Dota 2',
      platform: 'steam',
      installed: true,
      playtime: 36000, // 600 hours - experienced
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/570/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/570/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/570/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/570/page_bg_generated_v6b.jpg'
    },
    // Epic Games examples
    {
      id: 'fn:Fortnite:fn',
      name: 'Fortnite',
      platform: 'epic',
      installed: true,
      playtime: 340,
      image: 'https://cdn2.unrealengine.com/17br-evergreen-egs-launcher-blade-2560x1440-2560x1440-2c9534797672.jpg',
      hero: 'https://cdn2.unrealengine.com/17br-evergreen-egs-launcher-blade-2560x1440-2560x1440-2c9534797672.jpg',
      logo: 'https://cdn2.unrealengine.com/17br-evergreen-egs-launcher-blade-2560x1440-2560x1440-2c9534797672.jpg',
      capsule: 'https://cdn2.unrealengine.com/17br-evergreen-egs-launcher-blade-2560x1440-2560x1440-2c9534797672.jpg',
      background: 'https://cdn2.unrealengine.com/17br-evergreen-egs-launcher-blade-2560x1440-2560x1440-2c9534797672.jpg'
    },
    {
      id: 'sugarysnowchance:Sugar:rocket-league',
      name: 'Rocket League',
      platform: 'epic',
      installed: true,
      playtime: 180,
      image: 'https://cdn1.epicgames.com/offer/9773aa1aa54f4f7b80e44bef04986cea/EGS_RocketLeague_PsyonixLLC_S2_1200x1600-96652da6f9a48c2e4b36b5fcb414fc15',
      hero: 'https://cdn1.epicgames.com/offer/9773aa1aa54f4f7b80e44bef04986cea/EGS_RocketLeague_PsyonixLLC_S2_1200x1600-96652da6f9a48c2e4b36b5fcb414fc15',
      logo: 'https://cdn1.epicgames.com/offer/9773aa1aa54f4f7b80e44bef04986cea/EGS_RocketLeague_PsyonixLLC_S2_1200x1600-96652da6f9a48c2e4b36b5fcb414fc15',
      capsule: 'https://cdn1.epicgames.com/offer/9773aa1aa54f4f7b80e44bef04986cea/EGS_RocketLeague_PsyonixLLC_S2_1200x1600-96652da6f9a48c2e4b36b5fcb414fc15',
      background: 'https://cdn1.epicgames.com/offer/9773aa1aa54f4f7b80e44bef04986cea/EGS_RocketLeague_PsyonixLLC_S2_1200x1600-96652da6f9a48c2e4b36b5fcb414fc15'
    },
    {
      id: '0584d2013f0149a791e7b9bad0eec102:9d2d0eb64d5c44529cece33fe2a46482:gta-5',
      name: 'Grand Theft Auto V',
      platform: 'epic',
      installed: true,
      playtime: 450,
      image: 'https://cdn1.epicgames.com/0584d2013f0149a791e7b9bad0eec102/offer/GTAV_EGS_Artwork_1200x1600_Portrait%20Store%20Banner-1200x1600-382243057711adf80322ed2aeea42191.jpg',
      hero: 'https://cdn1.epicgames.com/0584d2013f0149a791e7b9bad0eec102/offer/GTAV_EGS_Artwork_1200x1600_Portrait%20Store%20Banner-1200x1600-382243057711adf80322ed2aeea42191.jpg',
      logo: 'https://cdn1.epicgames.com/0584d2013f0149a791e7b9bad0eec102/offer/GTAV_EGS_Artwork_1200x1600_Portrait%20Store%20Banner-1200x1600-382243057711adf80322ed2aeea42191.jpg',
      capsule: 'https://cdn1.epicgames.com/0584d2013f0149a791e7b9bad0eec102/offer/GTAV_EGS_Artwork_1200x1600_Portrait%20Store%20Banner-1200x1600-382243057711adf80322ed2aeea42191.jpg',
      background: 'https://cdn1.epicgames.com/0584d2013f0149a791e7b9bad0eec102/offer/GTAV_EGS_Artwork_1200x1600_Portrait%20Store%20Banner-1200x1600-382243057711adf80322ed2aeea42191.jpg'
    }
  ];
}
