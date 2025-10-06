import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { CoinGeckoClient } from '../api/coingecko.js';
import { FAN_TOKENS } from '../types/index.js';

// Uniswap V2 style DEX events
const SWAP_EVENT_ABI = [
  'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)'
];

const SYNC_EVENT_ABI = [
  'event Sync(uint112 reserve0, uint112 reserve1)'
];

interface SwapEvent {
  hash: string;
  blockNumber: number;
  timestamp: number;
  sender: string;
  recipient: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  valueUSD: number;
  poolAddress: string;
}

interface PriceUpdate {
  pool: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  price: number;
  timestamp: number;
}

// Store recent swaps and price updates
const recentSwaps: SwapEvent[] = [];
const priceUpdates: Map<string, PriceUpdate> = new Map();
let wsProvider: ethers.WebSocketProvider | null = null;
let isMonitoring = false;

/**
 * Start real-time monitoring of DEX swaps
 */
export async function startDEXMonitoring(params?: {
  minValueUSD?: number;
  tokens?: string[];
}): Promise<{ status: string; message: string }> {
  if (isMonitoring) {
    return {
      status: 'already_running',
      message: 'DEX monitoring is already active'
    };
  }

  const minValueUSD = params?.minValueUSD || 1000;
  const watchTokens = params?.tokens || [];

  try {
    const wssUrl = config.rpc.websocket;
    wsProvider = new ethers.WebSocketProvider(wssUrl);

    // Listen for Swap events
    const swapInterface = new ethers.Interface(SWAP_EVENT_ABI);
    const swapTopic = swapInterface.getEvent('Swap')?.topicHash;

    if (swapTopic) {
      wsProvider.on({
        topics: [swapTopic]
      }, async (log) => {
        try {
          await handleSwapEvent(log, minValueUSD, watchTokens);
        } catch (error) {
          console.error('Error handling swap event:', error);
        }
      });
    }

    // Listen for Sync events (price updates)
    const syncInterface = new ethers.Interface(SYNC_EVENT_ABI);
    const syncTopic = syncInterface.getEvent('Sync')?.topicHash;

    if (syncTopic) {
      wsProvider.on({
        topics: [syncTopic]
      }, async (log) => {
        try {
          await handleSyncEvent(log);
        } catch (error) {
          console.error('Error handling sync event:', error);
        }
      });
    }

    isMonitoring = true;

    return {
      status: 'started',
      message: `DEX monitoring started. Tracking swaps ≥ $${minValueUSD}`
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `Failed to start DEX monitoring: ${error.message}`
    };
  }
}

/**
 * Stop DEX monitoring
 */
export async function stopDEXMonitoring(): Promise<{ status: string; message: string }> {
  if (!isMonitoring || !wsProvider) {
    return {
      status: 'not_running',
      message: 'DEX monitoring is not active'
    };
  }

  try {
    await wsProvider.removeAllListeners();
    await wsProvider.destroy();
    wsProvider = null;
    isMonitoring = false;

    return {
      status: 'stopped',
      message: 'DEX monitoring stopped'
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `Failed to stop DEX monitoring: ${error.message}`
    };
  }
}

/**
 * Get recent swap events
 */
export function getRecentSwaps(params?: {
  limit?: number;
  minValueUSD?: number;
  token?: string;
}): SwapEvent[] {
  const limit = params?.limit || 50;
  let swaps = [...recentSwaps];

  // Filter by minimum value
  if (params?.minValueUSD !== undefined) {
    swaps = swaps.filter(s => s.valueUSD >= params.minValueUSD!);
  }

  // Filter by token
  if (params?.token) {
    const token = params.token.toUpperCase();
    swaps = swaps.filter(s => s.tokenIn === token || s.tokenOut === token);
  }

  // Sort by timestamp descending
  swaps.sort((a, b) => b.timestamp - a.timestamp);

  return swaps.slice(0, limit);
}

/**
 * Get current pool prices
 */
export function getCurrentPoolPrices(token?: string): PriceUpdate[] {
  let prices = Array.from(priceUpdates.values());

  if (token) {
    const tokenUpper = token.toUpperCase();
    prices = prices.filter(p => p.token0 === tokenUpper || p.token1 === tokenUpper);
  }

  // Sort by most recent
  prices.sort((a, b) => b.timestamp - a.timestamp);

  return prices;
}

/**
 * Get DEX monitoring status
 */
export function getDEXMonitoringStatus(): {
  isMonitoring: boolean;
  recentSwapsCount: number;
  trackedPoolsCount: number;
  lastUpdate: number | null;
} {
  const lastUpdate = recentSwaps.length > 0
    ? recentSwaps[recentSwaps.length - 1].timestamp
    : null;

  return {
    isMonitoring,
    recentSwapsCount: recentSwaps.length,
    trackedPoolsCount: priceUpdates.size,
    lastUpdate
  };
}

