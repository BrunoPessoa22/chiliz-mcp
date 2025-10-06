import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import { CoinGeckoClient } from '../api/coingecko.js';
import { FAN_TOKENS } from '../types/index.js';
import { WebSocketError } from '../errors/chiliz-error.js';
import { ErrorHandler } from '../errors/error-handler.js';

export interface PriceUpdate {
  symbol: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  timestamp: number;
  volume24h?: number;
  marketCap?: number;
}

export interface WhaleAlert {
  symbol: string;
  type: 'transfer' | 'swap';
  from: string;
  to: string;
  amount: number;
  amountUSD: number;
  txHash: string;
  timestamp: number;
  blockNumber: number;
}

export interface DEXActivity {
  pool: string;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity';
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: number;
  amountOut?: number;
  valueUSD: number;
  txHash: string;
  timestamp: number;
  user: string;
}

export interface StreamConfig {
  priceUpdateInterval?: number; // ms
  whaleThresholdUSD?: number;
  enableWhaleAlerts?: boolean;
  enableDEXActivity?: boolean;
  tokens?: string[];
}

/**
 * Real-time price and activity streaming
 */
export class PriceStream extends EventEmitter {
  private wsProvider: ethers.WebSocketProvider | null = null;
  private coingeckoClient: CoinGeckoClient;
  private isStreaming: boolean = false;
  private priceCache: Map<string, number> = new Map();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private config: Required<StreamConfig>;

  constructor(
    private rpcWsUrl: string,
    config: StreamConfig = {}
  ) {
    super();
    this.coingeckoClient = new CoinGeckoClient();
    this.config = {
      priceUpdateInterval: config.priceUpdateInterval || 30000, // 30 seconds
      whaleThresholdUSD: config.whaleThresholdUSD || 50000,
      enableWhaleAlerts: config.enableWhaleAlerts ?? true,
      enableDEXActivity: config.enableDEXActivity ?? true,
      tokens: config.tokens || FAN_TOKENS.map(t => t.symbol)
    };
  }

  /**
   * Start streaming
   */
  async start(): Promise<void> {
    if (this.isStreaming) {
      throw new Error('Price stream is already running');
    }

    try {
      await this.connect();
      this.startPriceUpdates();

      if (this.config.enableWhaleAlerts) {
        this.startWhaleAlerts();
      }

      if (this.config.enableDEXActivity) {
        this.startDEXActivityMonitoring();
      }

      this.isStreaming = true;
      this.emit('started');
    } catch (error) {
      throw new WebSocketError('Failed to start price stream: ' + (error as Error).message);
    }
  }

  /**
   * Stop streaming
   */
  async stop(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    this.isStreaming = false;

    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }

    if (this.wsProvider) {
      await this.wsProvider.removeAllListeners();
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }

