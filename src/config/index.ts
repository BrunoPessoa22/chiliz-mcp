import dotenv from 'dotenv';
import { CacheOptions, RateLimitConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

export const config = {
  network: process.env.NETWORK || 'mainnet',

  rpc: {
    url: process.env.CHILIZ_RPC_URL || 'https://spicy-rpc.chiliz.com/',
    testnetUrl: 'https://spicy-rpc-testnet.chiliz.com/'
  },

  coingecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
    apiKey: process.env.COINGECKO_API_KEY || '',
  },

  chilizScan: {
    baseUrl: 'https://api.chiliscan.com',
    testnetUrl: 'https://api-testnet.chiliscan.com'
  },

  cache: {
    prices: {
      ttl: parseInt(process.env.CACHE_TTL_PRICES || '60'),
      checkperiod: 120
    } as CacheOptions,

    tokenList: {
      ttl: parseInt(process.env.CACHE_TTL_TOKEN_LIST || '3600'),
      checkperiod: 600
    } as CacheOptions,

    blockchainInfo: {
      ttl: parseInt(process.env.CACHE_TTL_BLOCKCHAIN_INFO || '10'),
      checkperiod: 20
    } as CacheOptions
  },

  rateLimit: {
    coingecko: {
      maxRequests: parseInt(process.env.RATE_LIMIT_COINGECKO || '10'),
      windowMs: 60000 // 1 minute
    } as RateLimitConfig,

    rpc: {
      maxRequests: parseInt(process.env.RATE_LIMIT_RPC || '100'),
      windowMs: 60000 // 1 minute
    } as RateLimitConfig
  },

  debug: process.env.DEBUG === 'true'
};

// Chain configuration
export const CHAIN_CONFIG = {
  mainnet: {
    chainId: 88888,
    name: 'Chiliz Chain Mainnet',
    rpcUrl: 'https://spicy-rpc.chiliz.com/',
    explorerUrl: 'https://chiliscan.com',
    nativeCurrency: {
      name: 'Chiliz',
      symbol: 'CHZ',
      decimals: 18
    }
  },
  testnet: {
    chainId: 88882,
    name: 'Chiliz Spicy Testnet',
    rpcUrl: 'https://spicy-rpc-testnet.chiliz.com/',
    explorerUrl: 'https://testnet.chiliscan.com',
    nativeCurrency: {
      name: 'Chiliz',
      symbol: 'CHZ',
      decimals: 18
    }
  }
};

export function getChainConfig() {
  return CHAIN_CONFIG[config.network as keyof typeof CHAIN_CONFIG] || CHAIN_CONFIG.mainnet;
}

export function getRPCUrl(): string {
  return config.network === 'testnet' ? config.rpc.testnetUrl : config.rpc.url;
}

export function getExplorerUrl(): string {
  const chainConfig = getChainConfig();
  return chainConfig.explorerUrl;
}