'use client';

import { useState, useEffect } from 'react';
import { TitleBar } from '@/components/title-bar';
import { Sidebar } from '@/components/sidebar';
import { HomeView } from '@/components/home-view';
import { LibraryView } from '@/components/library-view';
import { GameDetails } from '@/components/game-details';
import { SettingsModal } from '@/components/settings-modal';
import { DownloadsView } from '@/components/downloads-view';
import { NewsView } from '@/components/news-view';
import { AccountsView } from '@/components/accounts-view';
import { FriendsSidebar } from '@/components/friends-sidebar';
import { SteamIntegrationPanel } from '@/components/steam-integration-panel';
import { SteamSync } from '@/components/steam-sync';
import { IntlProvider } from '@/components/intl-provider';
import { GamesProvider, useGames } from '@/lib/games-context';
import { SettingsProvider, useSettings } from '@/lib/settings-context';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { FriendsProvider } from '@/lib/friends-context';
import { Game } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { LoadingScreen } from '@/components/loading-screen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ProfileQuickSheet } from '@/components/user/profile-quick-sheet';
import { isSteamPromptSkipped, mergeProfilePreferences } from '@/lib/profile-preferences';

const STEAM_PROMPT_DISMISSED_KEY = 'quark_steam_prompt_dismissed';

function LauncherContent() {
  const t = useTranslations('launcher');
  const tc = useTranslations('common');
  const [currentView, setCurrentView] = useState('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSteamIntegrationOpen, setIsSteamIntegrationOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  const [isFriendsOpen, setIsFriendsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quark_friends_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const { selectedGame, setSelectedGame } = useGames();
  const { settings } = useSettings();
  const { isAuthenticated, profile, steamIntegration, isLoading, meLoaded, apiUnavailable, updateProfile } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && meLoaded && !apiUnavailable) {
      const hasSteam = profile?.steamLinked || !!steamIntegration?.steamId;
      const wasDismissed =
        isSteamPromptSkipped(profile?.preferences) ||
        localStorage.getItem(STEAM_PROMPT_DISMISSED_KEY) === 'true';

      if (!hasSteam && !wasDismissed) {
        const timer = setTimeout(() => setIsSteamIntegrationOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, isAuthenticated, steamIntegration, profile, meLoaded, apiUnavailable]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <OnboardingScreen />;
  }

  const toggleFriendsSidebar = () => {
    setIsFriendsOpen((prev) => {
      localStorage.setItem('quark_friends_sidebar_open', (!prev).toString());
      return !prev;
    });
  };

  const handleSteamDialogClose = (open: boolean) => {
    if (!open) {
      localStorage.setItem(STEAM_PROMPT_DISMISSED_KEY, 'true');
      if (profile) {
        updateProfile({
          preferences: mergeProfilePreferences(profile.preferences, { steamPromptSkipped: true }),
        });
      }
    }
    setIsSteamIntegrationOpen(open);
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
  };

  const handleCloseDetails = () => {
    setSelectedGame(null);
  };

  const scaleStyle = {
    fontSize: `${settings.uiScale * 100}%`,
  };

  return (
    <div
      className={cn(
        'h-screen flex flex-col bg-zinc-950 text-white overflow-hidden',
        settings.theme === 'oled' && 'oled'
      )}
      style={scaleStyle}
    >
      <TitleBar
        onNavigate={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSteamIntegration={() => setIsSteamIntegrationOpen(true)}
        onOpenProfileEdit={() => setIsProfileEditOpen(true)}
      />

      {apiUnavailable && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{t('apiUnavailable')}</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden w-full relative">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          onGameSelect={handleGameSelect}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleFriends={toggleFriendsSidebar}
          isFriendsOpen={isFriendsOpen}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-launcher-main">
          {currentView === 'home' && <HomeView onGameSelect={handleGameSelect} />}
          {currentView === 'library' && <LibraryView onGameSelect={handleGameSelect} />}
          {currentView === 'downloads' && <DownloadsView />}
          {currentView === 'news' && <NewsView />}
          {currentView === 'accounts' && (
            <AccountsView onOpenProfileEdit={() => setIsProfileEditOpen(true)} />
          )}
          {currentView === 'store' && (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">{t('storeTitle')}</p>
                <p className="text-sm text-zinc-600">{tc('soon')}</p>
              </div>
            </div>
          )}
        </main>

        <aside
          className={cn(
            'h-full border-l border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0 transition-all duration-300 ease-in-out w-72',
            isFriendsOpen ? 'mr-0 opacity-100' : '-mr-72 opacity-0 pointer-events-none'
          )}
        >
          <FriendsSidebar onClose={toggleFriendsSidebar} />
        </aside>
      </div>

      {selectedGame && <GameDetails game={selectedGame} onClose={handleCloseDetails} />}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ProfileQuickSheet open={isProfileEditOpen} onOpenChange={setIsProfileEditOpen} />

      <Dialog open={isSteamIntegrationOpen} onOpenChange={handleSteamDialogClose}>
        <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">{t('steamDialogTitle')}</DialogTitle>
            <DialogDescription className="text-zinc-400">{t('steamDialogDesc')}</DialogDescription>
          </DialogHeader>
          <SteamIntegrationPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Launcher() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <FriendsProvider>
          <SettingsProvider>
            <IntlProvider>
              <GamesProvider>
                <SteamSync />
                <LauncherContent />
              </GamesProvider>
            </IntlProvider>
          </SettingsProvider>
        </FriendsProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}
