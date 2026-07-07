'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { storeService, type StoreListing } from './store-service';
import { track } from './telemetry/client';

type StoreTab = 'steam' | 'deals' | 'epic';

interface StoreContextType {
  tab: StoreTab;
  setTab: (tab: StoreTab) => void;
  listings: StoreListing[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<StoreTab>('steam');
  const [listings, setListings] = useState<StoreListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (tab === 'steam') {
        const res = searchQuery.trim()
          ? await storeService.searchSteam(searchQuery.trim())
          : await storeService.getSteamFeatured();
        if (res.success && res.data) setListings(res.data);
        if (searchQuery.trim()) track('store.search', { platform: 'steam' }, 'feature');
      } else if (tab === 'deals') {
        const res = await storeService.getCheapSharkDeals();
        if (res.success && res.data) setListings(res.data);
      } else if (tab === 'epic') {
        const res = await storeService.getEpicFreeGames();
        if (res.success && res.data) setListings(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tab, searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), searchQuery ? 400 : 0);
    return () => clearTimeout(t);
  }, [refresh, searchQuery, tab]);

  return (
    <StoreContext.Provider
      value={{ tab, setTab, listings, isLoading, searchQuery, setSearchQuery, refresh }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
