import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { CoinGeckoClient } from '../api/coingecko.js';
import { FAN_TOKENS } from '../types/index.js';

// Token addresses from chiliz-rpc.ts
const TOKEN_ADDRESSES: Record<string, string> = {
  'PSG': '0x4D6B9f281AF31916a0f16d1cEA2AE3B8B7c05f7b',
  'JUV': '0xaB7D44E32dbFa0608251a40043d5e4F95C2d1050',
  'BAR': '0xB5f6c2A93a36C674d5D554170Ca4fF8cf0879AD9',
  'ACM': '0x982e46e81E99Fbfb201cD1A078a9e7C83b9B049d',
  'INTER': '0x1C6aAD90b31fBcdf3fCbD37e26feFc09b3b3912C',
  'ATM': '0xC688e3BD87FabCcc9e14f5dCd4c872d40908bA0a',
  'GAL': '0x7Ed73a87bf3e7587F55C1726ee676eE95f842ad9',
  'CITY': '0xc60F08875dcc59F4B05c0E96a5a31D99e88Dd290',
  'ASR': '0xAAaD2F04719eBE2de1d9c3f61e0b756e56D0C891',
  'UFC': '0x96957C4Ef5aa3b31e9705b7Fa08f6F572B91bE80',
  'LAZIO': '0xdbC5C48EFD41180e5DDDdE65a43C0D3C96f3cf9b',
};

interface TokenTransfer {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  token: string;
  tokenAddress: string;
  amount: string;
  amountFormatted: number;
  valueUSD: number;
}

interface PriceAlert {
  token: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  timestamp: number;
  alert: 'spike' | 'drop' | 'normal';
}

// Store recent transfers and price alerts
const recentTransfers: TokenTransfer[] = [];
const priceAlerts: PriceAlert[] = [];
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();

let wsProvider: ethers.WebSocketProvider | null = null;
let isTracking = false;
let priceCheckInterval: NodeJS.Timeout | null = null;

/**
 * Start comprehensive real-time tracking of fan tokens
 */
export async function startRealTimeTracking(params?: {
  tokens?: string[];
  minTransferValueUSD?: number;
  priceAlertThreshold?: number; // Percentage change to trigger alert
  checkPriceIntervalSeconds?: number;
}): Promise<{ status: string; message: string }> {
  if (isTracking) {
    return {
      status: 'already_running',
      message: 'Real-time tracking is already active'
    };
  }

  const trackedTokens = params?.tokens || Object.keys(TOKEN_ADDRESSES);
  const minValueUSD = params?.minTransferValueUSD || 1000;
  const alertThreshold = params?.priceAlertThreshold || 5; // 5% default
  const priceCheckInterval = (params?.checkPriceIntervalSeconds || 60) * 1000;

  try {
    const wssUrl = config.rpc.websocket;
    wsProvider = new ethers.WebSocketProvider(wssUrl);

    // Monitor token transfers
    const transferTopic = ethers.id('Transfer(address,address,uint256)');

    for (const symbol of trackedTokens) {
      const tokenAddress = TOKEN_ADDRESSES[symbol];
      if (!tokenAddress) continue;

      const filter = {
        address: tokenAddress,
        topics: [transferTopic]
      };

      wsProvider.on(filter, async (log) => {
        try {
          await handleTransferEvent(log, symbol, minValueUSD);
        } catch (error) {
          console.error(`Error handling transfer for ${symbol}:`, error);
        }
      });
    }

    // Start price monitoring
    startPriceMonitoring(trackedTokens, alertThreshold, priceCheckInterval);

    isTracking = true;

    return {
      status: 'started',
      message: `Real-time tracking started for ${trackedTokens.length} tokens. Tracking transfers ≥ $${minValueUSD}, price alerts at ${alertThreshold}%`
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `Failed to start real-time tracking: ${error.message}`
    };
  }
}

/**
 * Stop real-time tracking
 */
