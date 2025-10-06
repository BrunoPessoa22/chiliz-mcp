// Vercel Serverless Function for Chiliz MCP Sandbox
// Rate-limited, read-only tool execution

import { ethers } from 'ethers';

// Simple in-memory rate limiter (for production, use Vercel KV or Redis)
const rateLimits = new Map();
const RATE_LIMIT = 10; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

// Chiliz RPC endpoint
const CHILIZ_RPC = 'https://rpc.ankr.com/chiliz';
const provider = new ethers.JsonRpcProvider(CHILIZ_RPC);

// Whitelist of safe read-only tools
const SAFE_TOOLS = {
  // Price Tools
  get_token_price: {
    description: 'Get current price and market data for a fan token',
    category: 'Prices',
    params: ['symbol'],
    handler: getTokenPrice
  },
  get_multiple_prices: {
    description: 'Compare prices of multiple fan tokens at once',
    category: 'Prices',
    params: ['symbols'],
    handler: getMultiplePrices
  },
  get_market_overview: {
    description: 'Get market overview with top fan tokens by market cap',
    category: 'Prices',
    params: ['limit'],
    handler: getMarketOverview
  },
  get_price_history: {
    description: 'Get historical price data for a token (7 days)',
    category: 'Prices',
    params: ['symbol'],
    handler: getPriceHistory
  },

  // Wallet Tools
  get_wallet_balance: {
    description: 'Get CHZ balance for any wallet address',
    category: 'Wallet',
    params: ['address'],
    handler: getWalletBalance
  },
  get_transaction: {
    description: 'Get details of a specific transaction by hash',
    category: 'Wallet',
    params: ['txHash'],
    handler: getTransaction
  },

  // Blockchain Tools
  get_blockchain_info: {
    description: 'Get current Chiliz blockchain information',
    category: 'Blockchain',
    params: [],
    handler: getBlockchainInfo
  },
  get_block: {
    description: 'Get detailed information about a specific block',
    category: 'Blockchain',
    params: ['blockNumber'],
    handler: getBlock
  },

  // Analytics Tools
  detect_whale_trades: {
    description: 'Detect large transactions (whale trades)',
    category: 'Analytics',
    params: ['minValueUSD', 'blockRange'],
    handler: detectWhaleTrades
  },
  get_fan_tokens_list: {
    description: 'Get list of all supported fan tokens with metadata',
    category: 'Analytics',
    params: [],
    handler: getFanTokensList
  }
};

// Rate limiting check
function checkRateLimit(ip) {
  const now = Date.now();
  const userLimit = rateLimits.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };

  if (now > userLimit.resetAt) {
    // Reset window
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + RATE_WINDOW };
  }

  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: userLimit.resetAt };
  }

  userLimit.count++;
  rateLimits.set(ip, userLimit);
  return { allowed: true, remaining: RATE_LIMIT - userLimit.count, resetAt: userLimit.resetAt };
}

// Tool Handlers

async function getTokenPrice({ symbol }) {
  // Use CoinGecko API for real price data
  const coinGeckoIds = {
    'CHZ': 'chiliz',
    'PSG': 'paris-saint-germain-fan-token',
    'BAR': 'fc-barcelona-fan-token',
    'JUV': 'juventus-fan-token',
    'CITY': 'manchester-city-fan-token',
    'MENGO': 'flamengo-fan-token',
    'SCCP': 'sport-club-corinthians-paulista-fan-token',
    'ACM': 'ac-milan-fan-token'
  };

  const coinId = coinGeckoIds[symbol.toUpperCase()];
  if (!coinId) {
    throw new Error(`Token ${symbol} not found. Available: ${Object.keys(coinGeckoIds).join(', ')}`);
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch price data from CoinGecko');
  }

  const data = await response.json();
  const priceData = data[coinId];

  return {
    symbol: symbol.toUpperCase(),
    name: coinId,
    currentPrice: priceData.usd,
    priceChange24h: priceData.usd_24h_change || 0,
    volume24h: priceData.usd_24h_vol || 0,
    marketCap: priceData.usd_market_cap || 0,
    lastUpdated: new Date().toISOString()
  };
}

async function getWalletBalance({ address }) {
  if (!ethers.isAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }

  const balance = await provider.getBalance(address);
  const balanceFormatted = ethers.formatEther(balance);

  return {
    address,
    chzBalance: balance.toString(),
    chzBalanceFormatted: parseFloat(balanceFormatted),
    network: 'Chiliz Mainnet',
    timestamp: new Date().toISOString()
  };
}

async function getBlockchainInfo() {
  const [blockNumber, gasPrice, network] = await Promise.all([
    provider.getBlockNumber(),
    provider.getFeeData(),
    provider.getNetwork()
  ]);

  const block = await provider.getBlock(blockNumber);

  return {
    chainId: Number(network.chainId),
    chainName: 'Chiliz Chain',
    blockHeight: blockNumber,
    blockTime: block ? block.timestamp : null,
    gasPrice: gasPrice.gasPrice ? gasPrice.gasPrice.toString() : '0',
    gasPriceGwei: gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : '0',
    networkStatus: 'healthy',
    lastUpdate: new Date().toISOString()
  };
}

