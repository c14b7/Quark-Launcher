import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Play, 
  Download, 
  Clock, 
  Trophy, 
  Star,
  Calendar,
  Tag,
  Users,
  Info
} from 'lucide-react';
import PlatformManager from '../../services/PlatformManager';
import './GameDetails.css';

const GameDetails = ({ game, isOpen, onClose, onPlay }) => {
  const [gameDetails, setGameDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && game) {
      loadGameDetails();
    }
  }, [isOpen, game]);

  const loadGameDetails = async () => {
    setLoading(true);
    try {
      const details = await PlatformManager.getGameDetails(game.id, game.platform);
      setGameDetails(details);
    } catch (error) {
      console.error('Error loading game details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPlaytime = (minutes) => {
    if (!minutes || minutes === 0) return '0 godzin';
    if (minutes < 60) return `${minutes} minut`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours} godz. ${remainingMinutes} min`;
    }
    return `${hours} godzin`;
  };

  const formatLastPlayed = (dateString) => {
    if (!dateString) return 'Nigdy';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getNewBadgeType = () => {
    if ((!game.playtime || game.playtime === 0) && !game.lastPlayed) {
      return 'blue';
    }
    if (game.playtime && game.playtime < 180) {
      return 'yellow';
    }
    return null;
  };

  const badgeType = getNewBadgeType();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="game-details-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="game-details-modal glass"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <motion.button
            className="close-button"
            onClick={onClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={24} />
          </motion.button>

          {/* Hero Section */}
          <div className="details-hero">
            <img 
              src={game.hero || game.image} 
              alt={game.name}
              className="hero-image"
            />
            <div className="hero-overlay">
              <div className="hero-content">
                <div className="hero-title-section">
                  <h1 className="hero-title">{game.name}</h1>
                  {badgeType && (
                    <div className={`new-badge new-badge-${badgeType}`}>
                      Nowy
                    </div>
                  )}
                </div>
                <div className="hero-meta">
                  <span className="platform-badge">{game.platform.toUpperCase()}</span>
                  {game.rating && (
                    <div className="rating">
                      <Star size={16} fill="currentColor" />
                      <span>{game.rating}/5</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="details-content">
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Ładowanie szczegółów gry...</p>
              </div>
            ) : (
              <>
                {/* Stats Section */}
                <div className="stats-section">
                  <div className="stat-card">
                    <div className="stat-icon">
                      <Clock size={24} />
                    </div>
                    <div className="stat-info">
                      <div className="stat-label">Czas gry</div>
                      <div className="stat-value">{formatPlaytime(game.playtime || 0)}</div>
                    </div>
                  </div>

                  {game.achievements && (
                    <div className="stat-card">
                      <div className="stat-icon">
                        <Trophy size={24} />
                      </div>
                      <div className="stat-info">
                        <div className="stat-label">Osiągnięcia</div>
                        <div className="stat-value">
                          {game.achievements.unlocked} / {game.achievements.total}
                        </div>
                        <div className="achievement-progress">
                          <div 
                            className="achievement-progress-bar"
                            style={{ 
                              width: `${(game.achievements.unlocked / game.achievements.total) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {game.lastPlayed && (
                    <div className="stat-card">
                      <div className="stat-icon">
                        <Calendar size={24} />
                      </div>
                      <div className="stat-info">
                        <div className="stat-label">Ostatnio grane</div>
                        <div className="stat-value">{formatLastPlayed(game.lastPlayed)}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {gameDetails?.description && (
                  <div className="details-section">
                    <h2 className="section-title">
                      <Info size={20} />
                      Opis
                    </h2>
                    <p className="game-description">{gameDetails.description}</p>
                  </div>
                )}

                {/* Genres */}
                {gameDetails?.genres && gameDetails.genres.length > 0 && (
                  <div className="details-section">
                    <h2 className="section-title">
                      <Tag size={20} />
                      Gatunki
                    </h2>
                    <div className="tags-container">
                      {gameDetails.genres.map((genre, index) => (
                        <span key={index} className="tag">{genre}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Developers */}
                {gameDetails?.developers && gameDetails.developers.length > 0 && (
                  <div className="details-section">
                    <h2 className="section-title">
                      <Users size={20} />
                      Deweloper
                    </h2>
                    <p className="detail-text">{gameDetails.developers.join(', ')}</p>
                  </div>
                )}

                {/* Publishers */}
                {gameDetails?.publishers && gameDetails.publishers.length > 0 && (
                  <div className="details-section">
                    <h2 className="section-title">
                      <Users size={20} />
                      Wydawca
                    </h2>
                    <p className="detail-text">{gameDetails.publishers.join(', ')}</p>
                  </div>
                )}

                {/* Release Date */}
                {gameDetails?.releaseDate && (
                  <div className="details-section">
                    <h2 className="section-title">
                      <Calendar size={20} />
                      Data wydania
                    </h2>
                    <p className="detail-text">{gameDetails.releaseDate}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="details-actions">
            <motion.button
              className={`action-button ${game.installed ? 'play' : 'download'}`}
              onClick={() => {
                if (onPlay) onPlay(game);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {game.installed ? (
                <>
                  <Play size={20} fill="currentColor" />
                  <span>Graj teraz</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Pobierz grę</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameDetails;
