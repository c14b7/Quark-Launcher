'use client';

import { Minus, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { QuarkProfileMenu } from '@/components/user/quark-profile-menu';
import { GlobalSearch } from '@/components/global-search';
import { NotificationsMenu } from '@/components/notifications-menu';

interface TitleBarProps {
  onNavigate?: (view: string) => void;
  onOpenSettings?: () => void;
  onOpenSteamIntegration?: () => void;
  onOpenProfileEdit?: () => void;
}

export function TitleBar({
  onNavigate,
  onOpenSettings,
  onOpenSteamIntegration,
  onOpenProfileEdit,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const maximized = await window.electronAPI.windowIsMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.windowMinimize();
    }
  };

  const handleMaximize = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.windowMaximize();
      const isNowMaximized = await window.electronAPI.windowIsMaximized();
      setIsMaximized(isNowMaximized);
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.windowClose();
    }
  };

  return (
    <div
      className="h-10 bg-zinc-950/90 backdrop-blur-xl flex items-center gap-2 px-3 border-b border-white/5 select-none"
      data-tour="titlebar"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">Q</span>
        </div>
        <span className="text-sm font-logo text-zinc-300 tracking-wide hidden md:inline">Quark</span>
      </div>

      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex-1 flex justify-center min-w-0">
        <GlobalSearch />
      </div>

      <div
        className="flex items-center gap-0.5 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <NotificationsMenu />
        <QuarkProfileMenu
          onNavigate={onNavigate}
          onOpenSettings={onOpenSettings}
          onOpenSteamIntegration={onOpenSteamIntegration}
          onOpenProfileEdit={onOpenProfileEdit}
        />

        <div className="w-px h-4 bg-white/10 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-8 rounded-none hover:bg-zinc-800"
          onClick={handleMinimize}
        >
          <Minus className="h-3 w-3 text-zinc-400" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-8 rounded-none hover:bg-zinc-800"
          onClick={handleMaximize}
        >
          {isMaximized ? (
            <Minimize2 className="h-3 w-3 text-zinc-400" />
          ) : (
            <Maximize2 className="h-3 w-3 text-zinc-400" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-8 rounded-none hover:bg-red-500/80"
          onClick={handleClose}
        >
          <X className="h-3 w-3 text-zinc-400" />
        </Button>
      </div>
    </div>
  );
}
