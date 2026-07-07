export interface StoreListing {
  id: string;
  name: string;
  platform: 'steam' | 'epic' | 'keys';
  price?: string;
  discountPercent?: number;
  image?: string;
  storeUrl?: string;
  storeName?: string;
}

export const storeService = {
  async searchSteam(term: string, cc = 'pl') {
    if (!window.electronAPI?.steamStoreSearch) {
      return { success: false, data: [] as StoreListing[] };
    }
    return window.electronAPI.steamStoreSearch(term, cc);
  },

  async getSteamFeatured(cc = 'pl') {
    if (!window.electronAPI?.steamStoreFeatured) {
      return { success: false, data: [] as StoreListing[] };
    }
    return window.electronAPI.steamStoreFeatured(cc);
  },

  async getCheapSharkDeals(storeID = 1, pageSize = 24) {
    if (!window.electronAPI?.cheapSharkDeals) {
      return { success: false, data: [] as StoreListing[] };
    }
    return window.electronAPI.cheapSharkDeals(storeID, pageSize);
  },

  async getEpicFreeGames() {
    if (!window.electronAPI?.epicFreeGames) {
      return { success: false, data: [] as StoreListing[] };
    }
    return window.electronAPI.epicFreeGames();
  },
};
