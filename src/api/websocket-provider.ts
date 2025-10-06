import { ethers } from 'ethers';
import { config } from '../config/index.js';

export interface BlockEvent {
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  transactions: number;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas?: string;
}

export interface LogEvent {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
  removed: boolean;
}

export interface PendingTransactionEvent {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  data: string;
}

export type BlockCallback = (block: BlockEvent) => void;
export type LogCallback = (log: LogEvent) => void;
export type PendingTxCallback = (tx: PendingTransactionEvent) => void;

class WebSocketProvider {
  private provider: ethers.WebSocketProvider | null = null;
  private blockListeners: Set<BlockCallback> = new Set();
  private logListeners: Map<string, Set<LogCallback>> = new Map();
  private pendingTxListeners: Set<PendingTxCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  async connect(): Promise<void> {
    if (this.provider) {
      return;
    }

    const wssEndpoint = config.rpc.websocket || 'wss://rpc.ankr.com/chiliz/ws';

    try {
      this.provider = new ethers.WebSocketProvider(wssEndpoint);
      this.reconnectAttempts = 0;

      if (config.debug) {
        console.log(`WebSocket connected to ${wssEndpoint}`);
      }

      // Setup reconnection on disconnect
      const ws = this.provider.websocket as any;
      if (ws.on) {
        ws.on('close', () => {
          this.handleDisconnect();
        });

        ws.on('error', (error: Error) => {
          if (config.debug) {
            console.error('WebSocket error:', error);
          }
        });
      }

    } catch (error) {
      throw new Error(`Failed to connect to WebSocket: ${error}`);
    }
  }

  private async handleDisconnect(): Promise<void> {
    if (config.debug) {
      console.log('WebSocket disconnected, attempting to reconnect...');
    }

    this.provider = null;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().catch(error => {
          if (config.debug) {
            console.error('Reconnection failed:', error);
          }
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      if (config.debug) {
        console.error('Max reconnection attempts reached');
      }
    }
  }

  async subscribeToNewBlocks(callback: BlockCallback): Promise<void> {
    await this.connect();

    if (!this.provider) {
      throw new Error('WebSocket provider not connected');
    }

    this.blockListeners.add(callback);

    // If this is the first listener, start the subscription
    if (this.blockListeners.size === 1) {
      this.provider.on('block', async (blockNumber: number) => {
        try {
          const block = await this.provider!.getBlock(blockNumber);
          if (!block) return;

          const blockEvent: BlockEvent = {
            blockNumber: block.number,
            blockHash: block.hash || '',
            timestamp: block.timestamp,
            transactions: block.transactions.length,
            gasUsed: block.gasUsed.toString(),
            gasLimit: block.gasLimit.toString(),
            baseFeePerGas: block.baseFeePerGas?.toString()
          };

          // Notify all listeners
          this.blockListeners.forEach(listener => {
            try {
              listener(blockEvent);
            } catch (error) {
              if (config.debug) {
                console.error('Error in block listener:', error);
              }
            }
          });
        } catch (error) {
          if (config.debug) {
            console.error('Error processing block:', error);
          }
        }
      });
    }
  }

  async subscribeToLogs(
    filter: { address?: string; topics?: string[] },
    callback: LogCallback
  ): Promise<void> {
    await this.connect();

    if (!this.provider) {
      throw new Error('WebSocket provider not connected');
    }

    const filterId = JSON.stringify(filter);

    if (!this.logListeners.has(filterId)) {
      this.logListeners.set(filterId, new Set());

      // Start listening for this filter
      this.provider.on(filter, (log: ethers.Log) => {
        const logEvent: LogEvent = {
          address: log.address,
          topics: [...log.topics],
          data: log.data,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          transactionIndex: log.transactionIndex,
          logIndex: log.index,
          removed: log.removed
        };

        const listeners = this.logListeners.get(filterId);
        if (listeners) {
          listeners.forEach(listener => {
            try {
              listener(logEvent);
            } catch (error) {
              if (config.debug) {
                console.error('Error in log listener:', error);
              }
            }
          });
        }
      });
    }

    this.logListeners.get(filterId)!.add(callback);
  }

  async subscribeToPendingTransactions(callback: PendingTxCallback): Promise<void> {
    await this.connect();

    if (!this.provider) {
      throw new Error('WebSocket provider not connected');
    }

    this.pendingTxListeners.add(callback);

    // If this is the first listener, start the subscription
    if (this.pendingTxListeners.size === 1) {
      this.provider.on('pending', async (txHash: string) => {
        try {
          const tx = await this.provider!.getTransaction(txHash);
          if (!tx) return;

          const pendingTxEvent: PendingTransactionEvent = {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
            gasPrice: tx.gasPrice?.toString() || '0',
            gasLimit: tx.gasLimit.toString(),
            nonce: tx.nonce,
            data: tx.data
          };

          // Notify all listeners
          this.pendingTxListeners.forEach(listener => {
            try {
              listener(pendingTxEvent);
            } catch (error) {
              if (config.debug) {
                console.error('Error in pending tx listener:', error);
              }
            }
          });
        } catch (error) {
          if (config.debug) {
            console.error('Error processing pending transaction:', error);
          }
        }
      });
    }
  }

  unsubscribeFromBlocks(callback: BlockCallback): void {
    this.blockListeners.delete(callback);

    if (this.blockListeners.size === 0 && this.provider) {
      this.provider.off('block');
    }
  }

  unsubscribeFromLogs(
    filter: { address?: string; topics?: string[] },
    callback: LogCallback
  ): void {
    const filterId = JSON.stringify(filter);
    const listeners = this.logListeners.get(filterId);

    if (listeners) {
      listeners.delete(callback);

      if (listeners.size === 0 && this.provider) {
        this.provider.off(filter);
        this.logListeners.delete(filterId);
      }
    }
  }

  unsubscribeFromPendingTransactions(callback: PendingTxCallback): void {
    this.pendingTxListeners.delete(callback);

    if (this.pendingTxListeners.size === 0 && this.provider) {
      this.provider.off('pending');
    }
  }

  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.destroy();
      this.provider = null;
      this.blockListeners.clear();
      this.logListeners.clear();
      this.pendingTxListeners.clear();

      if (config.debug) {
        console.log('WebSocket disconnected');
      }
    }
  }

  isConnected(): boolean {
    return this.provider !== null && this.provider.websocket.readyState === 1;
  }

  getProvider(): ethers.WebSocketProvider | null {
    return this.provider;
  }
}

// Singleton instance
export const websocketProvider = new WebSocketProvider();
