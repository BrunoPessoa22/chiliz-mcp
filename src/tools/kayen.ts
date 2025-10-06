import { kayenDEX } from '../protocols/kayen-dex.js';

/**
 * Find best swap route comparing KAYEN vs FanX
 */
export async function findBestSwapRoute(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}) {
  return await kayenDEX.compareDexRoutes(params);
}

/**
 * Calculate price impact for a swap on KAYEN
 */
export async function calculatePriceImpact(params: {
  poolAddress: string;
  tokenIn: string;
  amountIn: string;
}) {
  return await kayenDEX.calculatePriceImpact(params);
}

/**
 * Detect arbitrage opportunities between DEXes
 */
export async function detectArbitrage(params?: {
  minProfitPercentage?: number;
  maxPriceImpact?: number;
}) {
  return await kayenDEX.findArbitrageOpportunities(params);
}

/**
 * Get detailed pool analytics and APY
 */
export async function getPoolAPY(params: {
  poolAddress: string;
  period?: number;
}) {
  return await kayenDEX.getPoolAnalytics(params);
}

/**
 * Track liquidity changes in a pool
 */
export async function trackLiquidityChanges(params: {
  poolAddress: string;
  hours?: number;
}) {
  return await kayenDEX.trackLiquidityChanges(params);
}
