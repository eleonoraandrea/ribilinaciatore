import React from 'react';
import { TradeLog } from '../types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  logs: TradeLog[];
}

export const TradeHistory: React.FC<Props> = ({ logs }) => {
  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-900/50 rounded-xl border border-gray-800 border-dashed">
        Nessuna operazione registrata nel database.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-gray-800 uppercase tracking-wider">
            <th className="p-3">Stato</th>
            <th className="p-3">Data/Ora</th>
            <th className="p-3">Exchange</th>
            <th className="p-3">Coppia</th>
            <th className="p-3 text-right">Side</th>
            <th className="p-3 text-right">Quantità</th>
            <th className="p-3 text-right">Valore USD</th>
            <th className="p-3">TX ID</th>
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-gray-800">
          {logs.map((log, idx) => (
            <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
              <td className="p-3">
                {log.status === 'EXECUTED' && <CheckCircle size={16} className="text-neon-green" />}
                {log.status === 'FAILED' && <XCircle size={16} className="text-neon-red" />}
                {log.status === 'SIMULATED' && <Clock size={16} className="text-yellow-500" title="Simulazione (Chiavi mancanti)" />}
              </td>
              <td className="p-3 text-gray-300">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="p-3 text-gray-400">{log.exchange.split('_')[0]}</td>
              <td className="p-3 font-bold text-white">{log.pair}</td>
              <td className={`p-3 text-right font-bold ${log.side === 'BUY' ? 'text-neon-green' : 'text-neon-red'}`}>
                {log.side}
              </td>
              <td className="p-3 text-right font-mono text-gray-300">{log.amount.toFixed(4)}</td>
              <td className="p-3 text-right font-mono text-gray-300">${log.totalUsd.toFixed(2)}</td>
              <td className="p-3">
                {log.txHash ? (
                  <span className="text-neon-blue font-mono text-xs cursor-pointer hover:underline">
                    {log.txHash.slice(0, 6)}...{log.txHash.slice(-4)}
                  </span>
                ) : (
                  <span className="text-gray-600">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
