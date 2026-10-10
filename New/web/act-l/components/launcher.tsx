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
import { TelemetryProvider, useTrackView } from '@/lib/telemetry';
import { Game } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { LoadingScreen } from '@/components/loading-screen';
import { AppTour, shouldShowAppTour } from '@/components/onboarding/app-tour';
import { ChatView } from '@/components/chat/chat-view';
import { StoreView } from '@/components/store-view';
import { ChatProvider } from '@/lib/chat-context';
import { StoreProvider } from '@/lib/store-context';
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
import { StatsView } from '@/components/stats/main';
import { DevTestBannerHost } from '@/components/dev-test-banner-host';
import { DevInspector } from '@/components/dev-inspector';
import { startDevEventCapture } from '@/lib/dev-debug-bus';
import { SystemMessagesProvider } from '@/lib/system-messages-context';
import { SystemMessageModal } from '@/components/system-message-modal';
import { RecapView } from '@/components/recap/recap-view';
import { WhatsNewModal } from '@/components/whats-new-modal';
import { syncListeningPresence } from '@/lib/spotify-service';
import { mountQuarkConsole, runSeedSessions } from '@/lib/quark-console';
import { setStatsSyncContext, scheduleStatsSync } from '@/lib/stats-sync-service';
import { useSystemMessages } from '@/lib/system-messages-context';
import { DEFAULT_OVERLAY_SETTINGS } from '@/lib/overlay-settings';

const STEAM_PROMPT_DISMISSED_KEY = 'quark_steam_prompt_dismissed';

