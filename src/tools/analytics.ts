import { ChilizRPCClient } from '../api/chiliz-rpc.js';
import { CoinGeckoClient } from '../api/coingecko.js';
import { cacheManager } from '../utils/cache.js';

export async function detectWhaleTrades(params: {
  minValueUSD?: number;
  blockRange?: number;
}): Promise<any[]> {
  const client = new ChilizRPCClient();
  const minValue = params.minValueUSD || 100000;

  const whales = await client.detectWhaleTransactions(minValue);
  return whales;
}

export async function calculateTokenVelocity(params: {
  token: string;
  period: number; // in days
}): Promise<{
  velocity: number;
  volume: number;
  marketCap: number;
  turnoverRate: number;
}> {
  // Token velocity = Trading Volume / Market Cap
  const coingecko = new CoinGeckoClient();
  const marketData = await coingecko.getMarketChart(params.token, params.period);

  const totalVolume = marketData.volumes.reduce((sum: number, [_, vol]: [number, number]) => sum + vol, 0);
  const avgMarketCap = marketData.marketCaps.reduce((sum: number, [_, cap]: [number, number]) => sum + cap, 0) / marketData.marketCaps.length;

  const velocity = totalVolume / avgMarketCap;
  const turnoverRate = (velocity / params.period) * 100; // Daily turnover rate as percentage

  return {
    velocity,
    volume: totalVolume,
    marketCap: avgMarketCap,
    turnoverRate
  };
}

export async function identifyUnusualTradingPatterns(params: {
  token: string;
  threshold?: number; // Standard deviations from mean
}): Promise<{
  unusual: boolean;
  currentVolume: number;
  averageVolume: number;
  deviation: number;
  alerts: string[];
}> {
  const threshold = params.threshold || 2;
  const coingecko = new CoinGeckoClient();

  const marketData = await coingecko.getMarketChart(params.token, 30);
  const volumes = marketData.volumes.map(([_, vol]: [number, number]) => vol);

  // Calculate statistics
  const mean = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
  const variance = volumes.reduce((sum: number, vol: number) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
  const stdDev = Math.sqrt(variance);

  const currentVolume = volumes[volumes.length - 1];
  const deviation = (currentVolume - mean) / stdDev;

  const alerts: string[] = [];
  let unusual = false;

  if (Math.abs(deviation) > threshold) {
    unusual = true;
    if (deviation > 0) {
      alerts.push(`Volume spike detected: ${deviation.toFixed(2)} standard deviations above normal`);
    } else {
      alerts.push(`Unusually low volume: ${Math.abs(deviation).toFixed(2)} standard deviations below normal`);
    }
  }

  // Check for price-volume divergence
  const prices = marketData.prices.map(([_, price]: [number, number]) => price);
  const priceChange = ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100;
  const volumeChange = ((volumes[volumes.length - 1] - volumes[volumes.length - 2]) / volumes[volumes.length - 2]) * 100;

  if (priceChange > 5 && volumeChange < -20) {
    alerts.push('Price-volume divergence: Price rising on declining volume');
    unusual = true;
  } else if (priceChange < -5 && volumeChange > 50) {
    alerts.push('Potential capitulation: High volume selling');
    unusual = true;
  }

  return {
    unusual,
    currentVolume,
    averageVolume: mean,
    deviation,
    alerts
  };
}

export async function analyzeLiquidityDepth(_params: {
  token: string;
  exchange?: string;
}): Promise<{
  totalLiquidity: number;
  bidLiquidity: number;
  askLiquidity: number;
  spread: number;
  depth: any;
}> {
  // This would integrate with DEX APIs or orderbook data
  // For now, returning mock data structure
  return {
    totalLiquidity: 0,
    bidLiquidity: 0,
    askLiquidity: 0,
    spread: 0,
    depth: {
      bids: [],
      asks: []
    }
  };
}

export async function getMarketSentiment(params: {
  token: string;
}): Promise<{
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number;
  indicators: {
    rsi?: number;
    fearGreedIndex?: number;
    socialSentiment?: number;
  };
}> {
  const cacheKey = `sentiment_${params.token}`;
  const cached = cacheManager.get('prices', cacheKey);

  if (cached) {
    return cached;
  }

  // Calculate technical indicators and sentiment
  const coingecko = new CoinGeckoClient();
  const marketData = await coingecko.getMarketChart(params.token, 14);

  const prices = marketData.prices.map(([_, price]: [number, number]) => price);

  // Simple RSI calculation
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      gains.push(diff);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(diff));
    }
  }

  const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const rs = avgGain / (avgLoss || 0.0001);
  const rsi = 100 - (100 / (1 + rs));

  let sentiment: 'bullish' | 'bearish' | 'neutral';
  let score: number;

  if (rsi > 70) {
    sentiment = 'bearish'; // Overbought
    score = (100 - rsi) / 30 * 100;
  } else if (rsi < 30) {
    sentiment = 'bullish'; // Oversold
    score = (30 - rsi) / 30 * 100;
  } else {
    sentiment = 'neutral';
    score = 50;
  }

  const result = {
    sentiment,
    score,
    indicators: {
      rsi,
      fearGreedIndex: 50, // Placeholder
      socialSentiment: 50 // Placeholder
    }
  };

  cacheManager.set('prices', cacheKey, result, 300);
  return result;
}