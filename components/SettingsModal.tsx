
import React, { useState } from 'react';
import { AppSettings, Exchange, Asset } from '../types';
import { X, Shield, Key, Wallet, Coins, Send, Trash2, Plus, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { sendTelegramMessage } from '../services/telegramService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  assets: Asset[];
  onUpdateAssets: (a: Asset[]) => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onUpdate, assets, onUpdateAssets }) => {
  const [testMsgStatus, setTestMsgStatus] = useState<'IDLE'|'SENDING'|'OK'|'FAIL'>('IDLE');
  const [newAsset, setNewAsset] = useState<{symbol: string, percent: string, balance: string, address: string}>({ symbol: '', percent: '', balance: '', address: '' });

  if (!isOpen) return null;

  const handleTestTelegram = async () => {
    if(!settings.telegramBotToken || !settings.telegramChatId) return;
    setTestMsgStatus('SENDING');
    const success = await sendTelegramMessage(
        settings.telegramBotToken, 
        settings.telegramChatId, 
        "✅ <b>Test Connessione AutoRebalancer</b>\nIl sistema è connesso correttamente."
    );
    setTestMsgStatus(success ? 'OK' : 'FAIL');
    setTimeout(() => setTestMsgStatus('IDLE'), 3000);
  };

  const handleAddAsset = () => {
    if (!newAsset.symbol || !newAsset.percent) return;
    const allocation = parseFloat(newAsset.percent);
    const initialBalance = parseFloat(newAsset.balance) || 0;
    
    const asset: Asset = {
        id: newAsset.symbol.toLowerCase(),
        symbol: newAsset.symbol.toUpperCase(),
        name: newAsset.symbol.toUpperCase(),
        price: 0,
        balance: initialBalance, 
        targetAllocation: allocation,
        address: newAsset.address || undefined,
        isStable: ['USDC','USDT','DAI'].includes(newAsset.symbol.toUpperCase())
    };
    
    onUpdateAssets([...assets, asset]);
    setNewAsset({ symbol: '', percent: '', balance: '', address: '' });
  };

  const handleRemoveAsset = (id: string) => {
    onUpdateAssets(assets.filter(a => a.id !== id));
  };

  const handleUpdateAssetValue = (id: string, field: 'balance' | 'targetAllocation', value: string) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue) && value !== '') return;
      
      const updatedAssets = assets.map(a => {
          if (a.id === id) {
              return { ...a, [field]: value === '' ? 0 : numValue };
          }
          return a;
      });
      onUpdateAssets(updatedAssets);
  };

  const totalAllocation = assets.reduce((sum, a) => sum + a.targetAllocation, 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-purple">
          Configurazione Bot
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
          {/* LEFT COLUMN: General & Telegram */}
          <div className="space-y-6">
            
            {/* Strategy Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2">Strategia</h3>
                
                <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exchange / Network</label>
                <select 
                    value={settings.selectedExchange}
                    onChange={(e) => onUpdate({...settings, selectedExchange: e.target.value as Exchange})}
                    className="w-full bg-gray-850 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-neon-blue outline-none text-sm"
                >
                    <option value={Exchange.HYPERLIQUID}>Hyperliquid (Arbitrum Testnet)</option>
                    <option value={Exchange.UNISWAP_TESTNET}>Uniswap V3 (Sepolia Testnet)</option>
                    <option value={Exchange.UNISWAP_MAINNET}>Uniswap V3 (Mainnet)</option>
                </select>
                </div>

                <div>
                <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">Soglia Delta Trigger</label>
                    <span className="text-neon-blue font-mono font-bold">{settings.deltaThreshold}%</span>
                </div>
                <input 
                    type="range" 
                    min="0.5" 
                    max="10" 
                    step="0.1"
                    value={settings.deltaThreshold}
                    onChange={(e) => onUpdate({...settings, deltaThreshold: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-blue"
                />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-850 rounded-lg border border-gray-700">
                <div>
                    <span className="text-sm font-medium text-white block">Modalità Automatica</span>
                    <span className="text-xs text-gray-500">
                    {settings.autoExecute ? 'Esecuzione attiva' : 'Solo notifiche (Manuale)'}
                    </span>
                </div>
                <button 
                    onClick={() => onUpdate({...settings, autoExecute: !settings.autoExecute})}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.autoExecute ? 'bg-neon-green' : 'bg-gray-600'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.autoExecute ? 'left-7' : 'left-1'}`}></div>
                </button>
                </div>
            </div>

            {/* Telegram Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2 flex items-center gap-2">
                <Send size={14} /> Telegram (Segnali)
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    <input 
                        type="text"
                        placeholder="Bot Token (12345:ABC...)"
                        value={settings.telegramBotToken || ''}
                        onChange={(e) => onUpdate({...settings, telegramBotToken: e.target.value})}
                        className="w-full bg-gray-850 border border-gray-700 rounded-lg p-2 text-white outline-none text-xs font-mono"
                    />
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            placeholder="Chat ID"
                            value={settings.telegramChatId || ''}
                            onChange={(e) => onUpdate({...settings, telegramChatId: e.target.value})}
                            className="w-full bg-gray-850 border border-gray-700 rounded-lg p-2 text-white outline-none text-xs font-mono"
                        />
                        <button 
                        onClick={handleTestTelegram}
                        disabled={!settings.telegramBotToken || !settings.telegramChatId || testMsgStatus === 'SENDING'}
                        className={`px-3 rounded-lg font-bold text-xs transition-colors ${
                            testMsgStatus === 'OK' ? 'bg-neon-green text-black' : 
                            testMsgStatus === 'FAIL' ? 'bg-neon-red text-white' :
                            'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                        >
                        {testMsgStatus === 'SENDING' ? '...' : testMsgStatus === 'OK' ? 'OK' : testMsgStatus === 'FAIL' ? 'ERR' : 'TEST'}
                        </button>
                    </div>
                </div>
            </div>

             {/* Private Key Section */}
             <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2 flex items-center gap-2">
                <Key size={14} /> Wallet (Opzionale)
                </h3>
                <input 
                    type="password"
                    placeholder="Private Key (0x...)"
                    value={settings.privateKey || ''}
                    onChange={(e) => onUpdate({...settings, privateKey: e.target.value})}
                    className="w-full bg-gray-850 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-neon-red outline-none font-mono text-xs"
                />
                <p className="text-[10px] text-gray-500">
                    Richiesta solo se usi la Modalità Automatica per firmare transazioni. In modalità manuale viene ignorata.
                </p>
            </div>

          </div>

          {/* RIGHT COLUMN: Asset Management */}
          <div className="space-y-6">
             <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Coins size={14} className="inline mr-1"/> Configurazione Portafoglio
                </h3>
                <span className={`text-xs font-bold ${Math.abs(totalAllocation - 100) < 0.1 ? 'text-neon-green' : 'text-neon-red'}`}>
                 Allocazione: {totalAllocation.toFixed(1)}% / 100%
                </span>
             </div>

             <div className="bg-blue-900/10 border border-blue-900/30 p-3 rounded-lg">
                <p className="text-xs text-blue-300">
                   💡 In modalità manuale, inserisci qui il tuo <b>Saldo Attuale</b>. Il bot userà questi valori per calcolare i ribilanciamenti senza connettersi a un wallet.
                </p>
             </div>

             {/* Asset List - Editable */}
             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
               {assets.map(asset => (
                 <div key={asset.id} className="bg-gray-850 p-4 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-lg">{asset.symbol}</span>
                            {asset.address && <span className="text-[9px] text-gray-500 font-mono bg-gray-900 px-1 rounded border border-gray-800">{asset.address.slice(0,4)}...{asset.address.slice(-4)}</span>}
                        </div>
                        <button 
                            onClick={() => handleRemoveAsset(asset.id)}
                            className="text-gray-600 hover:text-neon-red transition-colors p-1"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Saldo (Qtà)</label>
                            <input 
                                type="number"
                                value={asset.balance}
                                onChange={(e) => handleUpdateAssetValue(asset.id, 'balance', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm font-mono focus:border-neon-blue outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Target %</label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    value={asset.targetAllocation}
                                    onChange={(e) => handleUpdateAssetValue(asset.id, 'targetAllocation', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm font-mono focus:border-neon-purple outline-none"
                                />
                                <span className="absolute right-3 top-2 text-gray-500 text-xs">%</span>
                            </div>
                        </div>
                    </div>
                 </div>
               ))}
             </div>

             {/* Add New Asset Form */}
             <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 border-dashed mt-4">
                <p className="text-xs text-gray-400 mb-3 font-bold uppercase flex items-center gap-2">
                    <Plus size={12} /> Aggiungi Nuovo Asset
                </p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                    <input 
                        type="text" 
                        placeholder="SIMBOLO (es. ETH)"
                        value={newAsset.symbol}
                        onChange={e => setNewAsset({...newAsset, symbol: e.target.value})}
                        className="bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs outline-none uppercase"
                    />
                    <input 
                        type="number" 
                        placeholder="Saldo Iniziale"
                        value={newAsset.balance}
                        onChange={e => setNewAsset({...newAsset, balance: e.target.value})}
                        className="bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs outline-none"
                    />
                    <input 
                        type="number" 
                        placeholder="Target %"
                        value={newAsset.percent}
                        onChange={e => setNewAsset({...newAsset, percent: e.target.value})}
                        className="bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs outline-none"
                    />
                </div>
                <input 
                    type="text" 
                    placeholder="Contract Address (0x...) - Opzionale"
                    value={newAsset.address}
                    onChange={e => setNewAsset({...newAsset, address: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs outline-none font-mono mb-3"
                />
                <button 
                    onClick={handleAddAsset}
                    disabled={!newAsset.symbol || !newAsset.percent}
                    className="w-full bg-gray-700 hover:bg-neon-blue hover:text-white text-gray-300 text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
                >
                    Aggiungi alla Strategia
                </button>
             </div>

             {Math.abs(totalAllocation - 100) > 0.1 && (
                 <div className="flex items-start gap-2 p-3 bg-neon-red/10 border border-neon-red/20 rounded-lg animate-pulse">
                    <AlertTriangle size={16} className="text-neon-red shrink-0 mt-0.5" />
                    <p className="text-xs text-neon-red font-bold">
                        Errore Allocazione: Il totale è {totalAllocation.toFixed(1)}%. Devi raggiungere esattamente il 100% per salvare.
                    </p>
                 </div>
             )}

          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800 flex justify-end">
          <button 
            onClick={onClose}
            disabled={Math.abs(totalAllocation - 100) > 0.1}
            className={`
                px-8 py-3 rounded-lg font-bold text-white transition-all shadow-lg flex items-center gap-2
                ${Math.abs(totalAllocation - 100) > 0.1 
                    ? 'bg-gray-700 cursor-not-allowed opacity-50' 
                    : 'bg-neon-blue hover:bg-blue-600 shadow-blue-900/30'}
            `}
          >
            <Save size={18} /> Salva e Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
