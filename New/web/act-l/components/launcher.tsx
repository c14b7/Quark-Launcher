'use client';

import { useState } from 'react';
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
import { GamesProvider, useGames } from '@/lib/games-context';
import { SettingsProvider, useSettings } from '@/lib/settings-context';
import { Game } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

function LauncherContent() {
  const [currentView, setCurrentView] = useState('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { selectedGame, setSelectedGame } = useGames();
  const { settings } = useSettings();

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
        />

        {/* Main View */}
        <main className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300",
          settings.theme === 'oled' 
            ? 'bg-black' 
            : 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950',
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
    </div>
  );
}

export function Launcher() {
  return (
    <TooltipProvider>
      <SettingsProvider>
        <GamesProvider>
          <LauncherContent />
        </GamesProvider>
      </SettingsProvider>
    </TooltipProvider>
  );
}
