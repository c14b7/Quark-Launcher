import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, 
  List, 
  Filter, 
  Search, 
  SortAsc, 
  SortDesc,
  Play,
  Download,
  Star,
  Clock,
  Trophy,
  MoreVertical,
  Heart,
  Trash2,
  Settings,
  Info
} from 'lucide-react';
import './GameGrid.css';

const GameGrid = ({ games = [], onGameClick, title = "Gry", showFilters = false, filter }) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'lastPlayed' | 'playtime' | 'rating'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'installed' | 'not-installed'
  const [showContextMenu, setShowContextMenu] = useState(null);

  // Apply filters and search
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Apply custom filter function if provided
    if (filter) {
      filtered = filtered.filter(filter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(game =>
        game.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Platform filter
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(game => game.platform === selectedPlatform);
    }

    // Status filter
    if (selectedStatus === 'installed') {
      filtered = filtered.filter(game => game.installed);
    } else if (selectedStatus === 'not-installed') {
      filtered = filtered.filter(game => !game.installed);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'lastPlayed') {
        aVal = a.lastPlayed ? new Date(a.lastPlayed) : new Date(0);
        bVal = b.lastPlayed ? new Date(b.lastPlayed) : new Date(0);
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [games, searchQuery, selectedPlatform, selectedStatus, sortBy, sortOrder, filter]);

  const platforms = useMemo(() => {
    const platformSet = new Set(games.map(game => game.platform));
    return Array.from(platformSet);
  }, [games]);

  const formatPlaytime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  const formatLastPlayed = (dateString) => {
    if (!dateString) return 'Nigdy';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} tygodnie temu`;
    return `${Math.ceil(diffDays / 30)} miesiące temu`;
  };

  const handleGameAction = (game, action) => {
    setShowContextMenu(null);
    
    switch (action) {
      case 'play':
        if (onGameClick) onGameClick(game);
        break;
      case 'favorite':
        // Implement favorite logic
        console.log('Toggle favorite:', game.name);
        break;
      case 'remove':
        // Implement remove logic
        console.log('Remove game:', game.name);
        break;
      case 'properties':
        // Implement properties dialog
        console.log('Show properties:', game.name);
        break;
    }
  };

  const toggleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  return (
    <div className="game-grid-container">
      {/* Header */}
      <div className="grid-header">
        <div className="grid-title-section">
          <h2 className="grid-title">{title}</h2>
          <span className="grid-count">{filteredGames.length} gier</span>
        </div>

        <div className="grid-controls">
          {showFilters && (
            <>
              {/* Search */}
              <div className="search-container">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Szukaj..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Filters */}
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="filter-select"
              >
                <option value="all">Wszystkie platformy</option>
                {platforms.map(platform => (
                  <option key={platform} value={platform}>
                    {platform.toUpperCase()}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">Wszystkie</option>
                <option value="installed">Zainstalowane</option>
                <option value="not-installed">Niezainstalowane</option>
              </select>
            </>
          )}

          {/* Sort */}
          <div className="sort-controls">
            <button
              className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => toggleSort('name')}
            >
              Nazwa
              {sortBy === 'name' && (
                sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
              )}
            </button>
            <button
              className={`sort-btn ${sortBy === 'lastPlayed' ? 'active' : ''}`}
              onClick={() => toggleSort('lastPlayed')}
            >
              Ostatnio grane
              {sortBy === 'lastPlayed' && (
                sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
              )}
            </button>
            <button
              className={`sort-btn ${sortBy === 'playtime' ? 'active' : ''}`}
              onClick={() => toggleSort('playtime')}
            >
              Czas gry
              {sortBy === 'playtime' && (
                sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
              )}
            </button>
          </div>

          {/* View Mode */}
          <div className="view-mode-controls">
            <motion.button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Grid size={16} />
            </motion.button>
            <motion.button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <List size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Games Grid/List */}
      <motion.div
        className={`games-container ${viewMode}`}
        layout
      >
        <AnimatePresence mode="popLayout">
          {filteredGames.map((game) => (
            <motion.div
              key={game.id}
              className={`game-item ${viewMode}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {viewMode === 'grid' ? (
                <GameCard 
                  game={game}
                  onPlay={onGameClick}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowContextMenu(game.id);
                  }}
                  formatPlaytime={formatPlaytime}
                  formatLastPlayed={formatLastPlayed}
                />
              ) : (
                <GameListItem
                  game={game}
                  onPlay={onGameClick}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowContextMenu(game.id);
                  }}
                  formatPlaytime={formatPlaytime}
                  formatLastPlayed={formatLastPlayed}
                />
              )}

              {/* Context Menu */}
              <AnimatePresence>
                {showContextMenu === game.id && (
                  <motion.div
                    className="context-menu glass"
                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    onMouseLeave={() => setShowContextMenu(null)}
                  >
                    <button 
                      className="context-item"
                      onClick={() => handleGameAction(game, 'play')}
                    >
                      {game.installed ? <Play size={16} /> : <Download size={16} />}
                      <span>{game.installed ? 'Graj' : 'Pobierz'}</span>
                    </button>
                    <button 
                      className="context-item"
                      onClick={() => handleGameAction(game, 'favorite')}
                    >
                      <Heart size={16} />
                      <span>Dodaj do ulubionych</span>
                    </button>
                    <button 
                      className="context-item"
                      onClick={() => handleGameAction(game, 'properties')}
                    >
                      <Info size={16} />
                      <span>Właściwości</span>
                    </button>
                    <hr className="context-divider" />
                    <button 
                      className="context-item danger"
                      onClick={() => handleGameAction(game, 'remove')}
                    >
                      <Trash2 size={16} />
                      <span>Usuń z biblioteki</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredGames.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <Search size={48} />
          </div>
          <h3>Nie znaleziono gier</h3>
          <p>Spróbuj zmienić filtry wyszukiwania</p>
        </div>
      )}
    </div>
  );
};