export async function stopRealTimeTracking(): Promise<{ status: string; message: string }> {
  if (!isTracking) {
    return {
      status: 'not_running',
      message: 'Real-time tracking is not active'
    };
  }

  try {
    if (wsProvider) {
      await wsProvider.removeAllListeners();
      await wsProvider.destroy();
      wsProvider = null;
    }

    if (priceCheckInterval) {
      clearInterval(priceCheckInterval);
      priceCheckInterval = null;
    }

    isTracking = false;

    return {
      status: 'stopped',
      message: 'Real-time tracking stopped'
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `Failed to stop tracking: ${error.message}`
    };
  }
}

/**
 * Get recent token transfers
 */
export function getRecentTransfers(params?: {
  limit?: number;
  token?: string;
  minValueUSD?: number;
}): TokenTransfer[] {
  const limit = params?.limit || 50;
  let transfers = [...recentTransfers];

  if (params?.token) {
    transfers = transfers.filter(t => t.token === params.token!.toUpperCase());
  }

  if (params?.minValueUSD !== undefined) {
    transfers = transfers.filter(t => t.valueUSD >= params.minValueUSD!);
  }

  transfers.sort((a, b) => b.timestamp - a.timestamp);
  return transfers.slice(0, limit);
}

/**
 * Get price alerts
 */
export function getPriceAlerts(params?: {
  limit?: number;
  token?: string;
  alertType?: 'spike' | 'drop' | 'normal';
}): PriceAlert[] {
  const limit = params?.limit || 50;
  let alerts = [...priceAlerts];

  if (params?.token) {
    alerts = alerts.filter(a => a.token === params.token!.toUpperCase());
  }

  if (params?.alertType) {
    alerts = alerts.filter(a => a.alert === params.alertType);
  }

  alerts.sort((a, b) => b.timestamp - a.timestamp);
  return alerts.slice(0, limit);
}

/**
 * Get whale transfers (large value transfers)
 */
export function getWhaleTransfers(params?: {
  minValueUSD?: number;
  timeWindowSeconds?: number;
}): TokenTransfer[] {
  const minValue = params?.minValueUSD || 10000;
  const timeWindow = params?.timeWindowSeconds || 3600;
  const now = Math.floor(Date.now() / 1000);

  return recentTransfers
    .filter(t => t.valueUSD >= minValue && t.timestamp >= (now - timeWindow))
    .sort((a, b) => b.valueUSD - a.valueUSD);
}

/**
 * Get tracking status
 */
export function getTrackingStatus(): {
  isTracking: boolean;
  transfersTracked: number;
  priceAlertsCount: number;
  trackedTokens: string[];
  lastUpdate: number | null;
} {
  const trackedTokens = Object.keys(TOKEN_ADDRESSES);
  const lastUpdate = recentTransfers.length > 0
    ? recentTransfers[0].timestamp
    : null;

  return {
    isTracking,
    transfersTracked: recentTransfers.length,
    priceAlertsCount: priceAlerts.length,
    trackedTokens,
    lastUpdate
  };
}

/**
 * Get live token metrics
 */
export async function getLiveTokenMetrics(token: string): Promise<{
  symbol: string;
  currentPrice: number;
  priceChangePercent24h: number;
  recentTransfers: number;
  largeTransfersLast1h: number;
  totalVolumeUSD: number;
  avgTransferValueUSD: number;
}> {
  const coingecko = new CoinGeckoClient();
  const tokenData = FAN_TOKENS.find(t => t.symbol.toUpperCase() === token.toUpperCase());

  let currentPrice = 0;
  let priceChangePercent24h = 0;

  if (tokenData?.coingeckoId) {
    try {
      const price = await coingecko.getPrice(tokenData.coingeckoId);
      if (price) {
        currentPrice = price.currentPrice;
        priceChangePercent24h = price.priceChangePercentage24h;
      }
    } catch (error) {
      console.error('Failed to fetch price:', error);
    }
  }

  // Calculate metrics from recent transfers
  const tokenTransfers = recentTransfers.filter(t => t.token === token.toUpperCase());
  const now = Math.floor(Date.now() / 1000);
  const last1h = tokenTransfers.filter(t => t.timestamp >= (now - 3600));
  const largeTransfers = last1h.filter(t => t.valueUSD >= 10000);

  const totalVolume = tokenTransfers.reduce((sum, t) => sum + t.valueUSD, 0);
  const avgValue = tokenTransfers.length > 0 ? totalVolume / tokenTransfers.length : 0;

  return {
    symbol: token.toUpperCase(),
    currentPrice,
    priceChangePercent24h,
    recentTransfers: tokenTransfers.length,
    largeTransfersLast1h: largeTransfers.length,
    totalVolumeUSD: totalVolume,
    avgTransferValueUSD: avgValue
  };
}

