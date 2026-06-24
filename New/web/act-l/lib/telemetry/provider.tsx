'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import {
  initTelemetry,
  setTelemetryUser,
  installGlobalErrorHandlers,
  track,
  getTelemetryConsent,
  updateTelemetryConsent,
  flushTelemetry,
  endSession,
} from './client';
import type { TelemetryConsent } from './types';

interface TelemetryContextValue {
  track: typeof track;
  consent: TelemetryConsent;
  updateConsent: (next: Partial<TelemetryConsent>) => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

interface TelemetryProviderProps {
  children: ReactNode;
  userId?: string | null;
  isAuthenticated?: boolean;
}

export function TelemetryProvider({ children, userId, isAuthenticated }: TelemetryProviderProps) {
  useEffect(() => {
    installGlobalErrorHandlers();
    void initTelemetry(isAuthenticated ? 'login' : 'cold_start');
  }, [isAuthenticated]);

  useEffect(() => {
    setTelemetryUser(userId ?? null);
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.onTelemetryMainEvent) return;

    return window.electronAPI.onTelemetryMainEvent((data) => {
      if (!data?.name) return;
      track(data.name, data.properties || {}, (data.category as Parameters<typeof track>[2]) || 'update');
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.onOverlayToggled) return;

    return window.electronAPI.onOverlayToggled((data) => {
      track('overlay.toggled', { visible: !!data?.visible }, 'feature');
    });
  }, []);

  const value: TelemetryContextValue = {
    track,
    consent: getTelemetryConsent(),
    updateConsent: updateTelemetryConsent,
  };

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    return {
      track,
      consent: getTelemetryConsent(),
      updateConsent: updateTelemetryConsent,
    };
  }
  return ctx;
}

export function useTrackView(view: string) {
  useEffect(() => {
    if (!view) return;
    track('navigation.view', { view }, 'navigation');
  }, [view]);
}

export { flushTelemetry, endSession, track };
