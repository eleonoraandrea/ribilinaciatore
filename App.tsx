
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Activity, Database, Play, Wifi, WifiOff, Send, History, ArrowRight } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// Types & Logic
import { Asset, AppSettings, Exchange, RebalanceResult, TradeLog } from './types';
import { INITIAL_ASSETS, DEFAULT_SETTINGS } from './constants';
import { fetchRealPrices } from './services/marketService';
import { calculateRebalance } from './services/rebalanceLogic';
import { initDB, getTradeHistory } from './services/db';
import { executeRebalanceAction } from './services/exchangeService';
import { sendTelegramMessage, formatRebalanceMessage } from './services/telegramService';

// Components
import { AssetCard } from './components/AssetCard';
import { SettingsModal } from './components/SettingsModal';
import { TradeHistory } from './components/TradeHistory';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [rebalanceResult, setRebalanceResult] = useState<RebalanceResult>({ needsRebalance: false, deviation: 0, actions: [] });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LOGS'>('DASHBOARD');
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED'>('CONNECTED');
  
  // Ref to track last telegram alert time to avoid spamming in manual mode
  const lastAlertTime = useRef<number>(0);
  const ALERT_COOLDOWN_MS = 1000 * 60 * 15; // 15 Minutes cooldown

  const totalValue = assets.reduce((sum, a) => sum + (a.price * a.balance), 0);

  // Initialize DB on mount
  useEffect(() => {
    initDB().then(() => refreshLogs());
  }, []);

  const refreshLogs = async () => {
    const logs = await getTradeHistory();
    setTradeLogs(logs);
  };

  // Async Market Cycle Logic
  const refreshMarket = useCallback(async () => {
    try {
      // 1. Fetch REAL Prices
      const updatedAssets = await fetchRealPrices(assets, settings.selectedExchange);
      
      // Check if we actually got prices > 0 (simple validation)
      const hasData = updatedAssets.some(a => a.price > 0);
      setConnectionStatus(hasData ? 'CONNECTED' : 'DISCONNECTED');
      
      if (hasData) {
         setAssets(updatedAssets);
      }

      // 2. Calculate Logic
      const result = calculateRebalance(updatedAssets, settings.deltaThreshold);
      setRebalanceResult(result);

      // 3. Handling Execution or Notification
      if (result.needsRebalance && !isExecuting) {
        
        if (settings.autoExecute) {
          // AUTOMATIC MODE: Execute immediately
          executeBatch(result.actions, updatedAssets);
        } else {
          // MANUAL MODE: Check if we need to send Telegram Alert
          const now = Date.now();
          const canAlert = settings.telegramBotToken && settings.telegramChatId && (now - lastAlertTime.current > ALERT_COOLDOWN_MS);
          
          if (canAlert) {
             console.log("Sending Manual Rebalance Alert to Telegram...");
             const msg = formatRebalanceMessage(settings.selectedExchange, result.deviation, result.actions, false);
             await sendTelegramMessage(settings.telegramBotToken!, settings.telegramChatId!, msg);
             lastAlertTime.current = now;
          }
        }
      }
    } catch (e) {
      console.error("Market refresh failed", e);
      setConnectionStatus('DISCONNECTED');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.deltaThreshold, settings.autoExecute, isExecuting, settings.selectedExchange, settings.telegramBotToken, settings.telegramChatId, assets.length]); 

  // Auto-refresh loop
  useEffect(() => {
    refreshMarket(); // Initial call
    const interval = setInterval(refreshMarket, 5000); // 5s polling
    return () => clearInterval(interval);
  }, [refreshMarket]);

  const executeBatch = async (actions: any[], currentAssets: Asset[]) => {
    if (isExecuting) return;
    setIsExecuting(true);

    try {
      for (const action of actions) {
        await executeRebalanceAction(action, settings);
      }
      
      // Optimistic Update
      const balancedAssets = currentAssets.map(asset => {
         const targetVal = (currentAssets.reduce((s, a) => s + (a.price * a.balance), 0)) * (asset.targetAllocation / 100);
         return { ...asset, balance: targetVal / (asset.price || 1) };
      });
      
      setAssets(balancedAssets);
      setRebalanceResult({ needsRebalance: false, deviation: 0, actions: [] }); 
      await refreshLogs();

      // Notify Telegram of Success (If Configured)
      if (settings.telegramBotToken && settings.telegramChatId) {
        const msg = formatRebalanceMessage(settings.selectedExchange, 0, actions, true);
        await sendTelegramMessage(settings.telegramBotToken, settings.telegramChatId, msg);
      }

    } catch (e) {
      console.error("Batch execution error", e);
    } finally {
      setIsExecuting(false);
    }
  };

  // Manual Trigger (Button click)
  const handleManualExecute = () => {
    executeBatch(rebalanceResult.actions, assets);
  };

  // --- Chart Data Preparation ---
  // Compare Target Allocation % vs Actual Allocation %
  const comparisonData = assets.map(a => {
    const actualUsd = a.price * a.balance;
    const actualPercent = totalValue > 0 ? (actualUsd / totalValue) * 100 : 0;
    return {
      symbol: a.symbol,
      Target: a.targetAllocation,
      Actual: parseFloat(actualPercent.toFixed(2)),
      diff: actualPercent - a.targetAllocation
    };
  });

  return (
    <div className="min-h-screen bg-gray-950 font-sans pb-20 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-4 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-neon-blue to-neon-purple rounded-xl flex items-center justify-center shadow-lg shadow-neon-blue/20">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">Auto<span className="text-neon-blue">Rebalancer</span></h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span className={`w-2 h-2 rounded-full ${settings.autoExecute ? 'bg-neon-green animate-pulse' : 'bg-yellow-500'}`}></span>
                {settings.autoExecute ? 'AUTO-TRADING' : 'MANUAL SIGNAL MODE'}
                <span className="text-gray-600">|</span>
                {connectionStatus === 'CONNECTED' ? (
                    <span className="flex items-center gap-1 text-neon-green"><Wifi size={10} /> MARKET LIVE</span>
                ) : (
                    <span className="flex items-center gap-1 text-neon-red"><WifiOff size={10} /> DISCONNECTED</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
             <div className="hidden md:flex bg-gray-800 rounded-lg p-1 mr-4">
                <button 
                  onClick={() => setActiveTab('DASHBOARD')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'DASHBOARD' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setActiveTab('LOGS')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'LOGS' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                  <Database size={14} /> Logs
                </button>
             </div>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        
        {activeTab === 'DASHBOARD' ? (
          <>
            {/* 1. STATUS & EXECUTION ROW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Total Equity */}
              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-neon-blue/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Total Equity</p>
                <p className="text-3xl font-bold text-white font-mono">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>

              {/* Drift Status */}
              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 relative overflow-hidden">
                 <div className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${rebalanceResult.needsRebalance ? 'bg-neon-red w-full' : 'bg-neon-green w-1/3'}`}></div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Max Drift</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold font-mono ${rebalanceResult.needsRebalance ? 'text-neon-red' : 'text-neon-green'}`}>
                    {rebalanceResult.deviation.toFixed(2)}%
                  </p>
                  <span className="text-xs text-gray-500">/ Threshold: {settings.deltaThreshold}%</span>
                </div>
              </div>

              {/* Exchange Info */}
              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Execution Layer</p>
                <p className="text-lg font-bold text-white truncate">{settings.selectedExchange.replace('_', ' ')}</p>
                <div className="flex gap-2 mt-2">
                   <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-xs border border-gray-700">
                     {settings.selectedExchange.includes('TESTNET') ? 'TESTNET' : 'MAINNET'}
                   </span>
                   {settings.telegramBotToken && (
                      <span className="px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 text-xs border border-blue-800 flex items-center gap-1">
                        <Send size={10} /> TG ON
                      </span>
                   )}
                </div>
              </div>

              {/* Execution Button / Status */}
              <div className={`p-1 rounded-xl border flex flex-col justify-center items-center relative overflow-hidden transition-colors duration-300 ${rebalanceResult.needsRebalance ? 'bg-neon-red/10 border-neon-red/30' : 'bg-gray-900 border-gray-800'}`}>
                 {rebalanceResult.needsRebalance && !settings.autoExecute ? (
                   <button 
                    onClick={handleManualExecute}
                    disabled={isExecuting}
                    className="w-full h-full flex flex-col items-center justify-center text-neon-red hover:bg-neon-red hover:text-white transition-all rounded-lg"
                   >
                      <span className="text-lg font-bold mb-1">{isExecuting ? 'EXECUTING...' : 'EXECUTE NOW'}</span>
                      <span className="text-xs opacity-80 flex items-center gap-1">
                         {settings.telegramBotToken ? <Send size={10}/> : null} Signal Sent to Telegram
                      </span>
                   </button>
                 ) : settings.autoExecute ? (
                   <div className="flex flex-col items-center justify-center text-neon-green">
                     <Activity className="animate-pulse mb-2" />
                     <span className="text-xs font-bold tracking-widest">AUTO-PILOT ON</span>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center text-gray-600">
                     <span className="text-2xl mb-1">🛡️</span>
                     <span className="text-xs font-bold">BALANCED</span>
                   </div>
                 )}
              </div>
            </div>

            {/* 2. REBALANCE ACTIONS (If Any) - Prioritized visibility */}
            {rebalanceResult.needsRebalance && (
                <div className="bg-gradient-to-r from-gray-900 to-gray-900/50 rounded-xl border border-neon-red/30 p-6 animate-fade-in shadow-lg shadow-neon-red/5">
                <h3 className="text-sm font-bold text-neon-red mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Play size={16} /> Rebalance Required
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rebalanceResult.actions.map((action, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-gray-950 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-md ${action.side === 'BUY' ? 'bg-neon-green text-black' : 'bg-neon-red text-white'}`}>
                            {action.side}
                        </span>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg text-white leading-none">{action.symbol}</span>
                            <span className="text-[10px] text-gray-500">{action.reason}</span>
                        </div>
                        </div>
                        
                        <div className="text-right">
                            <p className="text-white font-mono font-bold text-lg">${action.usdValue.toFixed(2)}</p>
                            <p className="text-gray-500 text-xs font-mono">{action.amount.toFixed(4)} tokens</p>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            )}

            {/* 3. CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Target vs Actual Comparison (Bar Chart) */}
              <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-6 min-h-[350px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                        Target vs Actual Allocation
                    </h3>
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-600 rounded-sm"></span> Target %</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-neon-blue rounded-sm"></span> Actual %</div>
                    </div>
                </div>
                
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={comparisonData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="symbol" tick={{fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fill: '#9CA3AF'}} axisLine={false} tickLine={false} unit="%" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            />
                            <Bar dataKey="Target" fill="#4B5563" radius={[4, 4, 0, 0]} barSize={30} />
                            <Bar dataKey="Actual" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30}>
                                {comparisonData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={Math.abs(entry.diff) > settings.deltaThreshold ? (entry.diff > 0 ? '#EF4444' : '#10B981') : '#3B82F6'} />
                                ))}
                            </Bar>
                            <ReferenceLine y={0} stroke="#666" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
              </div>

              {/* Drift Overview */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col">
                <h3 className="text-sm font-bold text-gray-400 mb-6">Allocation Drift</h3>
                <div className="space-y-4 flex-1 overflow-y-auto">
                    {comparisonData.map(d => (
                        <div key={d.symbol} className="flex flex-col gap-1">
                            <div className="flex justify-between items-end">
                                <span className="font-bold text-sm text-white">{d.symbol}</span>
                                <span className={`font-mono text-sm font-bold ${Math.abs(d.diff) > settings.deltaThreshold ? 'text-neon-red' : 'text-gray-400'}`}>
                                    {d.diff > 0 ? '+' : ''}{d.diff.toFixed(2)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex relative">
                                {/* Center Marker */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white z-10 opacity-20"></div>
                                
                                {d.diff < 0 ? (
                                    // Underweight (Bar grows from right to left of center)
                                    <div className="w-1/2 flex justify-end">
                                        <div 
                                            className="h-full bg-neon-green rounded-l-full" 
                                            style={{ width: `${Math.min(Math.abs(d.diff) * 5, 100)}%` }} // scale factor for visibility
                                        ></div>
                                    </div>
                                ) : (
                                    // Overweight (Bar starts at center goes right)
                                    <>
                                        <div className="w-1/2"></div>
                                        <div 
                                            className="h-full bg-neon-red rounded-r-full" 
                                            style={{ width: `${Math.min(d.diff * 5, 100)}%` }}
                                        ></div>
                                    </>
                                )}
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                                <span>Buy</span>
                                <span>Sell</span>
                            </div>
                        </div>
                    ))}
                </div>
              </div>

            </div>

            {/* 4. ASSETS GRID */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                    Portfolio Assets
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {assets.map(asset => (
                    <AssetCard key={asset.id} asset={asset} totalPortfolioValue={totalValue} />
                  ))}
                </div>
            </div>

            {/* 5. RECENT ACTIVITY LOGS */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                        <History size={16} /> Recent Activity (Last 10)
                    </h3>
                    <button onClick={() => setActiveTab('LOGS')} className="text-xs text-neon-blue flex items-center hover:underline">
                        View All <ArrowRight size={12} className="ml-1"/>
                    </button>
                </div>
                <TradeHistory logs={tradeLogs.slice(0, 10)} />
            </div>

          </>
        ) : (
          /* FULL LOGS VIEW */
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Database size={20} className="text-neon-blue" /> Full Execution History
                </h2>
                <button onClick={refreshLogs} className="text-xs text-neon-blue hover:underline">Refresh</button>
             </div>
             <TradeHistory logs={tradeLogs} />
          </div>
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdate={setSettings}
        assets={assets}
        onUpdateAssets={setAssets}
      />
    </div>
  );
};

export default App;
