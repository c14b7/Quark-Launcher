'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Game } from '@/lib/types';
import { useSettings } from '@/lib/settings-context';
import {
  loadPlayHistory,
  persistPlayHistory,
  recordGameLaunch,
  getRecentlyPlayedIds,
  loadLaunchStats,
  persistLaunchStats,
  recordLaunchStats,
  type PlayHistory,
} from '@/lib/play-history';
import { setPlayingGame, clearPlayingGame, activityPayloadForPresence } from '@/lib/activity-presence';
import { friendsService } from '@/lib/friends-service';
import { track, logTelemetry } from '@/lib/telemetry/client';

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
  recentlyPlayedGames: Game[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredGames: Game[];
}

const GamesContext = createContext<GamesContextType | undefined>(undefined);

export function GamesProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [playHistory, setPlayHistory] = useState<PlayHistory>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameSnapshot, setSelectedGameSnapshot] = useState<Game | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { settings } = useSettings();

  const setSelectedGame = useCallback((game: Game | null) => {
    setSelectedGameSnapshot(game);
  }, []);

  // Track if we've enriched games already to avoid infinite loops
  const [hasEnrichedGames, setHasEnrichedGames] = useState(false);

  // Load games on mount
  useEffect(() => {
    refreshGames();
    loadUserSettings();
  }, []);

  // Refresh playtime when Steam settings change OR when games load for the first time
  useEffect(() => {
    const steamGames = games.filter(g => g.platform === 'steam');
    const needsEnrichment = steamGames.length > 0 && steamGames.every(g => g.playtime === undefined);
    
    if (settings.steamApiKey && settings.steamUserId && games.length > 0 && (!hasEnrichedGames || needsEnrichment)) {
      console.log('[GAMES] Triggering enrichGamesWithSteamData...');
      enrichGamesWithSteamData();
      setHasEnrichedGames(true);
    }
  }, [settings.steamApiKey, settings.steamUserId, games.length, hasEnrichedGames]);

  const loadUserSettings = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const [favoritesResult, history] = await Promise.all([
          window.electronAPI.loadUserData('favorites'),
          loadPlayHistory(),
        ]);
        if (favoritesResult.success && favoritesResult.data) {
          setFavoriteIds(favoritesResult.data as string[]);
        }
        setPlayHistory(history);
      } else {
        const history = await loadPlayHistory();
        setPlayHistory(history);
      }
    } catch (err) {
      console.error('Failed to load user settings:', err);
    }
  };

  // Enrich games with Steam playtime data
  const enrichGamesWithSteamData = async () => {
    if (!settings.steamApiKey || !settings.steamUserId) {
      console.log('[GAMES] No Steam API key or User ID configured');
      return;
    }
    
    console.log('[GAMES] Enriching games with Steam data...');
    console.log('[GAMES] API Key:', settings.steamApiKey.substring(0, 8) + '...');
    console.log('[GAMES] Steam User ID:', settings.steamUserId);
    
    try {
      if (typeof window !== 'undefined' && window.electronAPI.steamGetOwnedGames) {
        const result = await window.electronAPI.steamGetOwnedGames(
          settings.steamApiKey,
          settings.steamUserId
        );
        
        console.log('[GAMES] Steam API result:', result.success ? 'success' : 'failed');
        if (!result.success) {
          console.log('[GAMES] Error:', result.error);
          return;
        }
        
        if (result.success && result.data) {
          const dataKeys = Object.keys(result.data);
          console.log('[GAMES] Received playtime for', dataKeys.length, 'games');
          console.log('[GAMES] Playtime data sample keys:', dataKeys.slice(0, 5));
          
          // Log sample playtime values
          dataKeys.slice(0, 3).forEach(key => {
            console.log(`[GAMES] Playtime for key "${key}":`, result.data?.[key]);
          });
          
          setGames(prevGames => {
            const steamGames = prevGames.filter(g => g.platform === 'steam');
            console.log('[GAMES] Steam games in library:', steamGames.length);
            console.log('[GAMES] Steam game IDs (type check):', steamGames.slice(0, 5).map(g => ({ id: g.id, type: typeof g.id })));
            
            let matchCount = 0;
            const updatedGames = prevGames.map(game => {
              if (game.platform === 'steam') {
                // Ensure game.id is string for lookup
                const gameIdStr = String(game.id);
                const steamData = result.data?.[gameIdStr];
                if (steamData) {
                  matchCount++;
                  console.log(`[GAMES] Match found for ${game.name} (${gameIdStr}):`, steamData.playtime, 'minutes');
                  return {
                    ...game,
                    playtime: steamData.playtime,
                    playtime2weeks: steamData.playtime2weeks,
                  };
                } else {
                  console.log(`[GAMES] No playtime data for ${game.name} (ID: "${gameIdStr}", type: ${typeof game.id})`);
                }
              }
              return game;
            });
            
            console.log(`[GAMES] Total matches: ${matchCount} / ${steamGames.length} steam games`);
            return updatedGames;
          });
        }
      } else {
        console.log('[GAMES] electronAPI.steamGetOwnedGames not available');
      }
    } catch (err) {
      console.error('[GAMES] Failed to enrich games with Steam data:', err);
    }
  };

  const refreshGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setHasEnrichedGames(false); // Reset enrichment flag

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        // Pobierz gry ze wszystkich platform
        const [steamGames, epicGames] = await Promise.all([
          window.electronAPI.steamGetInstalledGames(),
          window.electronAPI.epicGetInstalledGames()
        ]);
        
        // Połącz gry z różnych platform
        const allGames = [...steamGames, ...epicGames];
        console.log('[GAMES] Loaded', allGames.length, 'games (Steam:', steamGames.length, ', Epic:', epicGames.length, ')');
        setGames(allGames);
        
        // Note: enrichGamesWithSteamData will be called by the useEffect when games.length changes
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
  }, [settings.steamApiKey, settings.steamUserId]);

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
    const markLaunched = () => {
      setPlayHistory((prev) => {
        const next = recordGameLaunch(prev, game.id);
        void persistPlayHistory(next);
        return next;
      });
      void loadLaunchStats().then((stats) => {
        const next = recordLaunchStats(stats, game.id);
        void persistLaunchStats(next);
      });
    };

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.launchGame({
          platform: game.platform,
          gameId: game.id
        });

        if (result.success) {
          markLaunched();
          setPlayingGame(game.id, game.name);
          friendsService.updatePresence('online', undefined, {
            currentGameId: game.id,
            currentGameName: game.name,
            currentActivity: 'playing',
          }).catch(() => {});
          track('game.launch', { gameId: game.id, platform: game.platform, success: true }, 'game');
        } else {
          setError(result.error || 'Nie udało się uruchomić gry');
          track(
            'game.launch_failed',
            { gameId: game.id, platform: game.platform, errorCode: result.error || 'unknown' },
            'game'
          );
        }
      } else {
        window.open(`steam://rungameid/${game.id}`, '_blank');
        markLaunched();
        setPlayingGame(game.id, game.name);
        friendsService.updatePresence('online', undefined, {
          currentGameId: game.id,
          currentGameName: game.name,
          currentActivity: 'playing',
        }).catch(() => {});
        track('game.launch', { gameId: game.id, platform: game.platform, success: true }, 'game');
      }
    } catch (err) {
      setError('Nie udało się uruchomić gry');
      console.error('Failed to launch game:', err);
      track('game.launch_failed', { gameId: game.id, platform: game.platform, errorCode: 'exception' }, 'game');
      logTelemetry('error', 'Game launch failed', { gameId: game.id }, err instanceof Error ? err.stack : undefined);
    }
  }, []);

  // Compute derived state - add isFavorite to all games
  const gamesWithFavorites = games.map(game => ({
    ...game,
    isFavorite: favoriteIds.includes(game.id),
    lastPlayed: playHistory[game.id],
  }));

  // Get selected game from current games list WITH favorites (so it always has updated data)
  const selectedGame = useMemo(() => {
    if (!selectedGameSnapshot) return null;
    return gamesWithFavorites.find((g) => g.id === selectedGameSnapshot.id) ?? selectedGameSnapshot;
  }, [selectedGameSnapshot, gamesWithFavorites]);

  const favoriteGames = gamesWithFavorites.filter(g => g.isFavorite);

  const filteredGames = gamesWithFavorites.filter(game =>
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentlyPlayedGames = useMemo(() => {
    const gameMap = new Map(gamesWithFavorites.map((g) => [g.id, g]));
    return getRecentlyPlayedIds(playHistory).flatMap((id) => {
      const game = gameMap.get(id);
      return game ? [game] : [];
    });
  }, [playHistory, gamesWithFavorites]);

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
        recentlyPlayedGames,
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
