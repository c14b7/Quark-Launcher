import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Heart, Share, Star, Clock, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import './Hero.css';

const Hero = ({ game, onPlay }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  // Mock data for carousel
  const featuredGames = [
    {
      id: '730',
      name: 'Counter-Strike 2',
      description: 'Dla dziesięcioleci Counter-Strike oferuje konkurencyjne doświadczenie na najwyższym poziomie, kształtowane latami doskonalenia na poziomie zawodowym oraz społeczności.',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/730/library_hero.jpg',
      video: 'https://cdn.akamai.steamstatic.com/steam/apps/730/movie_max.mp4',
      platform: 'steam',
      rating: 4.2,
      tags: ['FPS', 'Multiplayer', 'Competitive', 'Action'],
      price: 'Free to Play',
      installed: true,
      achievements: 167,
      playtime: 1247
    },
    {
      id: '1091500',
      name: 'Cyberpunk 2077',
      description: 'Cyberpunk 2077 to RPG akcji osadzone w mrocznym świecie przyszłości. Wciel się w V, najemnika cybernetycznego poszukującego unikalnego implantu będącego kluczem do nieśmiertelności.',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/library_hero.jpg',
      platform: 'steam',
      rating: 4.1,
      tags: ['RPG', 'Open World', 'Futuristic', 'Action'],
      price: '$59.99',
      installed: true,
      achievements: 44,
      playtime: 156
    },
    {
      id: '271590',
      name: 'Grand Theft Auto V',
      description: 'Kiedy młody uliczny szuler, emerytowany złodziej banków oraz przerażający psychopata wpadają w problemy, muszą przeprowadzić szereg niebezpiecznych napadów.',
      image: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg',
      hero: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/library_hero.jpg',
      platform: 'steam',
      rating: 4.5,
      tags: ['Action', 'Open World', 'Crime', 'Multiplayer'],
      price: '$29.99',
      installed: true,
      achievements: 78,
      playtime: 342
    }
  ];

  const currentGame = featuredGames[currentSlide] || game;

  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredGames.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isAutoPlay, featuredGames.length]);

  const handlePrevSlide = () => {
    setIsAutoPlay(false);
    setCurrentSlide((prev) => (prev - 1 + featuredGames.length) % featuredGames.length);
  };

  const handleNextSlide = () => {
    setIsAutoPlay(false);
    setCurrentSlide((prev) => (prev + 1) % featuredGames.length);
  };

  const handlePlay = () => {
    if (onPlay && currentGame) {
      onPlay(currentGame);
    }
  };

  const formatPlaytime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  if (!currentGame) {
    return (
      <div className="hero-placeholder">
        <div className="hero-loading">
          <h3>Ładowanie gier...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-section">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          className="hero-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Background Image */}
          <div className="hero-background">
            <img 
              src={currentGame.hero || currentGame.image} 
              alt={currentGame.name}
              className="hero-bg-image"
            />
            <div className="hero-overlay" />
            <div className="hero-gradient" />
          </div>

          {/* Content */}
          <div className="hero-content">
            <div className="hero-main">
              {/* Game Info */}
              <motion.div
                className="hero-info"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="hero-meta">
                  <span className="hero-platform">{currentGame.platform.toUpperCase()}</span>
                  <div className="hero-rating">
                    <Star size={16} fill="currentColor" />
                    <span>{currentGame.rating}</span>
                  </div>
                </div>

                <h1 className="hero-title">{currentGame.name}</h1>
                
                <p className="hero-description">
                  {currentGame.description}
                </p>

                <div className="hero-tags">
                  {currentGame.tags?.map((tag) => (
                    <span key={tag} className="hero-tag">{tag}</span>
                  ))}
                </div>

                <div className="hero-stats">
                  <div className="stat-item">
                    <Trophy size={16} />
                    <span>{currentGame.achievements} osiągnięć</span>
                  </div>
                  <div className="stat-item">
                    <Clock size={16} />
                    <span>{formatPlaytime(currentGame.playtime)} grane</span>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                className="hero-actions"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <motion.button
                  className={`hero-play-btn ${currentGame.installed ? 'installed' : 'download'}`}
                  onClick={handlePlay}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play size={20} fill="currentColor" />
                  <span>{currentGame.installed ? 'GRAJ TERAZ' : 'POBIERZ'}</span>
                  {!currentGame.installed && <span className="price">{currentGame.price}</span>}
                </motion.button>

                <div className="hero-secondary-actions">
                  <motion.button
                    className="hero-action-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowInfo(!showInfo)}
                  >
                    <Info size={18} />
                  </motion.button>
                  
                  <motion.button
                    className="hero-action-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Heart size={18} />
                  </motion.button>
                  
                  <motion.button
                    className="hero-action-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Share size={18} />
                  </motion.button>
                </div>
              </motion.div>
            </div>

            {/* Game Preview */}
            <motion.div
              className="hero-preview"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="preview-card glass">
                <img 
                  src={currentGame.image} 
                  alt={currentGame.name}
                  className="preview-image"
                />
                <div className="preview-overlay">
                  <Play size={48} fill="rgba(255, 255, 255, 0.9)" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Navigation Controls */}
          <div className="hero-navigation">
            <motion.button
              className="nav-btn prev"
              onClick={handlePrevSlide}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft size={24} />
            </motion.button>

            <motion.button
              className="nav-btn next"
              onClick={handleNextSlide}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight size={24} />
            </motion.button>
          </div>

          {/* Slide Indicators */}
          <div className="hero-indicators">
            {featuredGames.map((_, index) => (
              <motion.button
                key={index}
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSlide(index);
                  setIsAutoPlay(false);
                }}
                whileHover={{ scale: 1.2 }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Additional Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="hero-info-panel glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="info-panel-content">
              <h3>Szczegóły gry</h3>
              <div className="info-details">
                <div className="info-row">
                  <span>Platforma:</span>
                  <span>{currentGame.platform.toUpperCase()}</span>
                </div>
                <div className="info-row">
                  <span>Ocena:</span>
                  <span>{currentGame.rating}/5.0</span>
                </div>
                <div className="info-row">
                  <span>Czas gry:</span>
                  <span>{formatPlaytime(currentGame.playtime)}</span>
                </div>
                <div className="info-row">
                  <span>Osiągnięcia:</span>
                  <span>{currentGame.achievements}</span>
                </div>
              </div>
            </div>
            <button 
              className="close-info"
              onClick={() => setShowInfo(false)}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Hero;