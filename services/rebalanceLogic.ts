import { Asset, RebalanceResult, RebalanceAction } from '../types';

export const calculateRebalance = (assets: Asset[], thresholdPercent: number): RebalanceResult => {
  const totalValue = assets.reduce((sum, asset) => sum + (asset.price * asset.balance), 0);
  
  let maxDeviation = 0;
  const actions: RebalanceAction[] = [];

  assets.forEach(asset => {
    const currentUsdValue = asset.price * asset.balance;
    const currentAllocation = (currentUsdValue / totalValue) * 100;
    const targetAllocation = asset.targetAllocation;
    
    const deviation = Math.abs(currentAllocation - targetAllocation);
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
    }

    // Calculate what the USD value SHOULD be
    const targetUsdValue = totalValue * (targetAllocation / 100);
    const diffUsd = targetUsdValue - currentUsdValue;

    // If diff is significant (e.g., > $10 to avoid dust), propose action
    // Note: In a real app, we check deviation against threshold at a portfolio level or per asset level.
    // Here we generate actions regardless, but the 'needsRebalance' flag gates execution.
    if (Math.abs(diffUsd) > 10) {
      const amountTokens = Math.abs(diffUsd / asset.price);
      actions.push({
        assetId: asset.id,
        symbol: asset.symbol,
        side: diffUsd > 0 ? 'BUY' : 'SELL',
        amount: amountTokens,
        usdValue: Math.abs(diffUsd),
        reason: `Alloc: ${currentAllocation.toFixed(1)}% -> Target: ${targetAllocation}%`,
        timestamp: Date.now()
      });
    }
  });

  return {
    needsRebalance: maxDeviation >= thresholdPercent,
    deviation: maxDeviation,
    actions
  };
};