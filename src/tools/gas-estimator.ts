import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { ErrorHandler } from '../errors/error-handler.js';
import { NetworkError, ValidationError } from '../errors/chiliz-error.js';

export interface GasEstimate {
  estimatedGas: string;
  gasPrice: string;
  gasPriceGwei: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCostETH: string;
  estimatedCostUSD: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface GasPriceRecommendation {
  slow: {
    gasPrice: string;
    gasPriceGwei: string;
    estimatedTime: string;
  };
  standard: {
    gasPrice: string;
    gasPriceGwei: string;
    estimatedTime: string;
  };
  fast: {
    gasPrice: string;
    gasPriceGwei: string;
    estimatedTime: string;
  };
}

export interface TransactionCostAnalysis {
  gasEstimate: GasEstimate;
  recommendations: GasPriceRecommendation;
  networkCongestion: 'low' | 'medium' | 'high';
  suggestedGasLimit: string;
  breakdown: {
    baseFee?: string;
    priorityFee?: string;
    total: string;
  };
}

/**
 * Advanced gas estimation and cost analysis
 */
export async function estimateGas(params: {
  to: string;
  from?: string;
  value?: string;
  data?: string;
  chzPriceUSD?: number;
}): Promise<GasEstimate> {
  return ErrorHandler.withRetry(
    async () => {
      const provider = new ethers.JsonRpcProvider(config.rpc.url);

      // Validate addresses
      if (!ethers.isAddress(params.to)) {
        throw new ValidationError('Invalid "to" address', { address: params.to });
      }

      if (params.from && !ethers.isAddress(params.from)) {
        throw new ValidationError('Invalid "from" address', { address: params.from });
      }

      // Prepare transaction object
      const tx: ethers.TransactionRequest = {
        to: params.to,
        from: params.from,
        value: params.value ? ethers.parseEther(params.value) : 0n,
        data: params.data || '0x'
      };

      // Estimate gas
      let estimatedGas: bigint;
      try {
        estimatedGas = await provider.estimateGas(tx);
      } catch (error: any) {
        throw new NetworkError(
          `Gas estimation failed: ${error.message}`,
          { transaction: tx }
        );
      }

      // Get fee data
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 1000000000n; // 1 gwei fallback

      // Calculate cost
      const estimatedCostWei = estimatedGas * gasPrice;
      const estimatedCostETH = ethers.formatEther(estimatedCostWei);

      // Calculate USD cost (using CHZ price)
      const chzPrice = params.chzPriceUSD || 0.08; // Default CHZ price
      const estimatedCostUSD = parseFloat(estimatedCostETH) * chzPrice;

      // Determine confidence based on gas price volatility
      let confidence: 'low' | 'medium' | 'high' = 'medium';
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        const volatility = Number(feeData.maxFeePerGas - feeData.maxPriorityFeePerGas);
        if (volatility < 1000000000) confidence = 'high';
        else if (volatility > 5000000000) confidence = 'low';
      }

      return {
        estimatedGas: estimatedGas.toString(),
        gasPrice: gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        estimatedCostETH,
        estimatedCostUSD,
        confidence
      };
    },
    { operation: 'estimate_gas', timestamp: Date.now() }
  );
}

/**
 * Get gas price recommendations
 */
