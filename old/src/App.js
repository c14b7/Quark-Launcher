import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar/Sidebar';
import TitleBar from './components/TitleBar/TitleBar';
import Hero from './components/Hero/Hero';
import GameGrid from './components/GameGrid/GameGrid';
import Settings from './components/Settings/Settings';
import About from './components/About/About';
import PlatformManager from './services/PlatformManager';
import './styles/globals.css';

const App = () => {
  const [currentView, setCurrentView] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [featuredGame, setFeaturedGame] = useState(null);
  const [platformStats, setPlatformStats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing Quark Launcher...');
      
      // Initialize platform manager
      const success = await PlatformManager.initialize();
      if (success) {
        console.log('Platform Manager initialized successfully');
        await loadGamesData();
      } else {
        console.warn('Platform Manager initialization failed, using fallback data');
        setGames([]); // Empty state
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('App initialization error:', error);
      setIsLoading(false);
    }
  };

  const loadGamesData = async () => {
    try {
      // Get all games from all platforms
      const allGames = await PlatformManager.getAllGames();
      console.log(`Loaded ${allGames.length} games from all platforms`);
      
      setGames(allGames);
      
      // Get platform statistics
      const stats = PlatformManager.getPlatformStats();
      setPlatformStats(stats);
      
      // Set featured game (first from featured list or most recently played)
      const featuredGames = PlatformManager.getFeaturedGames(1);
      if (featuredGames.length > 0) {
        setFeaturedGame(featuredGames[0]);
      } else if (allGames.length > 0) {
        setFeaturedGame(allGames[0]);
      }
      
    } catch (error) {
      console.error('Error loading games:', error);
      // Fallback to empty state
      setGames([]);
    }
  };

  const handleNavigation = (view) => {
    if (view === 'settings') {
      setShowSettings(true);
    } else if (view === 'about') {
      setShowAbout(true);
    } else {
      setCurrentView(view);
    }
  };

  const handleGameLaunch = async (game) => {
    try {
      console.log(`Launching ${game.name} from ${game.platform}`);
      
      if (PlatformManager.initialized) {
        const result = await PlatformManager.launchGame(game.id, game.platform);
        if (result.success) {
          console.log(`Successfully launched ${game.name}`);
          // Update the games list to reflect the new last played time
          await loadGamesData();
        } else {
          console.error(`Failed to launch ${game.name}:`, result.error);
        }
      } else {
        console.log('Platform Manager not initialized, using fallback launch');
        if (window.electronAPI) {
          await window.electronAPI.launchGame({
            platform: game.platform,
            gameId: game.id,
            gamePath: game.path
          });
        }
      }
    } catch (error) {
      console.error('Error launching game:', error);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handlePlatformFilter = (platform) => {
    setSelectedPlatform(platform);
  };

  const getFilteredGames = () => {
    let filtered = games;

    // Apply search filter
    if (searchQuery) {
      filtered = PlatformManager.searchGames(searchQuery);
    }

    // Apply platform filter
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(game => game.platform === selectedPlatform);
    }

    return filtered;
  };

  const getRecentGames = () => {
    if (!PlatformManager.initialized) return [];
    return PlatformManager.getRecentlyPlayed(10);
  };

  const getFavoriteGames = () => {
    // For now, return most played games as favorites
    if (!PlatformManager.initialized) return [];
    return PlatformManager.getMostPlayed(5);
  };

  const handleSettingsSave = (newSettings) => {
    console.log('Settings saved:', newSettings);
    // Apply theme changes or other settings here
    // Could trigger a re-render with new theme values
  };

  if (isLoading) {
    return (
      <div className="app loading">
        <motion.div 
          className="loading-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="loading-content">
            <motion.div 
              className="loading-logo"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <img src="/l/logo/256x256.png" alt="Quark Launcher" />
            </motion.div>
            <motion.h1 
              className="loading-title"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Quark Launcher
            </motion.h1>
            <motion.div 
              className="loading-bar"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
            <motion.p 
              className="loading-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Initializing game platforms...
            </motion.p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app">
      <TitleBar />
      
      <div className="app-content">
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigation}
          recentGames={getRecentGames()}
          favoriteGames={getFavoriteGames()}
          platformStats={platformStats}
          onSearch={handleSearch}
          onPlatformFilter={handlePlatformFilter}
          selectedPlatform={selectedPlatform}
        />
        
        <main className="main-content">
          <AnimatePresence mode="wait">
            {currentView === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="home-view"
              >
                <Hero 
                  featuredGames={PlatformManager.initialized ? PlatformManager.getFeaturedGames(5) : []}
                  onGameLaunch={handleGameLaunch}
                />
                <GameGrid
                  games={getFilteredGames()}
                  onGameLaunch={handleGameLaunch}
                  viewMode="grid"
                  title="Recently Played"
                  showRecent={true}
                />
              </motion.div>
            )}
            
            {currentView === 'library' && (
              <motion.div
                key="library"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="library-view"
              >
                <GameGrid
                  games={getFilteredGames()}
                  onGameLaunch={handleGameLaunch}
                  viewMode="grid"
                  title="Game Library"
                  showFilters={true}
                  showSearch={true}
                />
              </motion.div>
            )}
            
            {currentView === 'store' && (
              <motion.div
                key="store"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="store-view"
              >
                <div className="store-content">
                  <h1>Store Coming Soon</h1>
                  <p>Game store integration will be available in a future update.</p>
                </div>
              </motion.div>
            )}
            
            {currentView === 'downloads' && (
              <motion.div
                key="downloads"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="downloads-view"
              >
                <div className="downloads-content">
                  <h1>Downloads</h1>
                  <p>Download manager will be available in a future update.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />
      
      <About
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </div>
  );
};

export default App;