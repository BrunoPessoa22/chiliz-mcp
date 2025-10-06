import axios, { AxiosInstance } from 'axios';
import { APIError, RateLimitError, ValidationError } from '../errors/chiliz-error.js';
import { ErrorHandler } from '../errors/error-handler.js';

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  protocols: string[];
  priceImpact: number;
}

export interface SwapTransaction {
  from: string;
  to: string;
  data: string;
  value: string;
  gasPrice: string;
  gas: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface LiquiditySource {
  name: string;
  proportion: number;
}

/**
 * 1inch DEX Aggregator Client
 */
export class OneInchClient {
  private client: AxiosInstance;
  private chainId: number;
  private apiKey?: string;

  // 1inch API v5 base URL
  private static readonly BASE_URL = 'https://api.1inch.dev/swap/v5.2';

  // Chiliz Chain ID
  private static readonly CHILIZ_CHAIN_ID = 88888;

  constructor(apiKey?: string, chainId: number = OneInchClient.CHILIZ_CHAIN_ID) {
    this.apiKey = apiKey;
    this.chainId = chainId;

    this.client = axios.create({
      baseURL: `${OneInchClient.BASE_URL}/${this.chainId}`,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          throw new RateLimitError(
            '1inch API rate limit exceeded',
            retryAfter,
            { endpoint: error.config?.url }
          );
        }

        if (error.response?.status === 400) {
          throw new ValidationError(
            error.response.data?.description || 'Invalid request parameters',
            { endpoint: error.config?.url, params: error.config?.params }
          );
        }

        throw new APIError(
          error.response?.data?.description || error.message,
          error.response?.status || 502,
          { endpoint: error.config?.url }
        );
      }
    );
  }

  /**
   * Get swap quote
   */
  async getQuote(
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<SwapQuote> {
    return ErrorHandler.withRetry(
      async () => {
        const response = await this.client.get('/quote', {
          params: {
            src: fromToken,
            dst: toToken,
            amount,
            includeProtocols: true,
            includeGas: true
          }
        });

        const data = response.data;

        // Calculate price impact (simplified)
        const priceImpact = 0; // Would need more data for accurate calculation

        return {
          fromToken: data.fromToken.address,
          toToken: data.toToken.address,
          fromAmount: data.fromAmount,
          toAmount: data.toAmount,
          estimatedGas: data.estimatedGas,
          protocols: data.protocols?.flat().map((p: any) => p[0]?.name) || [],
          priceImpact
        };
      },
      { operation: 'oneinch_get_quote', timestamp: Date.now() }
    );
  }

  /**
   * Get swap transaction data
   */
  async getSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    fromAddress: string,
    slippage: number = 1,
    referrer?: string
  ): Promise<SwapTransaction> {
    return ErrorHandler.withRetry(
      async () => {
        const response = await this.client.get('/swap', {
          params: {
            src: fromToken,
            dst: toToken,
            amount,
            from: fromAddress,
            slippage,
            disableEstimate: false,
            allowPartialFill: false,
            ...(referrer && { referrer })
          }
        });

        const tx = response.data.tx;

        return {
          from: tx.from,
          to: tx.to,
          data: tx.data,
          value: tx.value,
          gasPrice: tx.gasPrice,
          gas: tx.gas
        };
      },
      { operation: 'oneinch_get_swap', timestamp: Date.now() }
    );
  }

  /**
   * Get supported tokens
   */
  async getTokens(): Promise<Record<string, TokenInfo>> {
    return ErrorHandler.withRetry(
      async () => {
        const response = await this.client.get('/tokens');
        return response.data.tokens;
      },
      { operation: 'oneinch_get_tokens', timestamp: Date.now() }
    );
  }

  /**
   * Get liquidity sources
   */
  async getLiquiditySources(): Promise<LiquiditySource[]> {
    return ErrorHandler.withRetry(
      async () => {
        const response = await this.client.get('/liquidity-sources');
        const protocols = response.data.protocols;

        return protocols.map((protocol: any) => ({
          name: protocol.id,
          proportion: 0 // Would need actual liquidity data
        }));
      },
      { operation: 'oneinch_get_liquidity_sources', timestamp: Date.now() }
    );
  }

  /**
   * Get spender address (for token approval)
   */
  async getSpenderAddress(): Promise<string> {
    return ErrorHandler.withRetry(
      async () => {
        const response = await this.client.get('/approve/spender');
        return response.data.address;
      },
      { operation: 'oneinch_get_spender', timestamp: Date.now() }
    );
  }

  /**
   * Get approve transaction data
   */
  async getApproveTransaction(
    tokenAddress: string,
    amount?: string
  ): Promise<SwapTransaction> {
    return ErrorHandler.withRetry(
      async () => {
        const response = await this.client.get('/approve/transaction', {
          params: {
            tokenAddress,
            ...(amount && { amount })
          }
        });

        const tx = response.data;

        return {
          from: '',
          to: tx.to,
          data: tx.data,
          value: tx.value || '0',
          gasPrice: tx.gasPrice || '0',
          gas: tx.gas || '100000'
        };
      },
      { operation: 'oneinch_get_approve', timestamp: Date.now() }
    );
  }

  /**
   * Find best route for swap
   */
  async findBestRoute(
    fromToken: string,
    toToken: string,
    amount: string,
    options: {
      maxSplits?: number;
      slippage?: number;
      excludeProtocols?: string[];
    } = {}
  ): Promise<{
    quote: SwapQuote;
    route: LiquiditySource[];
  }> {
    return ErrorHandler.withRetry(
      async () => {
        const params: any = {
          src: fromToken,
          dst: toToken,
          amount,
          includeProtocols: true,
          includeGas: true
        };

        if (options.maxSplits) {
          params.complexityLevel = options.maxSplits;
        }

        if (options.excludeProtocols?.length) {
          params.excludeProtocols = options.excludeProtocols.join(',');
        }

        const response = await this.client.get('/quote', { params });
        const data = response.data;

        // Parse protocols
        const route: LiquiditySource[] = [];
        if (data.protocols) {
          const protocolsList = data.protocols.flat();
          const totalParts = protocolsList.reduce((sum: number, p: any) => sum + (p[0]?.part || 0), 0);

          for (const protocol of protocolsList) {
            if (protocol[0]) {
              route.push({
                name: protocol[0].name,
                proportion: (protocol[0].part || 0) / totalParts
              });
            }
          }
        }

        const priceImpact = 0; // Simplified - would need market data for accurate calculation

        const quote: SwapQuote = {
          fromToken: data.fromToken.address,
          toToken: data.toToken.address,
          fromAmount: data.fromAmount,
          toAmount: data.toAmount,
          estimatedGas: data.estimatedGas,
          protocols: route.map(r => r.name),
          priceImpact
        };

        return { quote, route };
      },
      { operation: 'oneinch_find_best_route', timestamp: Date.now() }
    );
  }

  /**
   * Check if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/healthcheck', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get chain ID
   */
  getChainId(): number {
    return this.chainId;
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }
}
