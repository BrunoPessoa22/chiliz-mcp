import axios from 'axios';
import { config } from '../config/index.js';
import { cacheManager } from '../utils/cache.js';

interface GraphQLQuery {
  query: string;
  variables?: Record<string, any>;
}

interface TokenTransfer {
  id: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

interface TokenHolder {
  address: string;
  balance: string;
  balanceFormatted: number;
  percentage: number;
  firstTransferTimestamp: number;
}

interface GovernanceProposal {
  id: string;
  proposer: string;
  description: string;
  startBlock: number;
  endBlock: number;
  status: 'active' | 'succeeded' | 'defeated' | 'queued' | 'executed';
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  createdAt: number;
}

interface HistoricalPrice {
  timestamp: number;
  price: number;
  volume24h: number;
  liquidity: number;
}

export class ChilizGraphProvider {
  private graphEndpoint: string;

  constructor() {
    // Chiliz subgraph endpoint (placeholder - actual endpoint may vary)
    this.graphEndpoint = process.env.GRAPH_ENDPOINT ||
      'https://api.studio.thegraph.com/query/chiliz-chain/chiliz-analytics/version/latest';
  }

  private async query<T>(query: GraphQLQuery): Promise<T> {
    try {
      const response = await axios.post(this.graphEndpoint, query, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error) {
      if (config.debug) {
        console.error('Graph query error:', error);
      }
      throw new Error(`Failed to query The Graph: ${error}`);
    }
  }

  /**
   * Query fan token transfers with filters
   */
  async queryFanTokenTransfers(params: {
    tokenAddress: string;
    minAmount?: number;
    from?: string;
    to?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<TokenTransfer[]> {
    const cacheKey = `transfers_${params.tokenAddress}_${params.minAmount || 0}`;
    const cached = cacheManager.get('transactions', cacheKey);

    if (cached) {
      return cached;
    }

    const query = {
      query: `
        query GetTokenTransfers(
          $token: String!
          $minAmount: BigInt
          $from: String
          $to: String
          $startTime: Int
          $endTime: Int
          $limit: Int
        ) {
          transfers(
            where: {
              token: $token
              ${params.minAmount ? 'value_gte: $minAmount' : ''}
              ${params.from ? 'from: $from' : ''}
              ${params.to ? 'to: $to' : ''}
              ${params.startTime ? 'timestamp_gte: $startTime' : ''}
              ${params.endTime ? 'timestamp_lte: $endTime' : ''}
            }
            orderBy: timestamp
            orderDirection: desc
            first: $limit
          ) {
            id
            from
            to
            value
            timestamp
            blockNumber
            transactionHash
          }
        }
      `,
      variables: {
        token: params.tokenAddress.toLowerCase(),
        minAmount: params.minAmount?.toString(),
        from: params.from?.toLowerCase(),
        to: params.to?.toLowerCase(),
        startTime: params.startTime,
        endTime: params.endTime,
        limit: params.limit || 100,
      },
    };

    const result = await this.query<{ transfers: TokenTransfer[] }>(query);
    const transfers = result.transfers || [];

    cacheManager.set('transactions', cacheKey, transfers, 60);
    return transfers;
  }

  /**
   * Get top token holders
   */
  async getTopTokenHolders(params: {
    tokenAddress: string;
    limit?: number;
    minBalance?: number;
  }): Promise<TokenHolder[]> {
    const cacheKey = `holders_${params.tokenAddress}`;
    const cached = cacheManager.get('balances', cacheKey);

    if (cached) {
      return cached;
    }

    const query = {
      query: `
        query GetTopHolders(
          $token: String!
          $limit: Int
          $minBalance: BigInt
        ) {
          tokenHolders(
            where: {
              token: $token
              ${params.minBalance ? 'balance_gte: $minBalance' : ''}
            }
            orderBy: balance
            orderDirection: desc
            first: $limit
          ) {
            address
            balance
            firstTransferTimestamp
          }
          token(id: $token) {
            totalSupply
          }
        }
      `,
      variables: {
        token: params.tokenAddress.toLowerCase(),
        limit: params.limit || 50,
        minBalance: params.minBalance?.toString(),
      },
    };

    const result = await this.query<{
      tokenHolders: Array<{ address: string; balance: string; firstTransferTimestamp: number }>;
      token: { totalSupply: string };
    }>(query);

    const totalSupply = parseFloat(result.token.totalSupply);
    const holders: TokenHolder[] = (result.tokenHolders || []).map(holder => ({
      address: holder.address,
      balance: holder.balance,
      balanceFormatted: parseFloat(holder.balance) / 1e18,
      percentage: (parseFloat(holder.balance) / totalSupply) * 100,
      firstTransferTimestamp: holder.firstTransferTimestamp,
    }));

    cacheManager.set('balances', cacheKey, holders, 120);
    return holders;
  }

  /**
   * Get governance proposal history
   */
  async getGovernanceHistory(params: {
    tokenAddress: string;
    status?: string;
    limit?: number;
  }): Promise<GovernanceProposal[]> {
    const cacheKey = `governance_${params.tokenAddress}_${params.status || 'all'}`;
    const cached = cacheManager.get('prices', cacheKey);

    if (cached) {
      return cached;
    }

    const query = {
      query: `
        query GetGovernanceProposals(
          $token: String!
          $status: String
          $limit: Int
        ) {
          proposals(
            where: {
              token: $token
              ${params.status ? 'status: $status' : ''}
            }
            orderBy: createdAt
            orderDirection: desc
            first: $limit
          ) {
            id
            proposer
            description
            startBlock
            endBlock
            status
            forVotes
            againstVotes
            abstainVotes
            createdAt
          }
        }
      `,
      variables: {
        token: params.tokenAddress.toLowerCase(),
        status: params.status,
        limit: params.limit || 20,
      },
    };

    const result = await this.query<{ proposals: GovernanceProposal[] }>(query);
    const proposals = result.proposals || [];

    cacheManager.set('prices', cacheKey, proposals, 300);
    return proposals;
  }

  /**
   * Get historical prices from The Graph
   */
  async getHistoricalPrices(params: {
    tokenAddress: string;
    days?: number;
    interval?: 'hour' | 'day';
  }): Promise<HistoricalPrice[]> {
    const days = params.days || 7;
    const interval = params.interval || 'day';
    const cacheKey = `historical_${params.tokenAddress}_${days}_${interval}`;
    const cached = cacheManager.get('prices', cacheKey);

    if (cached) {
      return cached;
    }

    const startTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

    const query = {
      query: `
        query GetHistoricalPrices(
          $token: String!
          $startTime: Int!
          $interval: String!
        ) {
          pricePoints(
            where: {
              token: $token
              timestamp_gte: $startTime
              interval: $interval
            }
            orderBy: timestamp
            orderDirection: asc
            first: 1000
          ) {
            timestamp
            price
            volume24h
            liquidity
          }
        }
      `,
      variables: {
        token: params.tokenAddress.toLowerCase(),
        startTime,
        interval,
      },
    };

    const result = await this.query<{ pricePoints: HistoricalPrice[] }>(query);
    const prices = result.pricePoints || [];

    cacheManager.set('prices', cacheKey, prices, 300);
    return prices;
  }

  /**
   * Analyze holder distribution (whales vs retail)
   */
  async analyzeHolderDistribution(params: {
    tokenAddress: string;
  }): Promise<{
    totalHolders: number;
    whales: number; // holders with > 1% supply
    whalePercentage: number;
    top10Percentage: number;
    top50Percentage: number;
    giniCoefficient: number; // wealth distribution metric
    distribution: {
      tier: string;
      holders: number;
      totalBalance: number;
      percentage: number;
    }[];
  }> {
    const cacheKey = `distribution_${params.tokenAddress}`;
    const cached = cacheManager.get('balances', cacheKey);

    if (cached) {
      return cached;
    }

    const holders = await this.getTopTokenHolders({
      tokenAddress: params.tokenAddress,
      limit: 1000,
    });

    const totalHolders = holders.length;
    const whales = holders.filter(h => h.percentage > 1).length;

    const top10Balance = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
    const top50Balance = holders.slice(0, 50).reduce((sum, h) => sum + h.percentage, 0);

    // Calculate distribution tiers
    const distribution = [
      {
        tier: 'Whales (>1%)',
        holders: holders.filter(h => h.percentage > 1).length,
        totalBalance: holders.filter(h => h.percentage > 1).reduce((sum, h) => h.balanceFormatted + sum, 0),
        percentage: holders.filter(h => h.percentage > 1).reduce((sum, h) => h.percentage + sum, 0),
      },
      {
        tier: 'Large (0.1-1%)',
        holders: holders.filter(h => h.percentage >= 0.1 && h.percentage <= 1).length,
        totalBalance: holders.filter(h => h.percentage >= 0.1 && h.percentage <= 1).reduce((sum, h) => h.balanceFormatted + sum, 0),
        percentage: holders.filter(h => h.percentage >= 0.1 && h.percentage <= 1).reduce((sum, h) => h.percentage + sum, 0),
      },
      {
        tier: 'Medium (0.01-0.1%)',
        holders: holders.filter(h => h.percentage >= 0.01 && h.percentage < 0.1).length,
        totalBalance: holders.filter(h => h.percentage >= 0.01 && h.percentage < 0.1).reduce((sum, h) => h.balanceFormatted + sum, 0),
        percentage: holders.filter(h => h.percentage >= 0.01 && h.percentage < 0.1).reduce((sum, h) => h.percentage + sum, 0),
      },
      {
        tier: 'Retail (<0.01%)',
        holders: holders.filter(h => h.percentage < 0.01).length,
        totalBalance: holders.filter(h => h.percentage < 0.01).reduce((sum, h) => h.balanceFormatted + sum, 0),
        percentage: holders.filter(h => h.percentage < 0.01).reduce((sum, h) => h.percentage + sum, 0),
      },
    ];

    // Simple Gini coefficient calculation
    const giniCoefficient = this.calculateGini(holders.map(h => h.balanceFormatted));

    const result = {
      totalHolders,
      whales,
      whalePercentage: (whales / totalHolders) * 100,
      top10Percentage: top10Balance,
      top50Percentage: top50Balance,
      giniCoefficient,
      distribution,
    };

    cacheManager.set('balances', cacheKey, result, 300);
    return result;
  }

  /**
   * Calculate Gini coefficient for wealth distribution
   */
  private calculateGini(balances: number[]): number {
    const sorted = balances.sort((a, b) => a - b);
    const n = sorted.length;
    const total = sorted.reduce((sum, val) => sum + val, 0);

    let sumOfDifferences = 0;
    for (let i = 0; i < n; i++) {
      sumOfDifferences += (2 * (i + 1) - n - 1) * sorted[i];
    }

    return sumOfDifferences / (n * total);
  }

  /**
   * Get token velocity (how fast tokens change hands)
   */
  async getTokenVelocity(params: {
    tokenAddress: string;
    days?: number;
  }): Promise<{
    velocity: number;
    averageHoldTime: number; // in days
    activeAddresses: number;
    totalTransfers: number;
    volumeToMarketCapRatio: number;
  }> {
    const days = params.days || 30;
    const startTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

    const transfers = await this.queryFanTokenTransfers({
      tokenAddress: params.tokenAddress,
      startTime,
      limit: 10000,
    });

    const uniqueAddresses = new Set<string>();
    let totalVolume = 0;

    transfers.forEach(transfer => {
      uniqueAddresses.add(transfer.from);
      uniqueAddresses.add(transfer.to);
      totalVolume += parseFloat(transfer.value) / 1e18;
    });

    // Velocity = Total Volume / Circulating Supply / Time Period
    const holders = await this.getTopTokenHolders({
      tokenAddress: params.tokenAddress,
      limit: 1,
    });

    const circulatingSupply = holders.reduce((sum, h) => sum + h.balanceFormatted, 0);
    const velocity = totalVolume / circulatingSupply / days;
    const averageHoldTime = circulatingSupply / (totalVolume / days);

    return {
      velocity,
      averageHoldTime,
      activeAddresses: uniqueAddresses.size,
      totalTransfers: transfers.length,
      volumeToMarketCapRatio: totalVolume / circulatingSupply,
    };
  }
}

// Singleton instance
export const graphProvider = new ChilizGraphProvider();
