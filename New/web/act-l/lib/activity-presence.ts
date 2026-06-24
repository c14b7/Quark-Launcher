export type ActivityType = 'playing' | 'menu' | 'idle' | 'none';

export interface ActivityState {
  currentGameId?: string;
  currentGameName?: string;
  currentActivity: ActivityType;
}

let activity: ActivityState = { currentActivity: 'none' };

export function setPlayingGame(gameId: string, gameName: string): void {
  activity = {
    currentGameId: gameId,
    currentGameName: gameName,
    currentActivity: 'playing',
  };
}

export function clearPlayingGame(): void {
  activity = { currentActivity: 'none' };
}

export function getActivityState(): ActivityState {
  return { ...activity };
}

export function activityPayloadForPresence(): Record<string, string> {
  if (activity.currentActivity === 'playing' && activity.currentGameId) {
    return {
      currentActivity: 'playing',
      currentGameId: activity.currentGameId,
      currentGameName: activity.currentGameName || '',
    };
  }
  if (activity.currentActivity === 'none') {
    return { currentActivity: 'none', currentGameId: '', currentGameName: '' };
  }
  return { currentActivity: activity.currentActivity };
}
