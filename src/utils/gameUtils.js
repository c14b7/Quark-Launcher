/**
 * Utility functions for game-related operations
 */

/**
 * Determines the badge type for a game based on playtime
 * @param {Object} game - The game object
 * @returns {string|null} - 'blue' for never played, 'yellow' for <3h, null otherwise
 */
export const getNewBadgeType = (game) => {
  if (!game) return null;
  
  // Blue badge if never played (no playtime and no lastPlayed)
  if ((!game.playtime || game.playtime === 0) && !game.lastPlayed) {
    return 'blue';
  }
  
  // Yellow badge if played less than 3 hours (180 minutes)
  if (game.playtime && game.playtime < 180) {
    return 'yellow';
  }
  
  return null;
};

/**
 * Formats playtime in minutes to human-readable format
 * @param {number} minutes - Playtime in minutes
 * @returns {string} - Formatted playtime string
 */
export const formatPlaytime = (minutes) => {
  if (!minutes || minutes === 0) return '0h';
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  
  return `${hours}h`;
};

/**
 * Formats last played date to human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string in Polish
 */
export const formatLastPlayed = (dateString) => {
  if (!dateString) return 'Nigdy';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  
  const weeks = Math.ceil(diffDays / 7);
  if (diffDays < 30) {
    if (weeks === 1) return '1 tydzień temu';
    if (weeks < 5) return `${weeks} tygodnie temu`;
    return `${weeks} tygodni temu`;
  }
  
  const months = Math.ceil(diffDays / 30);
  if (months === 1) return '1 miesiąc temu';
  if (months < 5) return `${months} miesiące temu`;
  return `${months} miesięcy temu`;
};

/**
 * Checks if achievements object is valid and has required properties
 * @param {Object} achievements - Achievements object
 * @returns {boolean} - True if valid
 */
export const hasValidAchievements = (achievements) => {
  return achievements && 
         typeof achievements.unlocked === 'number' && 
         typeof achievements.total === 'number' && 
         achievements.total > 0;
};
