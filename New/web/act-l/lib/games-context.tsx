'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Game } from '@/lib/types';
import { ToastContext } from '@/lib/toast-context';

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
  
  // Toast notifications - may be undefined if ToastProvider not yet mounted
  const toast = useContext(ToastContext);

  // Load games on mount - only run once on component initialization
  useEffect(() => {
    refreshGames();
    loadUserSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run on mount, dependencies would cause infinite loops
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
        const steamGames = await window.electronAPI.steamGetInstalledGames();
        setGames(steamGames);
        toast?.success(`Załadowano ${steamGames.length} gier`);
      } else {
        // Mock data for development without Electron
        setGames(getMockGames());
      }
    } catch (err) {
      const errorMsg = 'Nie udało się załadować gier';
      setError(errorMsg);
      toast?.error(errorMsg);
      console.error('Failed to load games:', err);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const toggleFavorite = useCallback(async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    const isFavorited = favoriteIds.includes(gameId);
    
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
    
    if (game) {
      toast?.[isFavorited ? 'info' : 'success'](
        isFavorited 
          ? `Usunięto ${game.name} z ulubionych` 
          : `Dodano ${game.name} do ulubionych`
      );
    }
  }, [favoriteIds, games, toast]);

  const launchGame = useCallback(async (game: Game) => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.launchGame({
          platform: game.platform,
          gameId: game.id
        });
        
        if (!result.success) {
          const errorMsg = result.error || 'Nie udało się uruchomić gry';
          setError(errorMsg);
          toast?.error(errorMsg);
        } else {
          toast?.success(`Uruchamianie ${game.name}...`);
        }
      } else {
        // Development fallback
        window.open(`steam://rungameid/${game.id}`, '_blank');
        toast?.info(`Uruchamianie ${game.name}...`);
      }
    } catch (err) {
      const errorMsg = 'Nie udało się uruchomić gry';
      setError(errorMsg);
      toast?.error(errorMsg);
      console.error('Failed to launch game:', err);
    }
  }, [toast]);

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
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/570/library_hero.jpg',
      logo: 'https://cdn.akamai.steamstatic.com/steam/apps/570/logo.png',
      capsule: 'https://cdn.akamai.steamstatic.com/steam/apps/570/library_600x900.jpg',
      background: 'https://cdn.akamai.steamstatic.com/steam/apps/570/page_bg_generated_v6b.jpg'
    }
  ];
}
