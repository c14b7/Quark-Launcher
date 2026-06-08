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
import { SteamIntegrationPanel } from '@/components/steam-integration-panel';
import { GamesProvider, useGames } from '@/lib/games-context';
import { SettingsProvider, useSettings } from '@/lib/settings-context';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Game } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSteamIntegrationOpen, setIsSteamIntegrationOpen] = useState(false);
  const { selectedGame, setSelectedGame } = useGames();
  const { settings } = useSettings();
  const { isAuthenticated, profile, isLoading } = useAuth();

  // Show Steam integration modal only if:
  // 1. User is authenticated
  // 2. Steam is NOT already connected (no API key or user ID)
  // 3. User hasn't dismissed the prompt before
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const hasApiKey = settings.steamApiKey && settings.steamApiKey.length > 0;
      const hasUserId = settings.steamUserId && settings.steamUserId.length > 0;
      const wasDismissed = localStorage.getItem(STEAM_PROMPT_DISMISSED_KEY) === 'true';
      
      // Only show if Steam is NOT connected AND user hasn't dismissed it
      if (!hasApiKey || !hasUserId) {
        if (!wasDismissed) {
          const timer = setTimeout(() => {
            setIsSteamIntegrationOpen(true);
          }, 1000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isLoading, isAuthenticated, settings.steamApiKey, settings.steamUserId]);

  // Handle Steam dialog close - remember dismissal
  const handleSteamDialogClose = (open: boolean) => {
    if (!open) {
      // User closed the dialog, remember this choice
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

  // Dynamiczny styl dla skalowania UI
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          onGameSelect={handleGameSelect}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenChat={() => setIsChatOpen(true)}
          onOpenSteamIntegration={() => setIsSteamIntegrationOpen(true)}
        />

        {/* Main View */}
          <main className={cn(
            "flex-1 flex flex-col overflow-hidden transition-all duration-300",
            "bg-launcher-main", // <-- Nasza nowa, stała klasa oparta na zmiennych CSS
            isChatOpen && 'mr-[400px]'
         )}>
          {currentView === 'home' && (
            <HomeView onGameSelect={handleGameSelect} />
          )}
          {currentView === 'library' && (
            <LibraryView onGameSelect={handleGameSelect} />
          )}
          {currentView === 'downloads' && (
            <DownloadsView />
          )}
          {currentView === 'news' && (
            <NewsView />
          )}
          {currentView === 'accounts' && (
            <AccountsView />
          )}
          {currentView === 'store' && (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Sklep</p>
                <p className="text-sm">Wkrótce dostępny</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Game Details Modal */}
      {selectedGame && (
        <GameDetails game={selectedGame} onClose={handleCloseDetails} />
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* Steam Integration Modal */}
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
        <SettingsProvider>
          <GamesProvider>
            <LauncherContent />
          </GamesProvider>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}
