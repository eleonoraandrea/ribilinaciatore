
import React, { useState } from 'react';
import { AppSettings, Exchange } from '../types';
import { X, Shield, Key, Wallet, Coins, Send } from 'lucide-react';
import { sendTelegramMessage } from '../services/telegramService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onUpdate }) => {
  const [testMsgStatus, setTestMsgStatus] = useState<'IDLE'|'SENDING'|'OK'|'FAIL'>('IDLE');

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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-purple">
          Configurazione Bot
        </h2>

        <div className="space-y-8">
          {/* Strategy Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2">Strategia & Network</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Exchange API</label>
              <select 
                value={settings.selectedExchange}
                onChange={(e) => onUpdate({...settings, selectedExchange: e.target.value as Exchange})}
                className="w-full bg-gray-850 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-neon-blue outline-none"
              >
                <option value={Exchange.HYPERLIQUID}>Hyperliquid (Arbitrum Testnet)</option>
                <option value={Exchange.UNISWAP_TESTNET}>Uniswap V3 (Sepolia Testnet)</option>
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
                  {settings.autoExecute ? 'Esegue trade in automatico' : 'Solo notifiche Telegram (Manuale)'}
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

          {/* Telegram Config */}
          <div className="space-y-4">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2 flex items-center gap-2">
               <Send size={14} /> Notifiche Telegram
             </h3>
             <p className="text-xs text-gray-500">
               Inserisci Bot Token e Chat ID per ricevere segnali (in manuale) o report esecuzioni (in automatico).
             </p>
             
             <div className="grid grid-cols-1 gap-3">
                <input 
                    type="text"
                    placeholder="Bot Token (es. 12345:ABC-DEF...)"
                    value={settings.telegramBotToken || ''}
                    onChange={(e) => onUpdate({...settings, telegramBotToken: e.target.value})}
                    className="w-full bg-gray-850 border border-gray-700 rounded-lg p-3 text-white outline-none text-sm"
                />
                <div className="flex gap-2">
                    <input 
                        type="text"
                        placeholder="Chat ID (es. 123456789)"
                        value={settings.telegramChatId || ''}
                        onChange={(e) => onUpdate({...settings, telegramChatId: e.target.value})}
                        className="w-full bg-gray-850 border border-gray-700 rounded-lg p-3 text-white outline-none text-sm"
                    />
                    <button 
                      onClick={handleTestTelegram}
                      disabled={!settings.telegramBotToken || !settings.telegramChatId || testMsgStatus === 'SENDING'}
                      className={`px-4 rounded-lg font-bold text-xs transition-colors ${
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

          {/* Assets & Wallet */}
           <div className="space-y-4">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2 flex items-center gap-2">
               <Coins size={14} /> Assets & Execution
             </h3>
             <div>
               <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                 XAUT (Gold) Address
               </label>
               <input 
                  type="text"
                  value={settings.xautTokenAddress || ''}
                  onChange={(e) => onUpdate({...settings, xautTokenAddress: e.target.value})}
                  className="w-full bg-gray-850 border border-gray-700 rounded-lg p-3 text-white outline-none font-mono text-sm"
               />
             </div>

             <div>
               <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                 <Key size={14} /> Private Key (0x...)
               </label>
               <input 
                  type="password"
                  placeholder="0x... (Richiesto solo per esecuzione reale)"
                  value={settings.privateKey || ''}
                  onChange={(e) => onUpdate({...settings, privateKey: e.target.value})}
                  className="w-full bg-gray-850 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-neon-blue outline-none font-mono text-sm"
               />
             </div>
          </div>
        </div>

        <div className="mt-8">
          <button 
            onClick={onClose}
            className="w-full bg-neon-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-900/30"
          >
            Salva e Connetti
          </button>
        </div>
      </div>
    </div>
  );
};