async function detectWhaleTrades({ minValueUSD = 100000, blockRange = 100 }) {
  const currentBlock = await provider.getBlockNumber();
  const startBlock = currentBlock - parseInt(blockRange);

  // This is a simplified implementation
  // In production, you'd use The Graph or an indexer
  const largeTxs = [];

  // Sample the last few blocks for demo purposes
  const sampleSize = Math.min(5, blockRange);
  for (let i = 0; i < sampleSize; i++) {
    const blockNum = currentBlock - i;
    const block = await provider.getBlock(blockNum, true);

    if (block && block.transactions) {
      for (const tx of block.transactions.slice(0, 10)) { // Limit to 10 txs per block
        if (typeof tx === 'object' && tx.value) {
          const valueEth = parseFloat(ethers.formatEther(tx.value));
          // Assume CHZ price ~$0.10 for demo (in production, fetch real price)
          const valueUSD = valueEth * 0.10;

          if (valueUSD >= minValueUSD) {
            largeTxs.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value.toString(),
              valueFormatted: valueEth,
              estimatedUSD: valueUSD,
              blockNumber: blockNum,
              timestamp: block.timestamp
            });
          }
        }
      }
    }
  }

  return {
    totalFound: largeTxs.length,
    blockRange: `${startBlock} - ${currentBlock}`,
    minValueUSD,
    transactions: largeTxs,
    note: `Scanned ${sampleSize} most recent blocks for demo. Production version would use The Graph indexer.`
  };
}

async function getMultiplePrices({ symbols }) {
  if (!symbols || !Array.isArray(symbols)) {
    throw new Error('symbols must be an array of token symbols');
  }

  const coinGeckoIds = {
    'CHZ': 'chiliz',
    'PSG': 'paris-saint-germain-fan-token',
    'BAR': 'fc-barcelona-fan-token',
    'JUV': 'juventus-fan-token',
    'CITY': 'manchester-city-fan-token',
    'MENGO': 'flamengo-fan-token',
    'SCCP': 'sport-club-corinthians-paulista-fan-token',
    'ACM': 'ac-milan-fan-token',
    'INTER': 'inter-milan-fan-token',
    'ATM': 'atletico-madrid-fan-token'
  };

  const ids = symbols.map(s => coinGeckoIds[s.toUpperCase()]).filter(Boolean);

  if (ids.length === 0) {
    throw new Error(`No valid tokens found. Available: ${Object.keys(coinGeckoIds).join(', ')}`);
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch price data from CoinGecko');
  }

  const data = await response.json();

  return {
    tokens: symbols.map(symbol => {
      const id = coinGeckoIds[symbol.toUpperCase()];
      const priceData = data[id];

      if (!priceData) {
        return { symbol: symbol.toUpperCase(), error: 'Not found' };
      }

      return {
        symbol: symbol.toUpperCase(),
        currentPrice: priceData.usd,
        priceChange24h: priceData.usd_24h_change || 0,
        volume24h: priceData.usd_24h_vol || 0,
        marketCap: priceData.usd_market_cap || 0
      };
    }),
    lastUpdated: new Date().toISOString()
  };
}

async function getMarketOverview({ limit = 10 }) {
  const topTokens = ['CHZ', 'PSG', 'BAR', 'JUV', 'CITY', 'ACM', 'MENGO', 'INTER', 'SCCP', 'ATM'];
  const tokensToFetch = topTokens.slice(0, parseInt(limit));

  const result = await getMultiplePrices({ symbols: tokensToFetch });

  // Sort by market cap
  const sorted = result.tokens
    .filter(t => !t.error)
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

  return {
    totalMarketCap: sorted.reduce((sum, t) => sum + (t.marketCap || 0), 0),
    total24hVolume: sorted.reduce((sum, t) => sum + (t.volume24h || 0), 0),
    topTokens: sorted,
    lastUpdated: new Date().toISOString()
  };
}

async function getPriceHistory({ symbol }) {
  const coinGeckoIds = {
    'CHZ': 'chiliz',
    'PSG': 'paris-saint-germain-fan-token',
    'BAR': 'fc-barcelona-fan-token',
    'JUV': 'juventus-fan-token',
    'CITY': 'manchester-city-fan-token',
    'MENGO': 'flamengo-fan-token',
    'SCCP': 'sport-club-corinthians-paulista-fan-token',
    'ACM': 'ac-milan-fan-token'
  };

  const coinId = coinGeckoIds[symbol.toUpperCase()];
  if (!coinId) {
    throw new Error(`Token ${symbol} not found`);
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch price history');
  }

  const data = await response.json();

  // Sample data points (every 6 hours)
  const sampledPrices = data.prices.filter((_, i) => i % 6 === 0).map(([timestamp, price]) => ({
    timestamp: new Date(timestamp).toISOString(),
    price: price
  }));

  return {
    symbol: symbol.toUpperCase(),
    period: '7 days',
    dataPoints: sampledPrices.length,
    prices: sampledPrices,
    highPrice: Math.max(...data.prices.map(p => p[1])),
    lowPrice: Math.min(...data.prices.map(p => p[1])),
    priceChange: ((data.prices[data.prices.length - 1][1] - data.prices[0][1]) / data.prices[0][1] * 100).toFixed(2) + '%'
  };
}

