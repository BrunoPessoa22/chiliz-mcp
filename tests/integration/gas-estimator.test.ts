import { describe, it, expect } from '@jest/globals';
import {
  estimateGas,
  getGasPriceRecommendations,
  analyzeTransactionCost,
  calculateOptimalGasPrice
} from '../../src/tools/gas-estimator.js';

describe('Gas Estimator Integration Tests', () => {
  const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  describe('estimateGas', () => {
    it('should estimate gas for a simple transfer', async () => {
      const result = await estimateGas({
        to: validAddress,
        value: '0.1'
      });

      expect(result).toHaveProperty('estimatedGas');
      expect(result).toHaveProperty('gasPrice');
      expect(result).toHaveProperty('gasPriceGwei');
      expect(result).toHaveProperty('estimatedCostETH');
      expect(result).toHaveProperty('estimatedCostUSD');
      expect(result).toHaveProperty('confidence');

      expect(parseInt(result.estimatedGas)).toBeGreaterThan(0);
      expect(parseFloat(result.estimatedCostETH)).toBeGreaterThan(0);
    }, 30000);

    it('should estimate gas with custom from address', async () => {
      const result = await estimateGas({
        to: validAddress,
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        value: '0.1'
      });

      expect(result).toHaveProperty('estimatedGas');
      expect(parseInt(result.estimatedGas)).toBeGreaterThan(0);
    }, 30000);

    it('should throw validation error for invalid address', async () => {
      await expect(
        estimateGas({
          to: 'invalid-address',
          value: '0.1'
        })
      ).rejects.toThrow();
    });
  });

  describe('getGasPriceRecommendations', () => {
    it('should return price recommendations', async () => {
      const result = await getGasPriceRecommendations();

      expect(result).toHaveProperty('slow');
      expect(result).toHaveProperty('standard');
      expect(result).toHaveProperty('fast');

      expect(result.slow).toHaveProperty('gasPrice');
      expect(result.slow).toHaveProperty('gasPriceGwei');
      expect(result.slow).toHaveProperty('estimatedTime');

      expect(result.standard).toHaveProperty('gasPrice');
      expect(result.fast).toHaveProperty('gasPrice');

      // Verify ordering: slow < standard < fast
      const slowPrice = BigInt(result.slow.gasPrice);
      const standardPrice = BigInt(result.standard.gasPrice);
      const fastPrice = BigInt(result.fast.gasPrice);

      expect(slowPrice).toBeLessThan(standardPrice);
      expect(standardPrice).toBeLessThan(fastPrice);
    }, 30000);
  });

  describe('analyzeTransactionCost', () => {
    it('should provide comprehensive cost analysis', async () => {
      const result = await analyzeTransactionCost({
        to: validAddress,
        value: '0.1'
      });

      expect(result).toHaveProperty('gasEstimate');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('networkCongestion');
      expect(result).toHaveProperty('suggestedGasLimit');
      expect(result).toHaveProperty('breakdown');

      expect(['low', 'medium', 'high']).toContain(result.networkCongestion);
      expect(parseInt(result.suggestedGasLimit)).toBeGreaterThan(
        parseInt(result.gasEstimate.estimatedGas)
      );
    }, 30000);
  });

  describe('calculateOptimalGasPrice', () => {
    it('should calculate optimal gas price for low urgency', async () => {
      const result = await calculateOptimalGasPrice('low');

      expect(result).toHaveProperty('gasPrice');
      expect(result).toHaveProperty('gasPriceGwei');
      expect(result).toHaveProperty('estimatedTime');
      expect(result).toHaveProperty('confidence');

      expect(result.confidence).toBe(0.75);
    }, 30000);

    it('should calculate optimal gas price for medium urgency', async () => {
      const result = await calculateOptimalGasPrice('medium');

      expect(result.confidence).toBe(0.85);
    }, 30000);

    it('should calculate optimal gas price for high urgency', async () => {
      const result = await calculateOptimalGasPrice('high');

      expect(result.confidence).toBe(0.95);
    }, 30000);

    it('should have higher gas price for higher urgency', async () => {
      const low = await calculateOptimalGasPrice('low');
      const medium = await calculateOptimalGasPrice('medium');
      const high = await calculateOptimalGasPrice('high');

      const lowPrice = BigInt(low.gasPrice);
      const mediumPrice = BigInt(medium.gasPrice);
      const highPrice = BigInt(high.gasPrice);

      expect(lowPrice).toBeLessThan(mediumPrice);
      expect(mediumPrice).toBeLessThan(highPrice);
    }, 30000);
  });
});
