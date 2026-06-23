'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  /** Auto-dismiss after ms; omit or 0 to stay until unmounted by parent */
  onComplete?: () => void;
  minDuration?: number;
}

export function QuarkSplashBackground() {
  return (
    <div className="quark-aurora" aria-hidden>
      <div className="quark-aurora-layer quark-aurora-layer-1" />
      <div className="quark-aurora-layer quark-aurora-layer-2" />
      <div className="quark-aurora-layer quark-aurora-layer-3" />
      <div className="quark-aurora-layer quark-aurora-layer-4" />
      <div className="quark-aurora-layer quark-aurora-layer-5" />
      <div className="quark-aurora-vignette" />
    </div>
  );
}

export function QuarkSplashContent({ className }: { className?: string }) {
  return (
    <div className={cn('quark-splash-brand', className)}>
      <h1 className="font-logo quark-splash-title">Quark</h1>
      <div className="quark-splash-spinner" role="status" aria-label="Loading" />
    </div>
  );
}

export function LoadingScreen({ onComplete, minDuration }: LoadingScreenProps) {
  const [isExiting, setIsExiting] = useState(false);
  const canAutoDismiss = minDuration != null && minDuration > 0;

  useEffect(() => {
    document.getElementById('quark-splash')?.remove();
  }, []);

  useEffect(() => {
    if (!canAutoDismiss) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [canAutoDismiss, minDuration, onComplete]);

  return (
    <div
      className={cn(
        'quark-splash-screen fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-500',
        isExiting && 'opacity-0 pointer-events-none'
      )}
    >
      <QuarkSplashBackground />
      <QuarkSplashContent />
    </div>
  );
}