    this.emit('stopped');
  }

  /**
   * Get current price for a token
   */
  getCurrentPrice(symbol: string): number | undefined {
    return this.priceCache.get(symbol.toUpperCase());
  }

  /**
   * Get all current prices
   */
  getAllPrices(): Map<string, number> {
    return new Map(this.priceCache);
  }

  /**
   * Check if streaming is active
   */
  isActive(): boolean {
    return this.isStreaming;
  }

  /**
   * Connect to WebSocket provider
   */
  private async connect(): Promise<void> {
    try {
      this.wsProvider = new ethers.WebSocketProvider(this.rpcWsUrl);

      // Set up reconnection logic
      this.wsProvider.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', new WebSocketError('WebSocket connection error'));
        this.handleReconnect();
      });

      this.wsProvider.on('close', () => {
        console.warn('WebSocket connection closed');
        if (this.isStreaming) {
          this.handleReconnect();
        }
      });

      this.reconnectAttempts = 0;
      this.emit('connected');
    } catch (error) {
      throw new WebSocketError('Failed to connect to WebSocket: ' + (error as Error).message);
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new WebSocketError('Max reconnection attempts reached'));
      await this.stop();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect();

      // Restart monitoring
      if (this.config.enableWhaleAlerts) {
        this.startWhaleAlerts();
      }
      if (this.config.enableDEXActivity) {
        this.startDEXActivityMonitoring();
      }

      this.emit('reconnected');
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.handleReconnect();
    }
  }

  /**
   * Start price updates
   */
  private startPriceUpdates(): void {
    const updatePrices = async () => {
      await ErrorHandler.withRetry(
        async () => {
          for (const symbol of this.config.tokens) {
            const token = FAN_TOKENS.find(t => t.symbol === symbol);
            if (!token?.coingeckoId) continue;

            try {
              const priceData = await this.coingeckoClient.getPrice(token.coingeckoId);
              if (!priceData) continue;

              const currentPrice = priceData.currentPrice;
              const previousPrice = this.priceCache.get(symbol) || currentPrice;
              const change = currentPrice - previousPrice;
              const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

              this.priceCache.set(symbol, currentPrice);

              const update: PriceUpdate = {
                symbol,
                price: currentPrice,
                previousPrice,
                change,
                changePercent,
                timestamp: Date.now(),
                volume24h: 0, // Not available in current API
                marketCap: 0   // Not available in current API
              };

              this.emit('price', update);

              // Emit significant price changes
              if (Math.abs(changePercent) >= 5) {
                this.emit('price_alert', {
                  ...update,
                  alertType: changePercent > 0 ? 'spike' : 'drop'
                });
              }
            } catch (error) {
              console.warn(`Failed to fetch price for ${symbol}:`, error);
            }
          }
        },
        { operation: 'price_update', timestamp: Date.now() }
      );
    };

    // Initial update
    updatePrices();

    // Set up interval
    this.priceUpdateInterval = setInterval(updatePrices, this.config.priceUpdateInterval);
  }

  /**
   * Start whale alerts
   */
  private startWhaleAlerts(): void {
    if (!this.wsProvider) return;

    const transferTopic = ethers.id('Transfer(address,address,uint256)');

    for (const symbol of this.config.tokens) {
      const token = FAN_TOKENS.find(t => t.symbol === symbol);
      if (!token?.address) continue;

      const filter = {
        address: token.address,
        topics: [transferTopic]
      };

      this.wsProvider.on(filter, async (log: ethers.Log) => {
        try {
          const from = ethers.getAddress('0x' + log.topics[1].slice(26));
          const to = ethers.getAddress('0x' + log.topics[2].slice(26));
          const amount = BigInt(log.data);
          const amountFormatted = parseFloat(ethers.formatUnits(amount, 18));

          // Get current price
          const price = this.priceCache.get(symbol) || 0;
          const amountUSD = amountFormatted * price;

          // Check if it's a whale transaction
          if (amountUSD >= this.config.whaleThresholdUSD) {
            const alert: WhaleAlert = {
              symbol,
              type: 'transfer',
              from,
              to,
              amount: amountFormatted,
              amountUSD,
              txHash: log.transactionHash,
              timestamp: Date.now(),
              blockNumber: log.blockNumber
            };

            this.emit('whale_alert', alert);
          }
        } catch (error) {
          console.error('Error processing whale alert:', error);
        }
      });
    }
  }

  /**
   * Start DEX activity monitoring
   */
  private startDEXActivityMonitoring(): void {
    if (!this.wsProvider) return;

    // Monitor Uniswap V2/V3 style Swap events
    const swapTopic = ethers.id('Swap(address,uint256,uint256,uint256,uint256,address)');

    this.wsProvider.on({ topics: [swapTopic] }, async (log: ethers.Log) => {
      try {
        // Parse swap event (this is a simplified version)
        const activity: DEXActivity = {
          pool: log.address,
          type: 'swap',
          valueUSD: 0, // Would need to calculate based on reserves
          txHash: log.transactionHash,
          timestamp: Date.now(),
          user: ethers.getAddress('0x' + log.topics[1].slice(26))
        };

        this.emit('dex_activity', activity);
      } catch (error) {
        console.error('Error processing DEX activity:', error);
      }
    });
  }
}
