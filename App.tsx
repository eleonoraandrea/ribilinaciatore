
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Activity, Database, Play, Wifi, WifiOff, Send } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

const COLORS = ['#F7931A', '#FFD700', '#2775CA', '#10B981', '#8B5CF6', '#EF4444']; 

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
  }, [settings.deltaThreshold, settings.autoExecute, isExecuting, settings.selectedExchange, settings.telegramBotToken, settings.telegramChatId, assets.length]); // Added assets.length to dep array to refresh if assets change

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

  // Chart Data
  const chartData = assets.map(a => ({
    name: a.symbol,
    value: a.price * a.balance
  }));

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
                    <span className="flex items-center gap-1 text-neon-green"><Wifi size={10} /> LIVE</span>
                ) : (
                    <span className="flex items-center gap-1 text-neon-red"><WifiOff size={10} /> ERROR</span>
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
            {/* Top Status Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-neon-blue/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Total Equity</p>
                <p className="text-3xl font-bold text-white font-mono">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>

              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 relative overflow-hidden">
                 <div className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${rebalanceResult.needsRebalance ? 'bg-neon-red w-full' : 'bg-neon-green w-1/3'}`}></div>
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Max Drift</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold font-mono ${rebalanceResult.needsRebalance ? 'text-neon-red' : 'text-neon-green'}`}>
                    {rebalanceResult.deviation.toFixed(2)}%
                  </p>
                  <span className="text-xs text-gray-500">/ {settings.deltaThreshold}%</span>
                </div>
              </div>

              <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Active Exchange</p>
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

              {/* Action Button Area */}
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Assets Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {assets.map(asset => (
                    <AssetCard key={asset.id} asset={asset} totalPortfolioValue={totalValue} />
                  ))}
                </div>

                {/* Pending Actions List (if any) */}
                {rebalanceResult.needsRebalance && (
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-fade-in">
                    <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                      <Play size={14} /> Proposed Rebalance Actions
                    </h3>
                    <div className="space-y-3">
                      {rebalanceResult.actions.map((action, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-gray-950 rounded-lg border border-gray-800 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${action.side === 'BUY' ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-red/10 text-neon-red'}`}>
                              {action.side}
                            </span>
                            <span className="font-bold text-lg text-white">{action.symbol}</span>
                          </div>
                          
                          <div className="flex items-center gap-6 ml-auto">
                            <div className="text-right">
                              <p className="text-gray-500 text-xs">Amount</p>
                              <p className="text-white font-mono">{action.amount.toFixed(4)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-500 text-xs">USD Value</p>
                              <p className="text-white font-mono font-bold">${action.usdValue.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chart Column */}
              <div className="space-y-6">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 min-h-[300px] flex flex-col">
                  <h3 className="text-sm font-bold text-gray-400 mb-4 text-center">Target vs Actual</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* LOGS VIEW */
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Database size={20} className="text-neon-blue" /> Execution Log (DB)
                </h2>
                <button onClick={refreshLogs} className="text-xs text-neon-blue hover:underline">Aggiorna</button>
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
