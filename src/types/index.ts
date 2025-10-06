// Type definitions for Chiliz MCP

export interface FanToken {
  symbol: string;
  name: string;
  address?: string;
  decimals?: number;
  coingeckoId?: string;
  chainId?: number;
}

export interface TokenPrice {
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  volume24h: number;
  marketCap: number;
  circulatingSupply: number;
  totalSupply?: number;
  lastUpdated: string;
}

export interface WalletBalance {
  address: string;
  chzBalance: string;
  chzBalanceFormatted: number;
  fanTokens: Array<{
    symbol: string;
    name: string;
    balance: string;
    balanceFormatted: number;
    contractAddress: string;
  }>;
  totalValueUSD?: number;
}

export interface BlockchainInfo {
  chainId: number;
  chainName: string;
  blockHeight: number;
  blockTime: number;
  gasPrice: string;
  validators?: number;
  networkStatus: 'healthy' | 'degraded' | 'down';
  lastUpdate: string;
}

export interface Transaction {
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  valueFormatted: number;
  gasUsed: string;
  gasPrice: string;
  status: 'success' | 'failed' | 'pending';
  method?: string;
  tokenTransfers?: Array<{
    from: string;
    to: string;
    token: string;
    amount: string;
    symbol?: string;
  }>;
}

export interface TokenHolder {
  rank: number;
  address: string;
  balance: string;
  balanceFormatted: number;
  percentage: number;
}

export interface CacheOptions {
  ttl: number; // Time to live in seconds
  checkperiod?: number; // Check period in seconds
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

// Fan token mapping
export const FAN_TOKENS: FanToken[] = [
  // Native Token
  { symbol: 'CHZ', name: 'Chiliz', coingeckoId: 'chiliz', address: '0x0000000000000000000000000000000000000000' },

  // European Football
  { symbol: 'PSG', name: 'Paris Saint-Germain Fan Token', coingeckoId: 'paris-saint-germain-fan-token', address: '0x' },
  { symbol: 'JUV', name: 'Juventus Fan Token', coingeckoId: 'juventus-fan-token', address: '0x' },
  { symbol: 'BAR', name: 'FC Barcelona Fan Token', coingeckoId: 'fc-barcelona-fan-token', address: '0x' },
  { symbol: 'CITY', name: 'Manchester City Fan Token', coingeckoId: 'manchester-city-fan-token' },
  { symbol: 'GAL', name: 'Galatasaray Fan Token', coingeckoId: 'galatasaray-fan-token' },
  { symbol: 'ACM', name: 'AC Milan Fan Token', coingeckoId: 'ac-milan-fan-token' },
  { symbol: 'INTER', name: 'Inter Milan Fan Token', coingeckoId: 'inter-milan-fan-token' },
  { symbol: 'ATM', name: 'Atletico Madrid Fan Token', coingeckoId: 'atletico-madrid-fan-token' },
  { symbol: 'ASR', name: 'AS Roma Fan Token', coingeckoId: 'as-roma-fan-token' },
  { symbol: 'LAZIO', name: 'Lazio Fan Token', coingeckoId: 'lazio-fan-token' },
  { symbol: 'POR', name: 'Portugal National Team Fan Token', coingeckoId: 'portugal-national-team-fan-token' },
  { symbol: 'NOV', name: 'Novara Fan Token', coingeckoId: 'novara-fan-token' },
  { symbol: 'YBO', name: 'Young Boys Fan Token', coingeckoId: 'young-boys-fan-token' },
  { symbol: 'IBFK', name: 'Istanbul Basaksehir Fan Token', coingeckoId: 'istanbul-basaksehir-fan-token' },

  // Brazilian Football - Major Clubs (Official Chiliz Fan Tokens Only)
  { symbol: 'MENGO', name: 'Flamengo Fan Token', coingeckoId: 'flamengo-fan-token' },
  { symbol: 'SCCP', name: 'Corinthians Fan Token', coingeckoId: 'sport-club-corinthians-paulista-fan-token' },
  { symbol: 'SPFC', name: 'São Paulo FC Fan Token', coingeckoId: 'sao-paulo-fc-fan-token' },
  { symbol: 'CAM', name: 'Atlético Mineiro Fan Token', coingeckoId: 'atletico-mineiro-fan-token' },
  { symbol: 'GALO', name: 'Atlético Mineiro Fan Token', coingeckoId: 'clube-atletico-mineiro-fan-token' },
  { symbol: 'VASCO', name: 'Vasco da Gama Fan Token', coingeckoId: 'vasco-da-gama-fan-token' },
  { symbol: 'VERDAO', name: 'Palmeiras Fan Token', coingeckoId: 'palmeiras-fan-token' },
  { symbol: 'FLU', name: 'Fluminense Fan Token', coingeckoId: 'fluminense-fan-token' },
  { symbol: 'CAP', name: 'Athletico Paranaense Fan Token', coingeckoId: 'athletico-paranaense-fan-token' },
  { symbol: 'FOR', name: 'Fortaleza Fan Token', coingeckoId: 'fortaleza-fan-token' },

  // South American
  { symbol: 'CAI', name: 'Club Atletico Independiente Fan Token', coingeckoId: 'club-atletico-independiente-fan-token' },

  // Esports
  { symbol: 'OG', name: 'OG Fan Token', coingeckoId: 'og-fan-token' },
  { symbol: 'NAVI', name: 'Natus Vincere Fan Token', coingeckoId: 'natus-vincere-fan-token' },
  { symbol: 'TH', name: 'Team Heretics Fan Token', coingeckoId: 'team-heretics-fan-token' },

  // Sports/Fighting
  { symbol: 'UFC', name: 'UFC Fan Token', coingeckoId: 'ufc-fan-token' },
  { symbol: 'PFL', name: 'Professional Fighters League Fan Token', coingeckoId: 'professional-fighters-league-fan-token' },
  { symbol: 'ROUSH', name: 'Roush Fenway Racing Fan Token', coingeckoId: 'roush-fenway-racing-fan-token' }
];

// FanX DEX Types
export interface LiquidityPool {
  id: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  reserve0: string;
  reserve1: string;
  totalLiquidity: string;
  volume24h: string;
  fees24h: string;
  apy: number;
  tvl: number;
}

export interface LiquidityPosition {
  poolId: string;
  owner: string;
  liquidity: string;
  token0Amount: string;
  token1Amount: string;
  share: number; // percentage of pool
  unclaimedFees: string;
}