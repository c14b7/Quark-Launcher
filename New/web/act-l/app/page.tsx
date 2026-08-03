'use client';

import { useEffect, useState } from 'react';
import { Launcher } from '@/components/launcher';
import { DevInspector } from '@/components/dev-inspector';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/lib/auth-context';
import { SettingsProvider } from '@/lib/settings-context';
import { GamesProvider } from '@/lib/games-context';
import { FriendsProvider } from '@/lib/friends-context';
import { ChatProvider } from '@/lib/chat-context';
import { StoreProvider } from '@/lib/store-context';
import { IntlProvider } from '@/components/intl-provider';
import { TelemetryProvider } from '@/lib/telemetry';
import { useAuth } from '@/lib/auth-context';
import { startDevEventCapture } from '@/lib/dev-debug-bus';

function InspectorShell() {
  const { user, isAuthenticated } = useAuth();
  useEffect(() => {
    startDevEventCapture();
  }, []);

  return (
    <TelemetryProvider userId={user?.$id} isAuthenticated={isAuthenticated}>
      <SettingsProvider>
        <FriendsProvider>
          <ChatProvider>
            <StoreProvider>
              <IntlProvider>
                <GamesProvider>
                  <DevInspector mode="window" />
                </GamesProvider>
              </IntlProvider>
            </StoreProvider>
          </ChatProvider>
        </FriendsProvider>
      </SettingsProvider>
    </TelemetryProvider>
  );
}

export default function Home() {
  const [mode, setMode] = useState<'loading' | 'app' | 'inspector'>('loading');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isInspector = params.has('devInspector');
    setMode(isInspector ? 'inspector' : 'app');
    if (isInspector) {
      document.getElementById('quark-splash')?.remove();
    }
  }, []);

  if (mode === 'loading') {
    return <div className="fixed inset-0 bg-[#030306]" />;
  }

  if (mode === 'inspector') {
    return (
      <TooltipProvider>
        <AuthProvider>
          <InspectorShell />
        </AuthProvider>
      </TooltipProvider>
    );
  }

  return <Launcher />;
}
