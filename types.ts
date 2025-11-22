
export enum Exchange {
  HYPERLIQUID = 'HYPERLIQUID',
  UNISWAP_MAINNET = 'UNISWAP_MAINNET',
  UNISWAP_TESTNET = 'UNISWAP_TESTNET',
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  balance: number; // Amount of tokens
  targetAllocation: number; // Percentage (0-100)
  address?: string; // Contract address for Uniswap
  isStable?: boolean; // To avoid re-pricing USDC constantly if needed
}

export interface PortfolioState {
  assets: Asset[];
  totalValue: number;
  lastUpdated: Date;
}

export interface RebalanceAction {
  assetId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  amount: number; // Token amount
  usdValue: number;
  reason: string;
  timestamp: number;
}

export interface TradeLog {
  id?: number;
  timestamp: string;
  exchange: Exchange;
  pair: string;
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  totalUsd: number;
  status: 'EXECUTED' | 'FAILED' | 'SIMULATED';
  txHash?: string;
  error?: string;
}

export interface RebalanceResult {
  needsRebalance: boolean;
  deviation: number;
  actions: RebalanceAction[];
}

export interface AppSettings {
  deltaThreshold: number; // e.g., 5%
  selectedExchange: Exchange;
  autoExecute: boolean;
  // Credentials
  privateKey?: string; // For signing transactions
  hyperliquidWalletAddress?: string;
  uniswapRouterAddress?: string;
  xautTokenAddress?: string; // Custom address for Gold token
  // Telegram
  telegramBotToken?: string;
  telegramChatId?: string;
}