// Game Card Component
const GameCard = ({ game, onPlay, onContextMenu, formatPlaytime, formatLastPlayed }) => (
  <div className="game-card glass" onContextMenu={onContextMenu}>
    <div className="game-image-container">
      <img 
        src={game.image} 
        alt={game.name}
        className="game-image"
        loading="lazy"
      />
      <div className="game-overlay">
        <motion.button
          className="play-button"
          onClick={() => onPlay && onPlay(game)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {game.installed ? <Play size={20} fill="currentColor" /> : <Download size={20} />}
        </motion.button>
      </div>
      
      {!game.installed && (
        <div className="install-badge">
          <Download size={12} />
          Pobierz
        </div>
      )}
    </div>

    <div className="game-info">
      <h3 className="game-title">{game.name}</h3>
      
      <div className="game-meta">
        <span className="platform-badge">{game.platform}</span>
        {game.rating && (
          <div className="rating">
            <Star size={12} fill="currentColor" />
            <span>{game.rating}</span>
          </div>
        )}
      </div>

      <div className="game-stats">
        <div className="stat">
          <Clock size={12} />
          <span>{formatPlaytime(game.playtime || 0)}</span>
        </div>
        {game.achievements && (
          <div className="stat">
            <Trophy size={12} />
            <span>{game.achievements}</span>
          </div>
        )}
      </div>

      {game.lastPlayed && (
        <div className="last-played">
          Ostatnio: {formatLastPlayed(game.lastPlayed)}
        </div>
      )}
    </div>
  </div>
);

// Game List Item Component
const GameListItem = ({ game, onPlay, onContextMenu, formatPlaytime, formatLastPlayed }) => (
  <div className="game-list-item" onContextMenu={onContextMenu}>
    <div className="game-thumbnail">
      <img src={game.image} alt={game.name} />
    </div>

    <div className="game-details">
      <div className="game-main-info">
        <h3 className="game-title">{game.name}</h3>
        <div className="game-meta">
          <span className="platform">{game.platform.toUpperCase()}</span>
          {game.rating && (
            <div className="rating">
              <Star size={14} fill="currentColor" />
              <span>{game.rating}</span>
            </div>
          )}
        </div>
      </div>

      <div className="game-stats">
        <div className="stat-group">
          <div className="stat">
            <Clock size={14} />
            <span>{formatPlaytime(game.playtime || 0)}</span>
          </div>
          {game.achievements && (
            <div className="stat">
              <Trophy size={14} />
              <span>{game.achievements}</span>
            </div>
          )}
        </div>
        
        {game.lastPlayed && (
          <div className="last-played">
            Ostatnio: {formatLastPlayed(game.lastPlayed)}
          </div>
        )}
      </div>
    </div>

    <div className="game-actions">
      <motion.button
        className={`action-btn ${game.installed ? 'play' : 'download'}`}
        onClick={() => onPlay && onPlay(game)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {game.installed ? <Play size={16} /> : <Download size={16} />}
        <span>{game.installed ? 'Graj' : 'Pobierz'}</span>
      </motion.button>

      <motion.button
        className="more-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MoreVertical size={16} />
      </motion.button>
    </div>
  </div>
);

export default GameGrid;