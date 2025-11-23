
import React from 'react';
import { Asset } from '../types';

interface Props {
  asset: Asset;
  totalPortfolioValue: number;
}

export const AssetCard: React.FC<Props> = ({ asset, totalPortfolioValue }) => {
  const value = asset.price * asset.balance;
  const percent = totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0;
  const deviation = percent - asset.targetAllocation;
  
  const isHigh = deviation > 0;

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors flex flex-col justify-between group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
            {/* Coin Icon Placeholder */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${asset.symbol === 'BTC' ? 'bg-orange-500/20 text-orange-500' : asset.symbol === 'USDC' ? 'bg-blue-500/20 text-blue-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                {asset.symbol.substring(0,1)}
            </div>
            <div>
                <h3 className="font-bold text-lg text-white leading-none">{asset.symbol}</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-0.5">{asset.name}</p>
            </div>
        </div>
        <div className="text-right">
          <p className="text-white font-mono font-medium">${asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="space-y-1 mb-4 bg-gray-950/50 p-2 rounded-lg">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Balance</span>
          <span className="text-gray-300 font-mono">{asset.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total Value</span>
          <span className="text-gray-100 font-mono font-bold">${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-800">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] text-gray-500 font-bold uppercase">Allocation</span>
          <span className={`text-xs font-bold font-mono ${Math.abs(deviation) > 1 ? (isHigh ? 'text-neon-red' : 'text-neon-green') : 'text-gray-400'}`}>
            {percent.toFixed(2)}% <span className="text-gray-600">/ {asset.targetAllocation}%</span>
          </span>
        </div>
        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${Math.abs(deviation) > 1 ? (isHigh ? 'bg-neon-red' : 'bg-neon-green') : 'bg-gray-500'}`} 
            style={{ width: `${Math.min(percent, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
