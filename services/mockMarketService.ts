import { Asset } from '../types';

// Simulate price movement
export const updatePrices = (currentAssets: Asset[]): Asset[] => {
  return currentAssets.map(asset => {
    // Random volatility between -2% and +2%
    const volatility = (Math.random() * 0.04) - 0.02; 
    // Apply specific trends to trigger rebalance for demo purposes
    // e.g. Make BTC pump and USDC stay flat
    let trend = 0;
    if (asset.symbol === 'BTC') trend = 0.01; // Slight upward pressure
    if (asset.symbol === 'XAUT') trend = -0.005; // Slight downward
    
    const newPrice = asset.price * (1 + volatility + trend);
    
    return {
      ...asset,
      price: newPrice > 0 ? newPrice : 0.01
    };
  });
};