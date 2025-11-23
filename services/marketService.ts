
import { Asset, Exchange } from '../types';
import { HL_MAINNET_API_URL } from '../constants';

// Cache structure to prevent rate limiting
let priceCache: Record<string, number> = {};
let lastFetchTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

export const fetchRealPrices = async (currentAssets: Asset[], exchange: Exchange): Promise<Asset[]> => {
  const now = Date.now();
  
  // If cache is valid, return cached assets (optimization)
  if (now - lastFetchTime < CACHE_DURATION && Object.keys(priceCache).length > 0) {
    return currentAssets.map(asset => ({
      ...asset,
      price: priceCache[asset.symbol] || asset.price
    }));
  }

  const newPrices: Record<string, number> = {};

  // 1. Try Fetching from Hyperliquid MAINNET API 
  // We utilize Mainnet for pricing even if trading on Testnet to ensure accurate valuation.
  try {
    const hlResponse = await fetch(`${HL_MAINNET_API_URL}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'allMids' })
    });

    if (hlResponse.ok) {
      const hlData = await hlResponse.json();
      // hlData is object like { "BTC": "64000.5", "ETH": "3000.1" }
      
      for (const [symbol, priceStr] of Object.entries(hlData)) {
        newPrices[symbol] = parseFloat(priceStr as string);
      }
    }
  } catch (e) {
    console.error("Failed to fetch from Hyperliquid API", e);
  }

  // 2. Specific Fallback for XAUT (Gold)
  // Binance API often blocks CORS requests from browsers. 
  // We use CryptoCompare or CoinCap as they are more frontend-friendly for public data.
  if (!newPrices['XAUT']) {
    try {
      // Primary Source: CryptoCompare (XAUT -> USD)
      const ccResponse = await fetch('https://min-api.cryptocompare.com/data/price?fsym=XAUT&tsyms=USD,USDT');
      if (ccResponse.ok) {
        const data = await ccResponse.json();
        // Prefer USD, fallback to USDT
        const price = data.USD || data.USDT;
        if (price) {
          newPrices['XAUT'] = price;
        }
      }
    } catch (e) {
      console.warn("CryptoCompare XAUT fetch failed", e);
    }

    // Secondary Source: CoinCap (if primary fails)
    if (!newPrices['XAUT']) {
        try {
          const capResponse = await fetch('https://api.coincap.io/v2/assets/tether-gold');
          if (capResponse.ok) {
            const data = await capResponse.json();
            // CoinCap returns { data: { priceUsd: "..." } }
            if (data.data && data.data.priceUsd) {
                newPrices['XAUT'] = parseFloat(data.data.priceUsd);
            }
          }
        } catch (e) {
          console.warn("CoinCap XAUT fetch failed", e);
        }
    }
  }

  // 3. Fallback for other missing assets (CoinGecko)
  // Only run if we are still missing prices for non-stable assets
  const missingAssets = currentAssets.filter(a => !newPrices[a.symbol] && !a.isStable && a.symbol !== 'XAUT');
  
  if (missingAssets.length > 0) {
    try {
      const idMap: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'USDC': 'usd-coin',
        'USDT': 'tether'
      };
      
      const ids = missingAssets.map(a => idMap[a.symbol]).filter(Boolean).join(',');
      if (ids) {
        const cgResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        if (cgResponse.ok) {
             const cgData = await cgResponse.json();
             // Map back IDs to symbols if necessary, or just iterate assets
             missingAssets.forEach(asset => {
                 const id = idMap[asset.symbol];
                 if (id && cgData[id] && cgData[id].usd) {
                     newPrices[asset.symbol] = cgData[id].usd;
                 }
             });
        }
      }
    } catch (e) {
      console.warn("CoinGecko fallback failed", e);
    }
  }

  // 4. Update Assets
  const updatedAssets = currentAssets.map(asset => {
    // If stable, we can default to 1.00 or use fetched price if available/depegged
    // We assume 1.00 for simplicity unless we want to trade PEG deviations
    if (asset.isStable) return { ...asset, price: 1.00 };

    const marketPrice = newPrices[asset.symbol];
    
    if (marketPrice) {
      priceCache[asset.symbol] = marketPrice;
      return { ...asset, price: marketPrice };
    }

    // If we still don't have a price, return the asset as is (prevents UI flicker)
    // But if price is 0, we might want to try to keep old price
    return asset;
  });

  lastFetchTime = now;
  return updatedAssets;
};