// Helper functions

async function handleTransferEvent(
  log: ethers.Log,
  tokenSymbol: string,
  minValueUSD: number
): Promise<void> {
  try {
    // Decode transfer event
    const from = ethers.getAddress('0x' + log.topics[1].slice(26));
    const to = ethers.getAddress('0x' + log.topics[2].slice(26));
    const amount = BigInt(log.data);

    // Format amount (assuming 18 decimals)
    const amountFormatted = parseFloat(ethers.formatUnits(amount, 18));

    // Get price
    const coingecko = new CoinGeckoClient();
    const tokenData = FAN_TOKENS.find(t => t.symbol === tokenSymbol);

    let valueUSD = 0;
    if (tokenData?.coingeckoId) {
      try {
        const price = await coingecko.getPrice(tokenData.coingeckoId);
        if (price) {
          valueUSD = amountFormatted * price.currentPrice;
        }
      } catch (error) {
        // Use cached price if available
        const cached = priceCache.get(tokenSymbol);
        if (cached) {
          valueUSD = amountFormatted * cached.price;
        }
      }
    }

    // Only store if above minimum value
    if (valueUSD < minValueUSD) return;

    const transfer: TokenTransfer = {
      hash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp: Math.floor(Date.now() / 1000),
      from,
      to,
      token: tokenSymbol,
      tokenAddress: log.address,
      amount: amount.toString(),
      amountFormatted,
      valueUSD
    };

    recentTransfers.unshift(transfer);

    // Keep only last 1000 transfers
    if (recentTransfers.length > 1000) {
      recentTransfers.pop();
    }
  } catch (error) {
    console.error('Error handling transfer event:', error);
  }
}

function startPriceMonitoring(
  tokens: string[],
  alertThreshold: number,
  interval: number
): void {
  const coingecko = new CoinGeckoClient();

  const checkPrices = async () => {
    for (const symbol of tokens) {
      const tokenData = FAN_TOKENS.find(t => t.symbol === symbol);
      if (!tokenData?.coingeckoId) continue;

      try {
        const price = await coingecko.getPrice(tokenData.coingeckoId);
        if (!price) continue;

        const currentPrice = price.currentPrice;
        const cached = priceCache.get(symbol);

        if (cached) {
          const changePercent = ((currentPrice - cached.price) / cached.price) * 100;

          let alertType: 'spike' | 'drop' | 'normal' = 'normal';
          if (Math.abs(changePercent) >= alertThreshold) {
            alertType = changePercent > 0 ? 'spike' : 'drop';

            const alert: PriceAlert = {
              token: symbol,
              currentPrice,
              previousPrice: cached.price,
              changePercent,
              timestamp: Math.floor(Date.now() / 1000),
              alert: alertType
            };

            priceAlerts.unshift(alert);

            // Keep only last 200 alerts
            if (priceAlerts.length > 200) {
              priceAlerts.pop();
            }
          }
        }

        // Update cache
        priceCache.set(symbol, {
          price: currentPrice,
          timestamp: Math.floor(Date.now() / 1000)
        });
      } catch (error) {
        console.error(`Error checking price for ${symbol}:`, error);
      }
    }
  };

  // Initial check
  checkPrices();

  // Set up interval
  priceCheckInterval = setInterval(checkPrices, interval);
}
