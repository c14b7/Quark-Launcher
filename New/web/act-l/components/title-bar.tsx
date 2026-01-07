'use client';

import { Minus, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function TitleBar() {
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
      const maximized = await window.electronAPI.windowMaximize();
      setIsMaximized(maximized);
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.windowClose();
    }
  };

  return (
    <div 
      className="h-8 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-3 border-b border-white/5 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">Q</span>
        </div>
        <span className="text-xs font-semibold text-zinc-400">Quark Launcher</span>
      </div>

      {/* Window Controls */}
      <div 
        className="flex items-center gap-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-8 rounded-none hover:bg-zinc-800"
          onClick={handleMinimize}
        >
          <Minus className="h-3 w-3 text-zinc-400" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-8 rounded-none hover:bg-zinc-800"
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
          className="h-6 w-8 rounded-none hover:bg-red-500/80"
          onClick={handleClose}
        >
          <X className="h-3 w-3 text-zinc-400" />
        </Button>
      </div>
    </div>
  );
}
