const https = require('https');
const http = require('http');

function fetchJson(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout, headers: { 'User-Agent': 'Quark-Launcher/1.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function steamStoreSearch(term, cc = 'pl') {
  const q = encodeURIComponent(term);
  const url = `https://store.steampowered.com/api/storesearch/?term=${q}&l=${cc}&cc=${cc}`;
  const data = await fetchJson(url);
  return (data.items || []).map((item) => ({
    id: String(item.id),
    name: item.name,
    platform: 'steam',
    price: item.price?.final ? (item.price.final / 100).toFixed(2) : undefined,
    discountPercent: item.price?.discount_percent || 0,
    image: item.tiny_image || item.header_image,
    storeUrl: `https://store.steampowered.com/app/${item.id}`,
  }));
}

async function steamStoreFeatured(cc = 'pl') {
  const url = `https://store.steampowered.com/api/featuredcategories?l=${cc}&cc=${cc}`;
  const data = await fetchJson(url);
  const items = [];
  const seen = new Set();
  const sections = ['specials', 'coming_soon', 'top_sellers', 'new_releases'];
  for (const key of sections) {
    const section = data[key];
    if (!section?.items) continue;
    for (const item of section.items.slice(0, 12)) {
      const id = String(item.id);
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        id,
        name: item.name,
        platform: 'steam',
        discountPercent: item.discount_percent || 0,
        image: item.header_image,
        storeUrl: `https://store.steampowered.com/app/${item.id}`,
      });
    }
  }
  return items;
}

async function cheapSharkDeals(storeID = 1, pageSize = 24) {
  const url = `https://www.cheapshark.com/api/1.0/deals?storeID=${storeID}&pageSize=${pageSize}&sortBy=Deal Rating`;
  const data = await fetchJson(url);
  return (data || []).map((d) => ({
    id: d.dealID,
    name: d.title,
    platform: 'keys',
    price: `$${d.salePrice}`,
    discountPercent: Math.round(parseFloat(d.savings) || 0),
    image: d.thumb,
    storeUrl: `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
    storeName: d.storeID,
  }));
}

async function epicFreeGames() {
  const url = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=pl&country=PL';
  const data = await fetchJson(url);
  const items = [];
  const elements = data?.data?.Catalog?.searchStore?.elements || [];
  for (const el of elements) {
    const promo = el.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0];
    if (!promo) continue;
    items.push({
      id: el.id,
      name: el.title,
      platform: 'epic',
      price: 'Darmowe',
      discountPercent: 100,
      image: el.keyImages?.find((k) => k.type === 'OfferImageWide')?.url || el.keyImages?.[0]?.url,
      storeUrl: `https://store.epicgames.com/p/${el.productSlug || el.urlSlug}`,
    });
  }
  return items;
}

module.exports = {
  fetchJson,
  steamStoreSearch,
  steamStoreFeatured,
  cheapSharkDeals,
  epicFreeGames,
};