/**
 * Detect large swaps (whale trades on DEX)
 */
export function detectLargeSwaps(params?: {
  minValueUSD?: number;
  timeWindowSeconds?: number;
}): SwapEvent[] {
  const minValue = params?.minValueUSD || 10000;
  const timeWindow = params?.timeWindowSeconds || 3600; // 1 hour default
  const now = Math.floor(Date.now() / 1000);

  return recentSwaps.filter(swap =>
    swap.valueUSD >= minValue &&
    swap.timestamp >= (now - timeWindow)
  ).sort((a, b) => b.valueUSD - a.valueUSD);
}

// Helper functions

async function handleSwapEvent(
  log: ethers.Log,
  minValueUSD: number,
  watchTokens: string[]
): Promise<void> {
  const swapInterface = new ethers.Interface(SWAP_EVENT_ABI);
  const parsed = swapInterface.parseLog({
    topics: log.topics as string[],
    data: log.data
  });

  if (!parsed) return;

  const { sender, amount0In, amount1In, amount0Out, amount1Out, to } = parsed.args;

  // Determine which token was swapped
  const isToken0In = amount0In > 0n;
  const amountIn = isToken0In ? amount0In : amount1In;
  const amountOut = isToken0In ? amount1Out : amount0Out;

  // Try to identify tokens from pool address
  const poolAddress = log.address;
  const tokenInfo = await identifyTokensFromPool(poolAddress);

  if (!tokenInfo) return;

  // Filter by watched tokens if specified
  if (watchTokens.length > 0) {
    const hasWatchedToken = watchTokens.some(t =>
      t.toUpperCase() === tokenInfo.token0 || t.toUpperCase() === tokenInfo.token1
    );
    if (!hasWatchedToken) return;
  }

  // Calculate USD value
  const coingecko = new CoinGeckoClient();
  const tokenIn = isToken0In ? tokenInfo.token0 : tokenInfo.token1;
  const tokenOut = isToken0In ? tokenInfo.token1 : tokenInfo.token0;

  let valueUSD = 0;
  try {
    const tokenData = FAN_TOKENS.find(t => t.symbol === tokenIn);
    if (tokenData?.coingeckoId) {
      const price = await coingecko.getPrice(tokenData.coingeckoId);
      if (price) {
        const amountInFloat = parseFloat(ethers.formatUnits(amountIn, 18));
        valueUSD = amountInFloat * price.currentPrice;
      }
    }
  } catch (error) {
    // Skip if price fetch fails
    return;
  }

  // Only store if above minimum value
  if (valueUSD < minValueUSD) return;

  const provider = new ethers.JsonRpcProvider(config.rpc.url);
  const block = await provider.getBlock(log.blockNumber);

  const swapEvent: SwapEvent = {
    hash: log.transactionHash,
    blockNumber: log.blockNumber,
    timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
    sender,
    recipient: to,
    tokenIn,
    tokenOut,
    amountIn: ethers.formatUnits(amountIn, 18),
    amountOut: ethers.formatUnits(amountOut, 18),
    valueUSD,
    poolAddress
  };

  recentSwaps.push(swapEvent);

  // Keep only last 1000 swaps
  if (recentSwaps.length > 1000) {
    recentSwaps.shift();
  }
}

async function handleSyncEvent(log: ethers.Log): Promise<void> {
  const syncInterface = new ethers.Interface(SYNC_EVENT_ABI);
  const parsed = syncInterface.parseLog({
    topics: log.topics as string[],
    data: log.data
  });

  if (!parsed) return;

  const { reserve0, reserve1 } = parsed.args;
  const poolAddress = log.address;
  const tokenInfo = await identifyTokensFromPool(poolAddress);

  if (!tokenInfo) return;

  const price = parseFloat(ethers.formatUnits(reserve1, 18)) /
                parseFloat(ethers.formatUnits(reserve0, 18));

  const priceUpdate: PriceUpdate = {
    pool: poolAddress,
    token0: tokenInfo.token0,
    token1: tokenInfo.token1,
    reserve0: ethers.formatUnits(reserve0, 18),
    reserve1: ethers.formatUnits(reserve1, 18),
    price,
    timestamp: Math.floor(Date.now() / 1000)
  };

  priceUpdates.set(poolAddress, priceUpdate);

  // Clean old price updates (keep only last 100 pools)
  if (priceUpdates.size > 100) {
    const oldestKey = Array.from(priceUpdates.keys())[0];
    priceUpdates.delete(oldestKey);
  }
}

async function identifyTokensFromPool(_poolAddress: string): Promise<{
  token0: string;
  token1: string;
} | null> {
  // In production, this would query the pool contract for token addresses
  // and match them against known tokens
  // For now, returning a placeholder
  return {
    token0: 'CHZ',
    token1: 'PSG'
  };
}
