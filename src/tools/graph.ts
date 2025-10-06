import { graphProvider } from '../api/graph-provider.js';
import { FAN_TOKENS } from '../types/index.js';

/**
 * Query fan token analytics from The Graph
 */
export async function queryFanTokenAnalytics(params: {
  symbol: string;
  days?: number;
}): Promise<{
  token: string;
  transfers: any[];
  topHolders: any[];
  distribution: any;
  velocity: any;
  historicalPrices: any[];
}> {
  const token = FAN_TOKENS.find(t => t.symbol === params.symbol);
  if (!token || !token.address) {
    throw new Error(`Token ${params.symbol} not found or missing address`);
  }

  const days = params.days || 7;

  // Fetch all analytics data in parallel
  const [transfers, topHolders, distribution, velocity, historicalPrices] = await Promise.all([
    graphProvider.queryFanTokenTransfers({
      tokenAddress: token.address,
      limit: 50,
    }),
    graphProvider.getTopTokenHolders({
      tokenAddress: token.address,
      limit: 20,
    }),
    graphProvider.analyzeHolderDistribution({
      tokenAddress: token.address,
    }),
    graphProvider.getTokenVelocity({
      tokenAddress: token.address,
      days,
    }),
    graphProvider.getHistoricalPrices({
      tokenAddress: token.address,
      days,
      interval: 'day',
    }),
  ]);

  return {
    token: params.symbol,
    transfers,
    topHolders,
    distribution,
    velocity,
    historicalPrices,
  };
}

/**
 * Get governance history for a fan token
 */
export async function getGovernanceHistory(params: {
  symbol: string;
  status?: 'active' | 'succeeded' | 'defeated' | 'queued' | 'executed';
  limit?: number;
}): Promise<{
  token: string;
  proposals: any[];
  totalProposals: number;
  activeProposals: number;
  participationRate?: number;
}> {
  const token = FAN_TOKENS.find(t => t.symbol === params.symbol);
  if (!token || !token.address) {
    throw new Error(`Token ${params.symbol} not found or missing address`);
  }

  const proposals = await graphProvider.getGovernanceHistory({
    tokenAddress: token.address,
    status: params.status,
    limit: params.limit || 50,
  });

  const activeProposals = proposals.filter(p => p.status === 'active').length;

  // Calculate average participation rate
  const participationRates = proposals.map(p => {
    const totalVotes = parseFloat(p.forVotes) + parseFloat(p.againstVotes) + parseFloat(p.abstainVotes);
    return totalVotes;
  });

  const avgParticipation = participationRates.length > 0
    ? participationRates.reduce((sum, val) => sum + val, 0) / participationRates.length
    : 0;

  return {
    token: params.symbol,
    proposals,
    totalProposals: proposals.length,
    activeProposals,
    participationRate: avgParticipation,
  };
}

/**
 * Analyze holder distribution for a token
 */
export async function analyzeHolderDistribution(params: {
  symbol: string;
}): Promise<{
  token: string;
  totalHolders: number;
  whales: number;
  whalePercentage: number;
  top10Percentage: number;
  top50Percentage: number;
  giniCoefficient: number;
  concentration: 'highly_concentrated' | 'concentrated' | 'distributed' | 'highly_distributed';
  distribution: any[];
  topHolders: any[];
}> {
  const token = FAN_TOKENS.find(t => t.symbol === params.symbol);
  if (!token || !token.address) {
    throw new Error(`Token ${params.symbol} not found or missing address`);
  }

  const [distribution, topHolders] = await Promise.all([
    graphProvider.analyzeHolderDistribution({
      tokenAddress: token.address,
    }),
    graphProvider.getTopTokenHolders({
      tokenAddress: token.address,
      limit: 10,
    }),
  ]);

  // Classify concentration based on Gini coefficient
  let concentration: 'highly_concentrated' | 'concentrated' | 'distributed' | 'highly_distributed';
  if (distribution.giniCoefficient > 0.7) {
    concentration = 'highly_concentrated';
  } else if (distribution.giniCoefficient > 0.5) {
    concentration = 'concentrated';
  } else if (distribution.giniCoefficient > 0.3) {
    concentration = 'distributed';
  } else {
    concentration = 'highly_distributed';
  }

  return {
    token: params.symbol,
    ...distribution,
    concentration,
    topHolders,
  };
}

/**
 * Track large token transfers (whale movements)
 */
