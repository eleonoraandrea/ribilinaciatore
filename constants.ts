
import { Asset, Exchange, AppSettings } from './types';

// Hyperliquid Testnet API
export const HL_API_URL = 'https://api.hyperliquid-testnet.xyz';
export const HL_INFO_URL = `${HL_API_URL}/info`;
export const HL_EXCHANGE_URL = `${HL_API_URL}/exchange`;

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 0, // Will be fetched
    balance: 0.5,
    targetAllocation: 33,
  },
  {
    id: 'xaut',
    symbol: 'XAUT',
    name: 'Tether Gold',
    price: 0, // Will be fetched
    balance: 13,
    targetAllocation: 33,
    address: '0x68749665FF8D2d112Fa859AA293F07a622782F38' // Sepolia Testnet Mock Address
  },
  {
    id: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    price: 1.00,
    balance: 32000,
    targetAllocation: 34,
    isStable: true,
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // Sepolia USDC
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  deltaThreshold: 5,
  selectedExchange: Exchange.HYPERLIQUID,
  autoExecute: false,
  xautTokenAddress: '0x68749665FF8D2d112Fa859AA293F07a622782F38',
  telegramBotToken: '',
  telegramChatId: ''
};