async function getTransaction({ txHash }) {
  if (!txHash || typeof txHash !== 'string') {
    throw new Error('Transaction hash is required');
  }

  const tx = await provider.getTransaction(txHash);

  if (!tx) {
    throw new Error('Transaction not found');
  }

  const receipt = await provider.getTransactionReceipt(txHash);

  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value.toString(),
    valueFormatted: parseFloat(ethers.formatEther(tx.value)),
    gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0',
    gasLimit: tx.gasLimit.toString(),
    nonce: tx.nonce,
    blockNumber: tx.blockNumber,
    blockHash: tx.blockHash,
    status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
    gasUsed: receipt ? receipt.gasUsed.toString() : null,
    timestamp: tx.blockNumber ? (await provider.getBlock(tx.blockNumber)).timestamp : null
  };
}

async function getBlock({ blockNumber }) {
  const blockNum = blockNumber ? parseInt(blockNumber) : await provider.getBlockNumber();

  const block = await provider.getBlock(blockNum, false);

  if (!block) {
    throw new Error(`Block ${blockNum} not found`);
  }

  return {
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp,
    timestampFormatted: new Date(block.timestamp * 1000).toISOString(),
    transactions: block.transactions.length,
    gasUsed: block.gasUsed.toString(),
    gasLimit: block.gasLimit.toString(),
    miner: block.miner,
    difficulty: block.difficulty.toString(),
    size: block.transactions.length
  };
}

async function getFanTokensList() {
  const fanTokens = [
    { symbol: 'CHZ', name: 'Chiliz', type: 'Native Token' },
    { symbol: 'PSG', name: 'Paris Saint-Germain Fan Token', type: 'European Football' },
    { symbol: 'BAR', name: 'FC Barcelona Fan Token', type: 'European Football' },
    { symbol: 'JUV', name: 'Juventus Fan Token', type: 'European Football' },
    { symbol: 'CITY', name: 'Manchester City Fan Token', type: 'European Football' },
    { symbol: 'ACM', name: 'AC Milan Fan Token', type: 'European Football' },
    { symbol: 'INTER', name: 'Inter Milan Fan Token', type: 'European Football' },
    { symbol: 'ATM', name: 'Atletico Madrid Fan Token', type: 'European Football' },
    { symbol: 'MENGO', name: 'Flamengo Fan Token', type: 'Brazilian Football' },
    { symbol: 'SCCP', name: 'Corinthians Fan Token', type: 'Brazilian Football' },
    { symbol: 'GAL', name: 'Galatasaray Fan Token', type: 'European Football' },
    { symbol: 'UFC', name: 'UFC Fan Token', type: 'Sports/Fighting' },
    { symbol: 'OG', name: 'OG Fan Token', type: 'Esports' },
    { symbol: 'NAVI', name: 'Natus Vincere Fan Token', type: 'Esports' }
  ];

  return {
    totalTokens: fanTokens.length,
    tokens: fanTokens,
    categories: {
      'European Football': fanTokens.filter(t => t.type === 'European Football').length,
      'Brazilian Football': fanTokens.filter(t => t.type === 'Brazilian Football').length,
      'Esports': fanTokens.filter(t => t.type === 'Esports').length,
      'Sports/Fighting': fanTokens.filter(t => t.type === 'Sports/Fighting').length
    }
  };
}

// Main handler
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Return available tools
    const tools = Object.entries(SAFE_TOOLS).map(([name, config]) => ({
      name,
      description: config.description,
      params: config.params
    }));

    return res.status(200).json({
      success: true,
      tools,
      rateLimit: {
        maxRequests: RATE_LIMIT,
        windowMinutes: 60
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get client IP for rate limiting
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

    // Check rate limit
    const rateCheck = checkRateLimit(ip);

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining', rateCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateCheck.resetAt).toISOString());

    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
        resetAt: new Date(rateCheck.resetAt).toISOString()
      });
    }

    const { tool, params = {} } = req.body;

    if (!tool) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: tool'
      });
    }

    const toolConfig = SAFE_TOOLS[tool];
    if (!toolConfig) {
      return res.status(400).json({
        success: false,
        error: `Unknown tool: ${tool}. Available tools: ${Object.keys(SAFE_TOOLS).join(', ')}`
      });
    }

    // Execute tool
    const startTime = Date.now();
    const result = await toolConfig.handler(params);
    const executionTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      tool,
      params,
      result,
      metadata: {
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
        rateLimit: {
          remaining: rateCheck.remaining,
          resetAt: new Date(rateCheck.resetAt).toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Sandbox error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
