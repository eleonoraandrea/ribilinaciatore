import { TradeLog } from '../types';

// Simple wrapper around IndexedDB to act as our "SQLite" for the browser
const DB_NAME = 'TraderRebalancerDB';
const STORE_NAME = 'trade_logs';
const VERSION = 1;

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
};

export const logTrade = async (trade: Omit<TradeLog, 'id'>): Promise<void> => {
  const dbRequest = indexedDB.open(DB_NAME, VERSION);
  
  return new Promise((resolve, reject) => {
    dbRequest.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.add(trade);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
};

export const getTradeHistory = async (): Promise<TradeLog[]> => {
  const dbRequest = indexedDB.open(DB_NAME, VERSION);

  return new Promise((resolve, reject) => {
    dbRequest.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Descending order
      
      const results: TradeLog[] = [];
      request.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    };
    dbRequest.onerror = () => reject([]);
  });
};