function LauncherContent() {
  const t = useTranslations('launcher');
  const tc = useTranslations('common');
  const [currentView, setCurrentView] = useState('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'general' | 'hidden' | 'categories' | 'overlay' | 'ai' | 'privacy' | 'admin'
  >('general');
  const [isSteamIntegrationOpen, setIsSteamIntegrationOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [devInspectorOpen, setDevInspectorOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);

  const [isFriendsOpen, setIsFriendsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quark_friends_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const { selectedGame, setSelectedGame, games } = useGames();
  const { settings, updateSettings, updateOverlaySettings, rebuildAutoCategoriesFromGames } =
    useSettings();
  const { isAuthenticated, profile, steamIntegration, isLoading, meLoaded, apiUnavailable, updateProfile, user } = useAuth();
  const { refresh: refreshSysMsg, openMessage } = useSystemMessages();

  useTrackView(isAuthenticated ? currentView : 'onboarding');

  useEffect(() => {
    if (isAuthenticated && shouldShowAppTour()) {
      const timer = setTimeout(() => setTourActive(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    startDevEventCapture();
    mountQuarkConsole();
  }, []);

  useEffect(() => {
    setStatsSyncContext({
      games,
      settings,
      preferences: profile?.preferences,
    });
    if (isAuthenticated) scheduleStatsSync(8000);
  }, [games, settings, profile?.preferences, isAuthenticated]);

  useEffect(() => {
    const onResync = () => {
      if (isAuthenticated) scheduleStatsSync(500);
    };
    window.addEventListener('quark-stats-resync', onResync);
    return () => window.removeEventListener('quark-stats-resync', onResync);
  }, [isAuthenticated]);

  useEffect(() => {
    const onOverlayReset = () => {
      updateOverlaySettings({ ...DEFAULT_OVERLAY_SETTINGS });
    };
    window.addEventListener('quark-overlay-reset', onOverlayReset);
    return () => window.removeEventListener('quark-overlay-reset', onOverlayReset);
  }, [updateOverlaySettings]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void syncListeningPresence(profile?.preferences);
    const id = setInterval(() => {
      void syncListeningPresence(profile?.preferences);
    }, 25000);
    return () => clearInterval(id);
  }, [isAuthenticated, profile?.preferences]);

  useEffect(() => {
    const onSeed = (e: Event) => {
      const n = Number((e as CustomEvent).detail) || 20;
      void runSeedSessions(
        games.map((g) => ({ id: g.id, name: g.name })),
        n
      ).then(() => scheduleStatsSync(500));
    };
    const onRebuild = () => rebuildAutoCategoriesFromGames(games);
    const onI18n = (e: Event) => {
      updateSettings({ showI18nKeys: Boolean((e as CustomEvent).detail) });
    };
    const onSysRefresh = () => void refreshSysMsg();
    const onSysOpen = (e: Event) => {
      const id = String((e as CustomEvent).detail || '');
      if (id) openMessage(id);
    };
    window.addEventListener('quark-dev-seed-sessions', onSeed);
    window.addEventListener('quark-dev-rebuild-auto-categories', onRebuild);
    window.addEventListener('quark-dev-i18n-keys', onI18n);
    window.addEventListener('quark-dev-sysmsg-refresh', onSysRefresh);
    window.addEventListener('quark-dev-sysmsg-open', onSysOpen);
    return () => {
      window.removeEventListener('quark-dev-seed-sessions', onSeed);
      window.removeEventListener('quark-dev-rebuild-auto-categories', onRebuild);
      window.removeEventListener('quark-dev-i18n-keys', onI18n);
      window.removeEventListener('quark-dev-sysmsg-refresh', onSysRefresh);
      window.removeEventListener('quark-dev-sysmsg-open', onSysOpen);
    };
  }, [games, rebuildAutoCategoriesFromGames, updateSettings, refreshSysMsg, openMessage]);

  useEffect(() => {
    const onDevUnlocked = () => {
      setSettingsInitialTab('admin');
      setIsSettingsOpen(true);
    };
    window.addEventListener('quark-dev-unlocked', onDevUnlocked);
    return () => window.removeEventListener('quark-dev-unlocked', onDevUnlocked);
  }, []);

  useEffect(() => {
    const onOpenInspector = () => setDevInspectorOpen(true);
    window.addEventListener('quark-open-dev-inspector', onOpenInspector);
    return () => window.removeEventListener('quark-open-dev-inspector', onOpenInspector);
  }, []);

  useEffect(() => {
    const onOpenRecap = () => setRecapOpen(true);
    window.addEventListener('quark-open-recap', onOpenRecap);
    return () => window.removeEventListener('quark-open-recap', onOpenRecap);
  }, []);

  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setCurrentView(detail);
    };
    window.addEventListener('quark-navigate', onNav);
    return () => window.removeEventListener('quark-navigate', onNav);
  }, []);

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

  const openSettings = (
    tab: 'general' | 'hidden' | 'categories' | 'overlay' | 'ai' | 'privacy' | 'admin' = 'general'
  ) => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  };

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
        onOpenSettings={() => openSettings()}
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
          onOpenSettings={() => openSettings()}
          onToggleFriends={toggleFriendsSidebar}
          isFriendsOpen={isFriendsOpen}
        />

        <main className="flex-1 flex flex-col overflow-hidden min-h-0 h-full bg-launcher-main">
          {currentView === 'home' && (
            <HomeView onGameSelect={handleGameSelect} onOpenSettings={(tab) => openSettings(tab || 'categories')} />
          )}
          {currentView === 'library' && <LibraryView onGameSelect={handleGameSelect} />}
          {currentView === 'downloads' && <DownloadsView />}
          {currentView === 'news' && <NewsView />}
          {currentView === 'accounts' && (
            <AccountsView
              onOpenProfileEdit={() => setIsProfileEditOpen(true)}
              onOpenRecap={() => setRecapOpen(true)}
            />
          )}
          {currentView === 'store' && <StoreView onGameSelect={handleGameSelect} />}
          {currentView === 'chat' && <ChatView />}
          {currentView === 'stats' && <StatsView />}
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
      <AppTour active={tourActive} onComplete={() => setTourActive(false)} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsInitialTab}
      />
      <ProfileQuickSheet open={isProfileEditOpen} onOpenChange={setIsProfileEditOpen} />
      <DevTestBannerHost />
      <SystemMessageModal />
      <RecapView open={recapOpen} onClose={() => setRecapOpen(false)} />
      <WhatsNewModal />
      {devInspectorOpen && (
        <DevInspector mode="panel" onClose={() => setDevInspectorOpen(false)} />
      )}

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
        <TelemetryWrapper>
          <SettingsProvider>
            <SystemMessagesProvider>
              <FriendsProvider>
                <ChatProvider>
                  <StoreProvider>
                    <IntlProvider>
                      <GamesProvider>
                        <SteamSync />
                        <LauncherContent />
                      </GamesProvider>
                    </IntlProvider>
                  </StoreProvider>
                </ChatProvider>
              </FriendsProvider>
            </SystemMessagesProvider>
          </SettingsProvider>
        </TelemetryWrapper>
      </AuthProvider>
    </TooltipProvider>
  );
}

function TelemetryWrapper({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  return (
    <TelemetryProvider userId={user?.$id} isAuthenticated={isAuthenticated}>
      {children}
    </TelemetryProvider>
  );
}
