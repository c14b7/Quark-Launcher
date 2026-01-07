import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Library, 
  Store, 
  User, 
  Settings, 
  Search,
  Monitor,
  Gamepad2,
  Plus,
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  Download
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ currentView, onNavigation, games = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  const [recentGames, setRecentGames] = useState([]);
  const [favoriteGames, setFavoriteGames] = useState([]);
  
  useEffect(() => {
    // Sortuj gry według ostatnio granych
    const sortedByRecent = games
      .filter(game => game.lastPlayed)
      .sort((a, b) => new Date(b.lastPlayed) - new Date(a.lastPlayed))
      .slice(0, 5);
    
    setRecentGames(sortedByRecent);
    
    // Mock ulubione gry
    setFavoriteGames(games.slice(0, 3));
  }, [games]);

  const navItems = [
    { id: 'home', label: 'Strona główna', icon: Home, active: currentView === 'home' },
    { id: 'library', label: 'Biblioteka', icon: Library, active: currentView === 'library' },
    { id: 'store', label: 'Sklep', icon: Store, active: currentView === 'store' },
    { id: 'profile', label: 'Profil', icon: User, active: currentView === 'profile' },
  ];

  const platforms = [
    { name: 'Steam', icon: Monitor, color: '#1b2838', count: games.filter(g => g.platform === 'steam').length },
    { name: 'Xbox', icon: Gamepad2, color: '#107c10', count: games.filter(g => g.platform === 'xbox').length },
    { name: 'Epic Games', icon: Store, color: '#313131', count: games.filter(g => g.platform === 'epic').length },
  ];

  const handleNavClick = (viewId) => {
    onNavigation(viewId);
  };

  const toggleLibraryExpanded = () => {
    setIsLibraryExpanded(!isLibraryExpanded);
  };

  const formatPlaytime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  const getGameStatusIcon = (game) => {
    if (!game.installed) return <Download size={12} className="status-icon download" />;
    if (game.lastPlayed) return <Clock size={12} className="status-icon recent" />;
    return null;
  };

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header with logo */}
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-icon">Q</div>
          <div className="logo-text">
            <span className="logo-name">QUARK</span>
            <span className="logo-subtitle">LAUNCHER</span>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="search-section">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Szukaj gier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Main navigation */}
      <nav className="main-navigation">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            className={`nav-item ${item.active ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <item.icon size={18} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </motion.button>
        ))}
      </nav>

      {/* Platforms section */}
      <div className="platforms-section">
        <h3 className="section-title">Platformy</h3>
        <div className="platforms-list">
          {platforms.map((platform) => (
            <div key={platform.name} className="platform-item">
              <div className="platform-info">
                <platform.icon size={16} className="platform-icon" />
                <span className="platform-name">{platform.name}</span>
              </div>
              <span className="platform-count">{platform.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick access games */}
      <div className="quick-access-section">
        <div 
          className="section-header" 
          onClick={toggleLibraryExpanded}
        >
          <h3 className="section-title">Twoje gry</h3>
          <motion.div
            animate={{ rotate: isLibraryExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={16} className="expand-icon" />
          </motion.div>
        </div>

        <AnimatePresence>
          {isLibraryExpanded && (
            <motion.div
              className="quick-access-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Recent games */}
              {recentGames.length > 0 && (
                <div className="game-group">
                  <div className="group-header">
                    <Clock size={14} />
                    <span>Ostatnio grane</span>
                  </div>
                  {recentGames.map((game) => (
                    <motion.div
                      key={game.id}
                      className="quick-game-item"
                      whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <img 
                        src={game.image} 
                        alt={game.name}
                        className="game-thumb"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="game-info">
                        <span className="game-name">{game.name}</span>
                        <span className="game-playtime">{formatPlaytime(game.playtime)}</span>
                      </div>
                      {getGameStatusIcon(game)}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Favorite games */}
              {favoriteGames.length > 0 && (
                <div className="game-group">
                  <div className="group-header">
                    <Star size={14} />
                    <span>Ulubione</span>
                  </div>
                  {favoriteGames.map((game) => (
                    <motion.div
                      key={`fav-${game.id}`}
                      className="quick-game-item"
                      whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <img 
                        src={game.image} 
                        alt={game.name}
                        className="game-thumb"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="game-info">
                        <span className="game-name">{game.name}</span>
                        <span className="game-playtime">{formatPlaytime(game.playtime)}</span>
                      </div>
                      {getGameStatusIcon(game)}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom section with user and settings */}
      <div className="sidebar-footer">
        <motion.button
          className="add-game-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={16} />
          <span>Dodaj grę</span>
        </motion.button>

        <div className="footer-actions">
          <motion.button
            className="footer-btn"
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            onClick={() => onNavigate('about')}
          >
            <User size={18} />
          </motion.button>
          <motion.button
            className="footer-btn"
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            onClick={() => onNavigate('settings')}
          >
            <Settings size={18} />
          </motion.button>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;