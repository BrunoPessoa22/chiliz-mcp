import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { CoinGeckoClient } from '../api/coingecko.js';
import { FAN_TOKENS } from '../types/index.js';
import { ErrorHandler } from '../errors/error-handler.js';
import { ValidationError } from '../errors/chiliz-error.js';

export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  balanceFormatted: number;
  priceUSD: number;
  valueUSD: number;
  change24h: number;
  change24hPercent: number;
}

export interface PortfolioSummary {
  totalValueUSD: number;
  totalChange24hUSD: number;
  totalChange24hPercent: number;
  tokens: TokenBalance[];
  chzBalance: string;
  chzBalanceFormatted: number;
  chzValueUSD: number;
  breakdown: {
    symbol: string;
    percentage: number;
    valueUSD: number;
  }[];
  lastUpdated: number;
}

export interface PortfolioHistory {
  timestamp: number;
  totalValueUSD: number;
  tokens: {
    symbol: string;
    valueUSD: number;
  }[];
}

export interface PortfolioPerformance {
  roi: number;
  roiPercent: number;
  totalGainLoss: number;
  bestPerformer: {
    symbol: string;
    gainPercent: number;
  };
  worstPerformer: {
    symbol: string;
    lossPercent: number;
  };
  timeframe: string;
}

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

/**
 * Track portfolio value and analytics
 */
export async function trackPortfolio(params: {
  address: string;
  includeTokens?: string[];
  excludeTokens?: string[];
}): Promise<PortfolioSummary> {
  return ErrorHandler.withRetry(
    async () => {
      // Validate address
      if (!ethers.isAddress(params.address)) {
        throw new ValidationError('Invalid wallet address', { address: params.address });
      }

      const provider = new ethers.JsonRpcProvider(config.rpc.url);
      const coingecko = new CoinGeckoClient();

      // Get CHZ balance
      const chzBalance = await provider.getBalance(params.address);
      const chzBalanceFormatted = parseFloat(ethers.formatEther(chzBalance));

      // Get CHZ price
      let chzPriceUSD = 0.08; // fallback
      try {
        const chzPrice = await coingecko.getPrice('chiliz');
        if (chzPrice) {
          chzPriceUSD = chzPrice.currentPrice;
        }
      } catch (error) {
        console.warn('Failed to fetch CHZ price, using fallback');
      }

      const chzValueUSD = chzBalanceFormatted * chzPriceUSD;

      // Filter tokens
      let tokensToCheck = FAN_TOKENS;
      if (params.includeTokens?.length) {
        tokensToCheck = FAN_TOKENS.filter(t =>
          params.includeTokens!.includes(t.symbol.toUpperCase())
        );
      }
      if (params.excludeTokens?.length) {
        tokensToCheck = tokensToCheck.filter(t =>
          !params.excludeTokens!.includes(t.symbol.toUpperCase())
        );
      }

      // Get token balances
      const tokens: TokenBalance[] = [];
      let totalValueUSD = chzValueUSD;
      let totalChange24hUSD = 0;

      for (const token of tokensToCheck) {
        if (!token.address) continue;

        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const balance = await contract.balanceOf(params.address);
          const balanceFormatted = parseFloat(ethers.formatUnits(balance, 18));

          if (balanceFormatted === 0) continue;

          // Get token price
          let priceUSD = 0;
          let change24h = 0;
          let change24hPercent = 0;

          if (token.coingeckoId) {
            try {
              const priceData = await coingecko.getPrice(token.coingeckoId);
              if (priceData) {
                priceUSD = priceData.currentPrice;
                change24hPercent = priceData.priceChangePercentage24h;
              }
            } catch (error) {
              console.warn(`Failed to fetch price for ${token.symbol}`);
            }
          }

          const valueUSD = balanceFormatted * priceUSD;
          change24h = valueUSD * (change24hPercent / 100);

          tokens.push({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            balance: balance.toString(),
            balanceFormatted,
            priceUSD,
            valueUSD,
            change24h,
            change24hPercent
          });

          totalValueUSD += valueUSD;
          totalChange24hUSD += change24h;
        } catch (error) {
          console.warn(`Failed to get balance for ${token.symbol}:`, error);
        }
      }

      // Sort tokens by value
      tokens.sort((a, b) => b.valueUSD - a.valueUSD);

      // Calculate breakdown
      const breakdown = [
        {
          symbol: 'CHZ',
          percentage: totalValueUSD > 0 ? (chzValueUSD / totalValueUSD) * 100 : 0,
          valueUSD: chzValueUSD
        },
        ...tokens.map(t => ({
          symbol: t.symbol,
          percentage: totalValueUSD > 0 ? (t.valueUSD / totalValueUSD) * 100 : 0,
          valueUSD: t.valueUSD
        }))
      ];

      const totalChange24hPercent = totalValueUSD > 0
        ? (totalChange24hUSD / (totalValueUSD - totalChange24hUSD)) * 100
        : 0;

      return {
        totalValueUSD,
        totalChange24hUSD,
        totalChange24hPercent,
        tokens,
        chzBalance: chzBalance.toString(),
        chzBalanceFormatted,
        chzValueUSD,
        breakdown,
        lastUpdated: Date.now()
      };
    },
    { operation: 'track_portfolio', timestamp: Date.now(), metadata: params }
  );
}