export async function getGasPriceRecommendations(): Promise<GasPriceRecommendation> {
  return ErrorHandler.withRetry(
    async () => {
      const provider = new ethers.JsonRpcProvider(config.rpc.url);
      const feeData = await provider.getFeeData();

      const baseGasPrice = feeData.gasPrice || 1000000000n; // 1 gwei fallback

      // Create recommendations (slow, standard, fast)
      const slowGasPrice = (baseGasPrice * 80n) / 100n; // 80% of base
      const standardGasPrice = baseGasPrice; // Base price
      const fastGasPrice = (baseGasPrice * 120n) / 100n; // 120% of base

      return {
        slow: {
          gasPrice: slowGasPrice.toString(),
          gasPriceGwei: ethers.formatUnits(slowGasPrice, 'gwei'),
          estimatedTime: '~60 seconds'
        },
        standard: {
          gasPrice: standardGasPrice.toString(),
          gasPriceGwei: ethers.formatUnits(standardGasPrice, 'gwei'),
          estimatedTime: '~30 seconds'
        },
        fast: {
          gasPrice: fastGasPrice.toString(),
          gasPriceGwei: ethers.formatUnits(fastGasPrice, 'gwei'),
          estimatedTime: '~15 seconds'
        }
      };
    },
    { operation: 'get_gas_recommendations', timestamp: Date.now() }
  );
}

/**
 * Analyze transaction cost
 */
export async function analyzeTransactionCost(params: {
  to: string;
  from?: string;
  value?: string;
  data?: string;
  chzPriceUSD?: number;
}): Promise<TransactionCostAnalysis> {
  return ErrorHandler.withRetry(
    async () => {
      const provider = new ethers.JsonRpcProvider(config.rpc.url);

      // Get gas estimate
      const gasEstimate = await estimateGas(params);

      // Get recommendations
      const recommendations = await getGasPriceRecommendations();

      // Get recent blocks to assess congestion
      const blockNumber = await provider.getBlockNumber();
      const recentBlocks = await Promise.all([
        provider.getBlock(blockNumber),
        provider.getBlock(blockNumber - 1),
        provider.getBlock(blockNumber - 2)
      ]);

      // Calculate average gas usage
      const avgGasUsed = recentBlocks.reduce((sum, block) => {
        return sum + Number(block?.gasUsed || 0n);
      }, 0) / recentBlocks.length;

      const avgGasLimit = recentBlocks.reduce((sum, block) => {
        return sum + Number(block?.gasLimit || 0n);
      }, 0) / recentBlocks.length;

      const utilizationRate = avgGasUsed / avgGasLimit;

      // Determine congestion level
      let networkCongestion: 'low' | 'medium' | 'high';
      if (utilizationRate < 0.5) networkCongestion = 'low';
      else if (utilizationRate < 0.8) networkCongestion = 'medium';
      else networkCongestion = 'high';

      // Calculate suggested gas limit (add 20% buffer)
      const estimatedGasBigInt = BigInt(gasEstimate.estimatedGas);
      const suggestedGasLimit = ((estimatedGasBigInt * 120n) / 100n).toString();

      // Breakdown
      const feeData = await provider.getFeeData();
      const breakdown = {
        baseFee: feeData.gasPrice?.toString(),
        priorityFee: feeData.maxPriorityFeePerGas?.toString(),
        total: gasEstimate.gasPrice
      };

      return {
        gasEstimate,
        recommendations,
        networkCongestion,
        suggestedGasLimit,
        breakdown
      };
    },
    { operation: 'analyze_transaction_cost', timestamp: Date.now() }
  );
}

/**
 * Calculate optimal gas price based on urgency
 */
export async function calculateOptimalGasPrice(urgency: 'low' | 'medium' | 'high'): Promise<{
  gasPrice: string;
  gasPriceGwei: string;
  estimatedTime: string;
  confidence: number;
}> {
  return ErrorHandler.withRetry(
    async () => {
      const recommendations = await getGasPriceRecommendations();

      let selected;
      switch (urgency) {
        case 'low':
          selected = recommendations.slow;
          break;
        case 'high':
          selected = recommendations.fast;
          break;
        default:
          selected = recommendations.standard;
      }

      return {
        gasPrice: selected.gasPrice,
        gasPriceGwei: selected.gasPriceGwei,
        estimatedTime: selected.estimatedTime,
        confidence: urgency === 'high' ? 0.95 : urgency === 'medium' ? 0.85 : 0.75
      };
    },
    { operation: 'calculate_optimal_gas', timestamp: Date.now() }
  );
}
