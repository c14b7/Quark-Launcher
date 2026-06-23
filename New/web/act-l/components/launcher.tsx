'use client';

import { useState, useEffect } from 'react';
import { TitleBar } from '@/components/title-bar';
import { Sidebar } from '@/components/sidebar';
import { HomeView } from '@/components/home-view';
import { LibraryView } from '@/components/library-view';
import { GameDetails } from '@/components/game-details';
import { SettingsModal } from '@/components/settings-modal';
import { AIChatPanel } from '@/components/ai-chat';
import { DownloadsView } from '@/components/downloads-view';
import { NewsView } from '@/components/news-view';
import { AccountsView } from '@/components/accounts-view';
import { FriendsSidebar } from '@/components/friends-sidebar';
import { SteamIntegrationPanel } from '@/components/steam-integration-panel';
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

// Key for remembering if user has dismissed Steam prompt
const STEAM_PROMPT_DISMISSED_KEY = 'quark_steam_prompt_dismissed';

function LauncherContent() {
  const [currentView, setCurrentView] = useState('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSteamIntegrationOpen, setIsSteamIntegrationOpen] = useState(false);
  
  // Stan widoczności prawego sidebaru (znajomych) z pamięcią podręczną
  const [isFriendsOpen, setIsFriendsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quark_friends_sidebar_open');
      return saved !== null ? saved === 'true' : true; // Domyślnie otwarty
    }
    return true;
  });

  const { selectedGame, setSelectedGame } = useGames();
  const { settings } = useSettings();
  const { isAuthenticated, steamIntegration, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const hasSteam = !!steamIntegration?.steamId;
      const wasDismissed = localStorage.getItem(STEAM_PROMPT_DISMISSED_KEY) === 'true';

      if (!hasSteam && !wasDismissed) {
        const timer = setTimeout(() => setIsSteamIntegrationOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, isAuthenticated, steamIntegration]);

  if (isLoading) {
    return <LoadingScreen minDuration={0} />;
  }

  if (!isAuthenticated) {
    return <OnboardingScreen />;
  }

  // Funkcja do zamykania/otwierania sidebaru
  const toggleFriendsSidebar = () => {
    setIsFriendsOpen((prev) => {
      localStorage.setItem('quark_friends_sidebar_open', (!prev).toString());
      return !prev;
    });
  };

  const handleSteamDialogClose = (open: boolean) => {
    if (!open) {
      localStorage.setItem(STEAM_PROMPT_DISMISSED_KEY, 'true');
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
        "h-screen flex flex-col bg-zinc-950 text-white overflow-hidden",
        settings.theme === 'oled' && 'oled'
      )}
      style={scaleStyle}
    >
      {/* Title Bar */}
      <TitleBar />

      {/* Main Content Container */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Sidebar (Lewy) */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          onGameSelect={handleGameSelect}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenChat={toggleFriendsSidebar} // <--- PRZYPISUJEMY PRZYCISK CZATU DO OTWIERANIA/ZAMYKANIA ZNAJOMYCH!
          onOpenSteamIntegration={() => setIsSteamIntegrationOpen(true)}
        />

        {/* Główny widok (Środek) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-launcher-main">
          {currentView === 'home' && <HomeView onGameSelect={handleGameSelect} />}
          {currentView === 'library' && <LibraryView onGameSelect={handleGameSelect} />}
          {currentView === 'downloads' && <DownloadsView />}
          {currentView === 'news' && <NewsView />}
          {currentView === 'accounts' && <AccountsView />}
          {currentView === 'store' && (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Sklep</p>
                <p className="text-sm">Wkrótce dostępny</p>
              </div>
            </div>
          )}
        </main>

        {/* PRAWY SIDEBAR — Znajomi Quark */}
        <aside
          className={cn(
            'h-full border-l border-zinc-800 bg-zinc-900/30 flex flex-col shrink-0 transition-all duration-300 ease-in-out w-72',
            isFriendsOpen ? 'mr-0 opacity-100' : '-mr-72 opacity-0 pointer-events-none'
          )}
        >
          <FriendsSidebar onClose={toggleFriendsSidebar} />
        </aside>
      </div>

      {/* Modale globalne */}
      {selectedGame && <GameDetails game={selectedGame} onClose={handleCloseDetails} />}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <Dialog open={isSteamIntegrationOpen} onOpenChange={handleSteamDialogClose}>
        <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Połącz konto Steam</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Połącz swoje konto Steam, aby synchronizować znajomych, osiągnięcia i statystyki.
            </DialogDescription>
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
            <GamesProvider>
              <LauncherContent />
            </GamesProvider>
          </SettingsProvider>
        </FriendsProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}
