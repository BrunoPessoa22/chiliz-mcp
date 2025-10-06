import { websocketProvider, BlockEvent, LogEvent, PendingTransactionEvent } from '../api/websocket-provider.js';
import { config } from '../config/index.js';

// Store for recent events (in-memory storage for MCP server)
const recentBlocks: BlockEvent[] = [];
const recentLogs: Map<string, LogEvent[]> = new Map();
const recentPendingTxs: PendingTransactionEvent[] = [];

const MAX_STORED_BLOCKS = 100;
const MAX_STORED_LOGS = 500;
const MAX_STORED_PENDING = 200;

/**
 * Start monitoring new blocks on Chiliz Chain
 */
export async function startBlockMonitoring(params: {
  storeHistory?: boolean;
}): Promise<{ status: string; message: string }> {
  try {
    const storeHistory = params.storeHistory !== false;

    await websocketProvider.subscribeToNewBlocks((block: BlockEvent) => {
      if (config.debug) {
        console.log(`New block: ${block.blockNumber} with ${block.transactions} transactions`);
      }

      if (storeHistory) {
        recentBlocks.unshift(block);
        if (recentBlocks.length > MAX_STORED_BLOCKS) {
          recentBlocks.pop();
        }
      }
    });

    return {
      status: 'success',
      message: `Block monitoring started. ${storeHistory ? `Storing last ${MAX_STORED_BLOCKS} blocks.` : 'History disabled.'}`
    };
  } catch (error) {
    throw new Error(`Failed to start block monitoring: ${error}`);
  }
}

/**
 * Start monitoring contract events/logs
 */
export async function startLogMonitoring(params: {
  address?: string;
  topics?: string[];
  storeHistory?: boolean;
}): Promise<{ status: string; message: string; filterId: string }> {
  try {
    const { address, topics, storeHistory = true } = params;
    const filter = { address, topics };
    const filterId = JSON.stringify(filter);

    if (!recentLogs.has(filterId)) {
      recentLogs.set(filterId, []);
    }

    await websocketProvider.subscribeToLogs(filter, (log: LogEvent) => {
      if (config.debug) {
        console.log(`New log from ${log.address} in block ${log.blockNumber}`);
      }

      if (storeHistory) {
        const logs = recentLogs.get(filterId) || [];
        logs.unshift(log);
        if (logs.length > MAX_STORED_LOGS) {
          logs.pop();
        }
        recentLogs.set(filterId, logs);
      }
    });

    return {
      status: 'success',
      message: `Log monitoring started for ${address || 'all contracts'}`,
      filterId
    };
  } catch (error) {
    throw new Error(`Failed to start log monitoring: ${error}`);
  }
}

/**
 * Start monitoring pending transactions
 */
export async function startPendingTxMonitoring(params: {
  storeHistory?: boolean;
  filterLargeTransactions?: boolean;
  minValueETH?: number;
}): Promise<{ status: string; message: string }> {
  try {
    const { storeHistory = true, filterLargeTransactions = false, minValueETH = 0 } = params;

    await websocketProvider.subscribeToPendingTransactions((tx: PendingTransactionEvent) => {
      // Filter large transactions if requested
      if (filterLargeTransactions && minValueETH > 0) {
        const valueCHZ = parseFloat(tx.value) / 1e18;
        if (valueCHZ < minValueETH) {
          return; // Skip small transactions
        }
      }

      if (config.debug) {
        const valueCHZ = (parseFloat(tx.value) / 1e18).toFixed(4);
        console.log(`Pending tx: ${tx.hash} - ${valueCHZ} CHZ from ${tx.from}`);
      }

      if (storeHistory) {
        recentPendingTxs.unshift(tx);
        if (recentPendingTxs.length > MAX_STORED_PENDING) {
          recentPendingTxs.pop();
        }
      }
    });

    const filterMsg = filterLargeTransactions ? ` (filtering transactions >= ${minValueETH} CHZ)` : '';
    return {
      status: 'success',
      message: `Pending transaction monitoring started${filterMsg}`
    };
  } catch (error) {
    throw new Error(`Failed to start pending tx monitoring: ${error}`);
  }
}

/**
 * Get recent blocks from the monitoring history
 */
export async function getRecentBlocks(params: {
  limit?: number;
}): Promise<{ blocks: BlockEvent[]; count: number }> {
  const limit = params.limit || 10;

  return {
    blocks: recentBlocks.slice(0, limit),
    count: recentBlocks.length
  };
}

