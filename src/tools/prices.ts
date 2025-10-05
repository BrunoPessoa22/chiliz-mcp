import { CoinGeckoClient } from '../api/coingecko.js';
import { TokenPrice, FAN_TOKENS } from '../types/index.js';

const coingeckoClient = new CoinGeckoClient();

export async function getFanTokenPrice(symbol: string): Promise<TokenPrice | null> {
  const token = FAN_TOKENS.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());

  if (!token || !token.coingeckoId) {
    throw new Error(`Token ${symbol} not found or not supported`);
  }

  return await coingeckoClient.getPrice(token.coingeckoId);
}

export async function getMultipleFanTokenPrices(symbols: string[]): Promise<Record<string, TokenPrice | null>> {
  const tokenIds = symbols
    .map(symbol => {
      const token = FAN_TOKENS.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
      return token?.coingeckoId;
    })
    .filter(Boolean) as string[];

  if (tokenIds.length === 0) {
    throw new Error('No valid tokens found');
  }

  const prices = await coingeckoClient.getMultiplePrices(tokenIds);

  // Map back to symbols
  const result: Record<string, TokenPrice | null> = {};
  for (const symbol of symbols) {
    const token = FAN_TOKENS.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
    if (token && token.coingeckoId && prices[token.coingeckoId]) {
      result[symbol] = prices[token.coingeckoId];
    } else {
      result[symbol] = null;
    }
  }

  return result;
}

export async function getTokenMarketChart(symbol: string, days: number = 7): Promise<any> {
  const token = FAN_TOKENS.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());

  if (!token || !token.coingeckoId) {
    throw new Error(`Token ${symbol} not found or not supported`);
  }

  return await coingeckoClient.getMarketChart(token.coingeckoId, days);
}

export async function getTrendingTokens(): Promise<any> {
  return await coingeckoClient.getTrending();
}