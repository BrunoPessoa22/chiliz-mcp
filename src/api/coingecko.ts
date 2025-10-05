import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { cacheManager } from '../utils/cache.js';
import { rateLimiter } from '../utils/rateLimiter.js';
import { TokenPrice, APIError } from '../types/index.js';

export class CoinGeckoClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.coingecko.baseUrl,
      headers: config.coingecko.apiKey ? {
        'x-cg-demo-api-key': config.coingecko.apiKey
      } : {},
      timeout: 10000
    });

    // Configure rate limiter
    rateLimiter.configure('coingecko', config.rateLimit.coingecko);
  }

  async getPrice(tokenId: string): Promise<TokenPrice | null> {
    const cacheKey = `price_${tokenId}`;

    // Check cache first
    const cached = cacheManager.get('prices', cacheKey);
    if (cached) {
      return cached;
    }

    // Check rate limit
    await rateLimiter.waitForLimit('coingecko');

    try {
      const response = await this.client.get('/simple/price', {
        params: {
          ids: tokenId,
          vs_currencies: 'usd',
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true
        }
      });

      const data = response.data[tokenId];
      if (!data) {
        return null;
      }

      const detailedResponse = await this.client.get(`/coins/${tokenId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      });

      const marketData = detailedResponse.data.market_data;
      const result: TokenPrice = {
        symbol: detailedResponse.data.symbol.toUpperCase(),
        name: detailedResponse.data.name,
        currentPrice: data.usd,
        priceChange24h: data.usd_24h_change || 0,
        priceChangePercentage24h: marketData.price_change_percentage_24h || 0,
        volume24h: data.usd_24h_vol || 0,
        marketCap: data.usd_market_cap || 0,
        circulatingSupply: marketData.circulating_supply || 0,
        totalSupply: marketData.total_supply || 0,
        lastUpdated: new Date(data.last_updated_at * 1000).toISOString()
      };

      // Cache the result
      cacheManager.set('prices', cacheKey, result);

      return result;
    } catch (error: any) {
      if (config.debug) {
        console.error('CoinGecko API error:', error.message);
      }
      throw {
        code: 'COINGECKO_ERROR',
        message: `Failed to fetch price data: ${error.message}`,
        details: error.response?.data
      } as APIError;
    }
  }

  async getMultiplePrices(tokenIds: string[]): Promise<Record<string, TokenPrice | null>> {
    const results: Record<string, TokenPrice | null> = {};

    // Check cache for each token
    const uncachedTokens: string[] = [];
    for (const tokenId of tokenIds) {
      const cached = cacheManager.get('prices', `price_${tokenId}`);
      if (cached) {
        results[tokenId] = cached;
      } else {
        uncachedTokens.push(tokenId);
      }
    }

    if (uncachedTokens.length === 0) {
      return results;
    }

    // Check rate limit
    await rateLimiter.waitForLimit('coingecko');

    try {
      const response = await this.client.get('/simple/price', {
        params: {
          ids: uncachedTokens.join(','),
          vs_currencies: 'usd',
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true
        }
      });

      for (const tokenId of uncachedTokens) {
        const data = response.data[tokenId];
        if (data) {
          const price: TokenPrice = {
            symbol: tokenId.toUpperCase(),
            name: tokenId,
            currentPrice: data.usd,
            priceChange24h: data.usd_24h_change || 0,
            priceChangePercentage24h: (data.usd_24h_change / data.usd) * 100 || 0,
            volume24h: data.usd_24h_vol || 0,
            marketCap: data.usd_market_cap || 0,
            circulatingSupply: 0,
            lastUpdated: new Date(data.last_updated_at * 1000).toISOString()
          };

          results[tokenId] = price;
          cacheManager.set('prices', `price_${tokenId}`, price);
        } else {
          results[tokenId] = null;
        }
      }

      return results;
    } catch (error: any) {
      if (config.debug) {
        console.error('CoinGecko API error:', error.message);
      }
      throw {
        code: 'COINGECKO_ERROR',
        message: `Failed to fetch multiple prices: ${error.message}`,
        details: error.response?.data
      } as APIError;
    }
  }

  async getTrending(): Promise<any> {
    const cacheKey = 'trending';
    const cached = cacheManager.get('prices', cacheKey);
    if (cached) {
      return cached;
    }

    await rateLimiter.waitForLimit('coingecko');

    try {
      const response = await this.client.get('/search/trending');
      cacheManager.set('prices', cacheKey, response.data, 300); // Cache for 5 minutes
      return response.data;
    } catch (error: any) {
      throw {
        code: 'COINGECKO_ERROR',
        message: `Failed to fetch trending data: ${error.message}`,
        details: error.response?.data
      } as APIError;
    }
  }

  async getMarketChart(tokenId: string, days: number = 7): Promise<any> {
    const cacheKey = `chart_${tokenId}_${days}`;
    const cached = cacheManager.get('prices', cacheKey);
    if (cached) {
      return cached;
    }

    await rateLimiter.waitForLimit('coingecko');

    try {
      const response = await this.client.get(`/coins/${tokenId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: days > 30 ? 'daily' : 'hourly'
        }
      });

      const result = {
        prices: response.data.prices,
        marketCaps: response.data.market_caps,
        volumes: response.data.total_volumes
      };

      cacheManager.set('prices', cacheKey, result, 3600); // Cache for 1 hour
      return result;
    } catch (error: any) {
      throw {
        code: 'COINGECKO_ERROR',
        message: `Failed to fetch market chart: ${error.message}`,
        details: error.response?.data
      } as APIError;
    }
  }
}