/**
 * Get portfolio performance metrics
 */
export async function getPortfolioPerformance(params: {
  address: string;
  initialInvestmentUSD?: number;
  timeframe?: '24h' | '7d' | '30d' | 'all';
}): Promise<PortfolioPerformance> {
  return ErrorHandler.withRetry(
    async () => {
      const portfolio = await trackPortfolio({ address: params.address });

      const currentValue = portfolio.totalValueUSD;
      const initialInvestment = params.initialInvestmentUSD || currentValue;

      const totalGainLoss = currentValue - initialInvestment;
      const roiPercent = initialInvestment > 0
        ? (totalGainLoss / initialInvestment) * 100
        : 0;

      // Find best and worst performers
      let bestPerformer = { symbol: 'N/A', gainPercent: 0 };
      let worstPerformer = { symbol: 'N/A', lossPercent: 0 };

      for (const token of portfolio.tokens) {
        if (token.change24hPercent > bestPerformer.gainPercent) {
          bestPerformer = {
            symbol: token.symbol,
            gainPercent: token.change24hPercent
          };
        }
        if (token.change24hPercent < worstPerformer.lossPercent) {
          worstPerformer = {
            symbol: token.symbol,
            lossPercent: token.change24hPercent
          };
        }
      }

      return {
        roi: totalGainLoss,
        roiPercent,
        totalGainLoss,
        bestPerformer,
        worstPerformer,
        timeframe: params.timeframe || '24h'
      };
    },
    { operation: 'get_portfolio_performance', timestamp: Date.now(), metadata: params }
  );
}

/**
 * Get portfolio diversity score
 */
export async function getPortfolioDiversity(address: string): Promise<{
  diversityScore: number;
  concentration: number;
  numberOfAssets: number;
  topHoldingPercentage: number;
  recommendations: string[];
}> {
  return ErrorHandler.withRetry(
    async () => {
      const portfolio = await trackPortfolio({ address });

      const numberOfAssets = portfolio.breakdown.length;
      const topHoldingPercentage = Math.max(...portfolio.breakdown.map(b => b.percentage));

      // Calculate Herfindahl-Hirschman Index (HHI) for concentration
      const hhi = portfolio.breakdown.reduce((sum, asset) => {
        return sum + Math.pow(asset.percentage, 2);
      }, 0);

      // Normalize concentration (0-100, where 0 is perfectly diversified)
      const concentration = hhi / 100;

      // Diversity score (inverse of concentration)
      const diversityScore = Math.max(0, 100 - concentration);

      // Generate recommendations
      const recommendations: string[] = [];

      if (topHoldingPercentage > 50) {
        recommendations.push('Consider reducing concentration in top holding');
      }

      if (numberOfAssets < 3) {
        recommendations.push('Consider diversifying into more assets');
      }

      if (concentration > 80) {
        recommendations.push('Portfolio is highly concentrated - consider rebalancing');
      }

      if (diversityScore > 70) {
        recommendations.push('Portfolio shows good diversification');
      }

      return {
        diversityScore,
        concentration,
        numberOfAssets,
        topHoldingPercentage,
        recommendations
      };
    },
    { operation: 'get_portfolio_diversity', timestamp: Date.now() }
  );
}

/**
 * Compare portfolios
 */
export async function comparePortfolios(params: {
  addresses: string[];
}): Promise<{
  portfolios: {
    address: string;
    totalValueUSD: number;
    numberOfTokens: number;
    diversityScore: number;
  }[];
  comparison: {
    highestValue: string;
    mostDiversified: string;
    mostTokens: string;
  };
}> {
  return ErrorHandler.withRetry(
    async () => {
      const portfolios = await Promise.all(
        params.addresses.map(async (address) => {
          const portfolio = await trackPortfolio({ address });
          const diversity = await getPortfolioDiversity(address);

          return {
            address,
            totalValueUSD: portfolio.totalValueUSD,
            numberOfTokens: portfolio.tokens.length,
            diversityScore: diversity.diversityScore
          };
        })
      );

      // Find comparisons
      const highestValue = portfolios.reduce((max, p) =>
        p.totalValueUSD > max.totalValueUSD ? p : max
      );

      const mostDiversified = portfolios.reduce((max, p) =>
        p.diversityScore > max.diversityScore ? p : max
      );

      const mostTokens = portfolios.reduce((max, p) =>
        p.numberOfTokens > max.numberOfTokens ? p : max
      );

      return {
        portfolios,
        comparison: {
          highestValue: highestValue.address,
          mostDiversified: mostDiversified.address,
          mostTokens: mostTokens.address
        }
      };
    },
    { operation: 'compare_portfolios', timestamp: Date.now() }
  );
}
