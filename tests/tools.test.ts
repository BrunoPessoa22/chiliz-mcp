import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getFanTokenPrice } from '../src/tools/prices';
import { getWalletBalance } from '../src/tools/wallet';
import { getBlockchainInfo } from '../src/tools/blockchain';
import { getFanTokensList } from '../src/tools/tokens';

// Mock the API clients
jest.mock('../src/api/coingecko');
jest.mock('../src/api/chiliz-rpc');

describe('Chiliz MCP Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Price Tools', () => {
    it('should get fan token price', async () => {
      const mockPrice = {
        symbol: 'PSG',
        name: 'Paris Saint-Germain Fan Token',
        currentPrice: 2.5,
        priceChange24h: 0.1,
        priceChangePercentage24h: 4.2,
        volume24h: 1000000,
        marketCap: 50000000,
        circulatingSupply: 20000000,
        lastUpdated: '2025-01-05T12:00:00Z'
      };

      // Mock the CoinGecko response
      const { CoinGeckoClient } = require('../src/api/coingecko');
      CoinGeckoClient.prototype.getPrice = jest.fn().mockResolvedValue(mockPrice);

      const result = await getFanTokenPrice('PSG');
      expect(result).toEqual(mockPrice);
    });

    it('should throw error for unsupported token', async () => {
      await expect(getFanTokenPrice('INVALID')).rejects.toThrow('Token INVALID not found');
    });
  });

  describe('Wallet Tools', () => {
    it('should get wallet balance', async () => {
      const mockBalance = {
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        chzBalance: '1000000000000000000',
        chzBalanceFormatted: 1.0,
        fanTokens: [
          {
            symbol: 'PSG',
            name: 'Paris Saint-Germain Fan Token',
            balance: '100000000000000000000',
            balanceFormatted: 100,
            contractAddress: '0x...'
          }
        ]
      };

      const { ChilizRPCClient } = require('../src/api/chiliz-rpc');
      ChilizRPCClient.prototype.getBalance = jest.fn().mockResolvedValue(mockBalance);

      const result = await getWalletBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1');
      expect(result).toEqual(mockBalance);
    });
  });

  describe('Blockchain Tools', () => {
    it('should get blockchain info', async () => {
      const mockInfo = {
        chainId: 88888,
        chainName: 'Chiliz Chain Mainnet',
        blockHeight: 1000000,
        blockTime: 1704456000,
        gasPrice: '20000000000',
        networkStatus: 'healthy' as const,
        lastUpdate: '2025-01-05T12:00:00Z'
      };

      const { ChilizRPCClient } = require('../src/api/chiliz-rpc');
      ChilizRPCClient.prototype.getBlockchainInfo = jest.fn().mockResolvedValue(mockInfo);

      const result = await getBlockchainInfo();
      expect(result).toEqual(mockInfo);
    });
  });

  describe('Token Tools', () => {
    it('should get fan tokens list', async () => {
      const result = await getFanTokensList();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('symbol');
      expect(result[0]).toHaveProperty('name');
    });
  });
});