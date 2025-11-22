import React from 'react';
import { Asset } from '../types';

interface Props {
  asset: Asset;
  totalPortfolioValue: number;
}

export const AssetCard: React.FC<Props> = ({ asset, totalPortfolioValue }) => {
  const value = asset.price * asset.balance;
  const percent = (value / totalPortfolioValue) * 100;
  const deviation = percent - asset.targetAllocation;
  
  const isHigh = deviation > 0;

  return (
    <div className="bg-gray-850 rounded-xl p-4 border border-gray-700 shadow-lg flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg text-white">{asset.symbol}</h3>
          <p className="text-xs text-gray-400">{asset.name}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-mono">${asset.price.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Holding:</span>
          <span className="text-white font-mono">{asset.balance.toFixed(4)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Value:</span>
          <span className="text-white font-mono">${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Allocation</span>
          <span className={`text-xs font-bold px-2 py-1 rounded ${isHigh ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-red/20 text-neon-red'}`}>
            {percent.toFixed(2)}% <span className="text-gray-500 text-[10px]">/ {asset.targetAllocation}%</span>
          </span>
        </div>
        <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className={`h-full rounded-full ${isHigh ? 'bg-neon-green' : 'bg-neon-red'}`} 
            style={{ width: `${Math.min(percent, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};