/**
 * Get recent logs from the monitoring history
 */
export async function getRecentLogs(params: {
  filterId?: string;
  address?: string;
  limit?: number;
}): Promise<{ logs: LogEvent[]; count: number; filterId?: string }> {
  const limit = params.limit || 50;

  if (params.filterId) {
    const logs = recentLogs.get(params.filterId) || [];
    return {
      logs: logs.slice(0, limit),
      count: logs.length,
      filterId: params.filterId
    };
  }

  if (params.address) {
    const filter = { address: params.address };
    const filterId = JSON.stringify(filter);
    const logs = recentLogs.get(filterId) || [];
    return {
      logs: logs.slice(0, limit),
      count: logs.length,
      filterId
    };
  }

  // Return all logs from all filters
  const allLogs: LogEvent[] = [];
  recentLogs.forEach(logs => {
    allLogs.push(...logs);
  });

  // Sort by block number descending
  allLogs.sort((a, b) => b.blockNumber - a.blockNumber);

  return {
    logs: allLogs.slice(0, limit),
    count: allLogs.length
  };
}

/**
 * Get recent pending transactions from the monitoring history
 */
export async function getRecentPendingTransactions(params: {
  limit?: number;
  minValueETH?: number;
}): Promise<{ transactions: PendingTransactionEvent[]; count: number }> {
  const limit = params.limit || 20;
  let txs = recentPendingTxs;

  // Filter by minimum value if specified
  if (params.minValueETH && params.minValueETH > 0) {
    txs = txs.filter(tx => {
      const valueCHZ = parseFloat(tx.value) / 1e18;
      return valueCHZ >= params.minValueETH!;
    });
  }

  return {
    transactions: txs.slice(0, limit),
    count: txs.length
  };
}

/**
 * Stop all WebSocket monitoring
 */
export async function stopAllMonitoring(): Promise<{ status: string; message: string }> {
  try {
    await websocketProvider.disconnect();

    // Clear stored data
    recentBlocks.length = 0;
    recentLogs.clear();
    recentPendingTxs.length = 0;

    return {
      status: 'success',
      message: 'All WebSocket monitoring stopped and history cleared'
    };
  } catch (error) {
    throw new Error(`Failed to stop monitoring: ${error}`);
  }
}

/**
 * Get WebSocket connection status
 */
export async function getWebSocketStatus(): Promise<{
  connected: boolean;
  activeSubscriptions: {
    blocks: number;
    logs: number;
    pendingTxs: number;
  };
  storedEvents: {
    blocks: number;
    logs: number;
    pendingTxs: number;
  };
}> {
  const totalLogs = Array.from(recentLogs.values()).reduce((sum, logs) => sum + logs.length, 0);

  return {
    connected: websocketProvider.isConnected(),
    activeSubscriptions: {
      blocks: recentBlocks.length > 0 ? 1 : 0,
      logs: recentLogs.size,
      pendingTxs: recentPendingTxs.length > 0 ? 1 : 0
    },
    storedEvents: {
      blocks: recentBlocks.length,
      logs: totalLogs,
      pendingTxs: recentPendingTxs.length
    }
  };
}

/**
 * Monitor fan token transfers in real-time
 */
export async function monitorFanTokenTransfers(params: {
  tokenAddress: string;
  tokenSymbol?: string;
}): Promise<{ status: string; message: string; filterId: string }> {
  try {
    const { tokenAddress, tokenSymbol } = params;

    // ERC-20 Transfer event signature: Transfer(address,address,uint256)
    const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

    const filter = {
      address: tokenAddress,
      topics: [transferTopic]
    };

    const filterId = JSON.stringify(filter);

    if (!recentLogs.has(filterId)) {
      recentLogs.set(filterId, []);
    }

    await websocketProvider.subscribeToLogs(filter, (log: LogEvent) => {
      if (config.debug) {
        const symbol = tokenSymbol || tokenAddress;
        console.log(`${symbol} transfer detected in tx ${log.transactionHash}`);
      }

      const logs = recentLogs.get(filterId) || [];
      logs.unshift(log);
      if (logs.length > MAX_STORED_LOGS) {
        logs.pop();
      }
      recentLogs.set(filterId, logs);
    });

    const symbol = tokenSymbol || tokenAddress;
    return {
      status: 'success',
      message: `Now monitoring ${symbol} transfers in real-time`,
      filterId
    };
  } catch (error) {
    throw new Error(`Failed to monitor fan token transfers: ${error}`);
  }
}