export async function trackWhaleMovements(params: {
  symbol: string;
  minAmount: number;
  hours?: number;
}): Promise<{
  token: string;
  whaleTransfers: any[];
  totalValue: number;
  uniqueWhales: number;
  averageTransferSize: number;
  netFlow: {
    address: string;
    netChange: number;
    inflow: number;
    outflow: number;
  }[];
}> {
  const token = FAN_TOKENS.find(t => t.symbol === params.symbol);
  if (!token || !token.address) {
    throw new Error(`Token ${params.symbol} not found or missing address`);
  }

  const hours = params.hours || 24;
  const startTime = Math.floor(Date.now() / 1000) - (hours * 60 * 60);

  const transfers = await graphProvider.queryFanTokenTransfers({
    tokenAddress: token.address,
    minAmount: params.minAmount * 1e18,
    startTime,
    limit: 200,
  });

  const whales = new Set<string>();
  let totalValue = 0;

  const netFlowMap = new Map<string, { inflow: number; outflow: number }>();

  transfers.forEach(transfer => {
    const value = parseFloat(transfer.value) / 1e18;
    whales.add(transfer.from);
    whales.add(transfer.to);
    totalValue += value;

    // Track net flows
    if (!netFlowMap.has(transfer.from)) {
      netFlowMap.set(transfer.from, { inflow: 0, outflow: 0 });
    }
    if (!netFlowMap.has(transfer.to)) {
      netFlowMap.set(transfer.to, { inflow: 0, outflow: 0 });
    }

    netFlowMap.get(transfer.from)!.outflow += value;
    netFlowMap.get(transfer.to)!.inflow += value;
  });

  const netFlow = Array.from(netFlowMap.entries())
    .map(([address, flows]) => ({
      address,
      netChange: flows.inflow - flows.outflow,
      inflow: flows.inflow,
      outflow: flows.outflow,
    }))
    .sort((a, b) => Math.abs(b.netChange) - Math.abs(a.netChange))
    .slice(0, 20);

  return {
    token: params.symbol,
    whaleTransfers: transfers.map(t => ({
      ...t,
      valueFormatted: parseFloat(t.value) / 1e18,
    })),
    totalValue,
    uniqueWhales: whales.size,
    averageTransferSize: totalValue / transfers.length,
    netFlow,
  };
}

/**
 * Get token velocity and turnover metrics
 */
export async function getTokenVelocityMetrics(params: {
  symbol: string;
  days?: number;
}): Promise<{
  token: string;
  velocity: number;
  averageHoldTime: number;
  activeAddresses: number;
  totalTransfers: number;
  volumeToMarketCapRatio: number;
  turnoverRate: number;
  interpretation: string;
}> {
  const token = FAN_TOKENS.find(t => t.symbol === params.symbol);
  if (!token || !token.address) {
    throw new Error(`Token ${params.symbol} not found or missing address`);
  }

  const days = params.days || 30;

  const velocityData = await graphProvider.getTokenVelocity({
    tokenAddress: token.address,
    days,
  });

  // Interpret velocity
  let interpretation: string;
  if (velocityData.velocity > 0.5) {
    interpretation = 'High velocity - tokens are actively traded';
  } else if (velocityData.velocity > 0.2) {
    interpretation = 'Moderate velocity - balanced holding and trading';
  } else if (velocityData.velocity > 0.05) {
    interpretation = 'Low velocity - tokens are mostly held long-term';
  } else {
    interpretation = 'Very low velocity - minimal trading activity';
  }

  return {
    token: params.symbol,
    ...velocityData,
    turnoverRate: velocityData.velocity * days,
    interpretation,
  };
}

/**
 * Compare multiple tokens' holder distributions
 */
export async function compareTokenDistributions(params: {
  symbols: string[];
}): Promise<{
  comparison: Array<{
    token: string;
    totalHolders: number;
    whalePercentage: number;
    top10Percentage: number;
    giniCoefficient: number;
    concentration: string;
  }>;
  mostDistributed: string;
  mostConcentrated: string;
}> {
  const results = await Promise.all(
    params.symbols.map(symbol => analyzeHolderDistribution({ symbol }))
  );

  const comparison = results.map(r => ({
    token: r.token,
    totalHolders: r.totalHolders,
    whalePercentage: r.whalePercentage,
    top10Percentage: r.top10Percentage,
    giniCoefficient: r.giniCoefficient,
    concentration: r.concentration,
  }));

  // Find most and least concentrated
  const sorted = [...comparison].sort((a, b) => a.giniCoefficient - b.giniCoefficient);

  return {
    comparison,
    mostDistributed: sorted[0].token,
    mostConcentrated: sorted[sorted.length - 1].token,
  };
}

/**
 * Get historical price data from The Graph
 */
export async function getHistoricalPriceData(params: {
  symbol: string;
  days?: number;
  interval?: 'hour' | 'day';
}): Promise<{
  token: string;
  prices: any[];
  priceChange: number;
  priceChangePercentage: number;
  highestPrice: number;
  lowestPrice: number;
  averageVolume: number;
}> {
  const token = FAN_TOKENS.find(t => t.symbol === params.symbol);
  if (!token || !token.address) {
    throw new Error(`Token ${params.symbol} not found or missing address`);
  }

  const prices = await graphProvider.getHistoricalPrices({
    tokenAddress: token.address,
    days: params.days || 7,
    interval: params.interval || 'day',
  });

  if (prices.length === 0) {
    throw new Error(`No historical price data found for ${params.symbol}`);
  }

  const firstPrice = prices[0].price;
  const lastPrice = prices[prices.length - 1].price;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercentage = (priceChange / firstPrice) * 100;

  const highestPrice = Math.max(...prices.map(p => p.price));
  const lowestPrice = Math.min(...prices.map(p => p.price));
  const averageVolume = prices.reduce((sum, p) => sum + p.volume24h, 0) / prices.length;

  return {
    token: params.symbol,
    prices,
    priceChange,
    priceChangePercentage,
    highestPrice,
    lowestPrice,
    averageVolume,
  };
}
