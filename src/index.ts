#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool functions
import { getFanTokenPrice, getMultipleFanTokenPrices, getTokenMarketChart } from './tools/prices.js';
import { getWalletBalance, getMyWalletBalance } from './tools/wallet.js';
import { getBlockchainInfo, getTransaction } from './tools/blockchain.js';
import { getFanTokensList, getTokenHolders } from './tools/tokens.js';
import { sendTokens, approveToken, swapTokens } from './tools/transactions.js';
import {
  detectWhaleTrades,
  calculateTokenVelocity,
  identifyUnusualTradingPatterns,
  getMarketSentiment
} from './tools/analytics.js';
import { getSocialSentiment, trackSocialMomentum, getInfluencerActivity } from './tools/social.js';
import { analyzeTeamPerformanceCorrelation, getUpcomingMatches, getLeagueStandings } from './tools/sports.js';
import {
  startBlockMonitoring,
  startLogMonitoring,
  startPendingTxMonitoring,
  getRecentBlocks,
  getRecentLogs,
  getRecentPendingTransactions,
  stopAllMonitoring,
  getWebSocketStatus,
  monitorFanTokenTransfers
} from './tools/websocket.js';
import {
  queryFanTokenAnalytics,
  getGovernanceHistory,
  analyzeHolderDistribution,
  trackWhaleMovements,
  getTokenVelocityMetrics,
  compareTokenDistributions,
  getHistoricalPriceData
} from './tools/graph.js';
import {
  findBestSwapRoute,
  calculatePriceImpact,
  detectArbitrage,
  getPoolAPY,
  trackLiquidityChanges
} from './tools/kayen.js';
import {
  compareValidators,
  calculateStakingRewards,
  getValidatorPerformance,
  monitorSlashingEvents,
  getValidatorRisks,
  calculateOptimalStake
} from './tools/staking.js';
import { deployERC20Token } from './tools/deploy-erc20.js';
import { deployNFTCollection } from './tools/deploy-nft.js';
import { deployCustomContract } from './tools/deploy-custom-contract.js';

interface ToolArguments {
  [key: string]: any;
}

class ChilizMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'chiliz-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Price Tools
        {
          name: 'get_fan_token_price',
          description: 'Get current price and market data for a fan token',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Token symbol (e.g., PSG, BAR, CHZ)' },
            },
            required: ['symbol'],
          },
        },
        {
          name: 'get_multiple_prices',
          description: 'Get prices for multiple fan tokens at once',
          inputSchema: {
            type: 'object',
            properties: {
              symbols: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of token symbols',
              },
            },
            required: ['symbols'],
          },
        },
        {
          name: 'get_market_chart',
          description: 'Get historical price chart data for a token',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              days: { type: 'number', default: 7, description: 'Number of days of history' },
            },
            required: ['symbol'],
          },
        },

        // Wallet Tools
        {
          name: 'get_wallet_balance',
          description: 'Get CHZ and fan token balances for a wallet address',
          inputSchema: {
            type: 'object',
            properties: {
              address: { type: 'string', description: 'Wallet address to check' },
            },
            required: ['address'],
          },
        },
        {
          name: 'get_my_balance',
          description: 'Get balance of configured wallet (requires PRIVATE_KEY env)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },

        // Blockchain Tools
        {
          name: 'get_blockchain_info',
          description: 'Get current Chiliz blockchain information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_transaction',
          description: 'Get details of a specific transaction',
          inputSchema: {
            type: 'object',
            properties: {
              txHash: { type: 'string', description: 'Transaction hash' },
            },
            required: ['txHash'],
          },
        },

        // Token Tools
        {
          name: 'get_fan_tokens_list',
          description: 'Get list of all supported fan tokens',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_token_holders',
          description: 'Get top holders of a specific fan token',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              limit: { type: 'number', default: 10 },
            },
            required: ['symbol'],
          },
        },

        // Transaction Tools
        {
          name: 'send_tokens',
          description: 'Send CHZ or fan tokens (requires PRIVATE_KEY env)',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient address' },
              amount: { type: 'string', description: 'Amount to send' },
              token: { type: 'string', description: 'Token symbol (CHZ or fan token)' },
            },
            required: ['to', 'amount'],
          },
        },
        {
          name: 'approve_token',
          description: 'Approve token spending for a contract',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              spender: { type: 'string', description: 'Contract address to approve' },
              amount: { type: 'string' },
            },
            required: ['token', 'spender', 'amount'],
          },
        },
        {
          name: 'swap_tokens',
          description: 'Swap between tokens (DEX integration)',
          inputSchema: {
            type: 'object',
            properties: {
              fromToken: { type: 'string' },
              toToken: { type: 'string' },
              amount: { type: 'string' },
              slippage: { type: 'number', default: 1 },
            },
            required: ['fromToken', 'toToken', 'amount'],
          },
        },

        // Analytics Tools
        {
          name: 'detect_whale_trades',
          description: 'Detect large transactions (whale trades)',
          inputSchema: {
            type: 'object',
            properties: {
              minValueUSD: { type: 'number', default: 100000 },
              blockRange: { type: 'number', default: 100 },
            },
          },
        },
        {
          name: 'calculate_token_velocity',
          description: 'Calculate token velocity and turnover metrics',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              period: { type: 'number', default: 7, description: 'Period in days' },
            },
            required: ['token'],
          },
        },
        {
          name: 'identify_unusual_patterns',
          description: 'Identify unusual trading patterns',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              threshold: { type: 'number', default: 2, description: 'Standard deviations' },
            },
            required: ['token'],
          },
        },
        {
          name: 'get_market_sentiment',
          description: 'Get overall market sentiment analysis',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
            },
            required: ['token'],
          },
        },

        // Social Tools
        {
          name: 'get_social_sentiment',
          description: 'Analyze social media sentiment for a token',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              platforms: {
                type: 'array',
                items: { type: 'string' },
                default: ['twitter', 'reddit'],
              },
            },
            required: ['token'],
          },
        },
        {
          name: 'track_social_momentum',
          description: 'Track changes in social media activity',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              timeframe: { type: 'number', default: 24, description: 'Hours to analyze' },
            },
            required: ['token'],
          },
        },
        {
          name: 'get_influencer_activity',
          description: 'Track influencer mentions and activity',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              minFollowers: { type: 'number', default: 10000 },
            },
            required: ['token'],
          },
        },

        // Sports Correlation Tools
        {
          name: 'analyze_team_performance',
          description: 'Analyze correlation between team performance and token price',
          inputSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              period: { type: 'number', default: 90, description: 'Days to analyze' },
            },
            required: ['token'],
          },
        },
        {
          name: 'get_upcoming_matches',
          description: 'Get upcoming matches for fan token teams',
          inputSchema: {
            type: 'object',
            properties: {
              tokens: {
                type: 'array',
                items: { type: 'string' },
                description: 'Token symbols to check',
              },
              days: { type: 'number', default: 7 },
            },
          },
        },
        {
          name: 'get_league_standings',
          description: 'Get league standings for a specific league',
          inputSchema: {
            type: 'object',
            properties: {
              league: { type: 'string', description: 'League name (e.g., Ligue1, LaLiga)' },
            },
            required: ['league'],
          },
        },

        // WebSocket Real-time Monitoring Tools
        {
          name: 'start_block_monitoring',
          description: 'Start real-time monitoring of new blocks on Chiliz Chain',
          inputSchema: {
            type: 'object',
            properties: {
              storeHistory: { type: 'boolean', default: true, description: 'Store recent blocks in memory' },
            },
          },
        },
        {
          name: 'start_log_monitoring',
          description: 'Start monitoring contract events/logs in real-time',
          inputSchema: {
            type: 'object',
            properties: {
              address: { type: 'string', description: 'Contract address to monitor' },
              topics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Event topics to filter'
              },
              storeHistory: { type: 'boolean', default: true },
            },
          },
        },
        {
          name: 'start_pending_tx_monitoring',
          description: 'Start monitoring pending transactions in the mempool',
          inputSchema: {
            type: 'object',
            properties: {
              storeHistory: { type: 'boolean', default: true },
              filterLargeTransactions: { type: 'boolean', default: false },
              minValueETH: { type: 'number', default: 0, description: 'Minimum CHZ value to track' },
            },
          },
        },
        {
          name: 'monitor_fan_token_transfers',
          description: 'Monitor real-time transfers of a specific fan token',
          inputSchema: {
            type: 'object',
            properties: {
              tokenAddress: { type: 'string', description: 'Fan token contract address' },
              tokenSymbol: { type: 'string', description: 'Token symbol for logging' },
            },
            required: ['tokenAddress'],
          },
        },
        {
          name: 'get_recent_blocks',
          description: 'Get recent blocks from monitoring history',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', default: 10 },
            },
          },
        },
        {
          name: 'get_recent_logs',
          description: 'Get recent contract logs from monitoring history',
          inputSchema: {
            type: 'object',
            properties: {
              filterId: { type: 'string', description: 'Filter ID from start_log_monitoring' },
              address: { type: 'string', description: 'Filter by contract address' },
              limit: { type: 'number', default: 50 },
            },
          },
        },
        {
          name: 'get_recent_pending_transactions',
          description: 'Get recent pending transactions from monitoring',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', default: 20 },
              minValueETH: { type: 'number', description: 'Filter by minimum CHZ value' },
            },
          },
        },
        {
          name: 'get_websocket_status',
          description: 'Get WebSocket connection and monitoring status',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'stop_all_monitoring',
          description: 'Stop all WebSocket monitoring and disconnect',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },

        // The Graph Analytics Tools
        {
          name: 'query_fan_token_analytics',
          description: 'Query detailed fan token analytics via The Graph protocol',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Fan token symbol (e.g., PSG, BAR, MENGO)' },
              days: { type: 'number', default: 7, description: 'Number of days to analyze' },
            },
            required: ['symbol'],
          },
        },
        {
          name: 'get_governance_history',
          description: 'Get governance proposal and voting history for a token',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Fan token symbol' },
              status: { type: 'string', enum: ['active', 'succeeded', 'defeated', 'queued', 'executed'], description: 'Filter by proposal status' },
              limit: { type: 'number', default: 50 },
            },
            required: ['symbol'],
          },
        },
        {
          name: 'analyze_holder_distribution',
          description: 'Analyze token holder distribution and concentration',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Fan token symbol' },
            },
            required: ['symbol'],
          },
        },
        {
          name: 'track_whale_movements',
          description: 'Track large holder (whale) movements via The Graph',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Fan token symbol' },
              minAmount: { type: 'number', description: 'Minimum amount to be considered whale movement' },
              hours: { type: 'number', default: 24, description: 'Time period in hours' },
            },
            required: ['symbol', 'minAmount'],
          },
        },
        {
          name: 'get_token_velocity_metrics',
          description: 'Get token velocity and turnover metrics from The Graph',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Fan token symbol' },
              days: { type: 'number', default: 7, description: 'Period in days' },
            },
            required: ['symbol'],
          },
        },
        {
          name: 'compare_token_distributions',
          description: 'Compare holder distributions across multiple tokens',
          inputSchema: {
            type: 'object',
            properties: {
              symbols: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of token symbols to compare',
              },
            },
            required: ['symbols'],
          },
        },
        {
          name: 'get_historical_price_data',
          description: 'Get historical price data from The Graph subgraph',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'Fan token symbol' },
              days: { type: 'number', default: 7, description: 'Number of days' },
              interval: { type: 'string', enum: ['hour', 'day'], default: 'day', description: 'Data interval' },
            },
            required: ['symbol'],
          },
        },

        // KAYEN Protocol DEX Tools
        {
          name: 'find_best_swap_route',
          description: 'Find optimal swap route on KAYEN Protocol',
          inputSchema: {
            type: 'object',
            properties: {
              tokenIn: { type: 'string', description: 'Input token symbol or address' },
              tokenOut: { type: 'string', description: 'Output token symbol or address' },
              amountIn: { type: 'string', description: 'Amount to swap' },
            },
            required: ['tokenIn', 'tokenOut', 'amountIn'],
          },
        },
        {
          name: 'calculate_price_impact',
          description: 'Calculate price impact for a swap on KAYEN',
          inputSchema: {
            type: 'object',
            properties: {
              poolAddress: { type: 'string', description: 'Liquidity pool address' },
              tokenIn: { type: 'string', description: 'Input token symbol or address' },
              amountIn: { type: 'string', description: 'Amount to swap' },
            },
            required: ['poolAddress', 'tokenIn', 'amountIn'],
          },
        },
        {
          name: 'detect_arbitrage',
          description: 'Detect arbitrage opportunities between KAYEN and other DEXs',
          inputSchema: {
            type: 'object',
            properties: {
              minProfitPercentage: { type: 'number', default: 1, description: 'Minimum profit percentage' },
              maxPriceImpact: { type: 'number', default: 3, description: 'Maximum acceptable price impact %' },
            },
          },
        },
        {
          name: 'get_pool_apy',
          description: 'Get APY for a KAYEN liquidity pool',
          inputSchema: {
            type: 'object',
            properties: {
              poolAddress: { type: 'string', description: 'Pool contract address' },
              period: { type: 'number', default: 7, description: 'Period in days for APY calculation' },
            },
            required: ['poolAddress'],
          },
        },
        {
          name: 'track_liquidity_changes',
          description: 'Track liquidity changes in KAYEN pools',
          inputSchema: {
            type: 'object',
            properties: {
              poolAddress: { type: 'string', description: 'Pool to track' },
              hours: { type: 'number', default: 24, description: 'Time period in hours' },
            },
            required: ['poolAddress'],
          },
        },

        // Staking Analytics Tools
        {
          name: 'compare_validators',
          description: 'Compare Chiliz validators by performance and metrics',
          inputSchema: {
            type: 'object',
            properties: {
              sortBy: { type: 'string', enum: ['apy', 'uptime', 'reputation', 'total_staked'], default: 'apy' },
              limit: { type: 'number', default: 10 },
            },
          },
        },
        {
          name: 'calculate_staking_rewards',
          description: 'Calculate staking rewards projection',
          inputSchema: {
            type: 'object',
            properties: {
              amount: { type: 'string', description: 'Amount to stake (in CHZ)' },
              validatorAddress: { type: 'string', description: 'Validator to stake with (optional)' },
              days: { type: 'number', default: 30, description: 'Staking duration in days' },
            },
            required: ['amount'],
          },
        },
        {
          name: 'get_validator_performance',
          description: 'Get detailed performance metrics for a validator',
          inputSchema: {
            type: 'object',
            properties: {
              validatorAddress: { type: 'string', description: 'Validator address' },
              days: { type: 'number', default: 30, description: 'Period in days' },
            },
            required: ['validatorAddress'],
          },
        },
        {
          name: 'monitor_slashing_events',
          description: 'Monitor recent slashing events on the network',
          inputSchema: {
            type: 'object',
            properties: {
              hours: { type: 'number', default: 168, description: 'Look back period in hours' },
              severity: { type: 'string', enum: ['minor', 'moderate', 'severe'], description: 'Filter by severity' },
            },
          },
        },
        {
          name: 'get_validator_risks',
          description: 'Assess risks of staking with a specific validator',
          inputSchema: {
            type: 'object',
            properties: {
              validatorAddress: { type: 'string', description: 'Validator address' },
            },
            required: ['validatorAddress'],
          },
        },
        {
          name: 'calculate_optimal_stake',
          description: 'Calculate optimal stake distribution across validators',
          inputSchema: {
            type: 'object',
            properties: {
              amount: { type: 'string', description: 'Total CHZ to stake' },
              riskTolerance: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium', description: 'Risk tolerance level' },
              duration: { type: 'number', default: 30, description: 'Staking duration in days' },
            },
            required: ['amount'],
          },
        },

        // Smart Contract Deployment Tools
        {
          name: 'deploy_erc20_token',
          description: 'Deploy a custom ERC-20 token on Chiliz blockchain',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Token name (e.g., "Fan Token")' },
              symbol: { type: 'string', description: 'Token symbol (e.g., "FAN")' },
              initialSupply: { type: 'number', description: 'Initial supply (in tokens, not wei)' },
            },
            required: ['name', 'symbol', 'initialSupply'],
          },
        },
        {
          name: 'deploy_nft_collection',
          description: 'Deploy an ERC-721 NFT collection on Chiliz blockchain',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Collection name (e.g., "Fan Moments")' },
              symbol: { type: 'string', description: 'Collection symbol (e.g., "FMNT")' },
              maxSupply: { type: 'number', description: 'Maximum number of NFTs that can be minted' },
              baseTokenURI: { type: 'string', description: 'Base URI for token metadata (e.g., "ipfs://QmXxx/")' },
            },
            required: ['name', 'symbol', 'maxSupply', 'baseTokenURI'],
          },
        },
        {
          name: 'deploy_custom_contract',
          description: 'Deploy a custom Solidity smart contract on Chiliz blockchain',
          inputSchema: {
            type: 'object',
            properties: {
              sourceCode: { type: 'string', description: 'Complete Solidity source code' },
              contractName: { type: 'string', description: 'Name of the contract to deploy' },
              constructorArgs: { type: 'array', items: { type: 'string' }, description: 'Constructor arguments as array' },
            },
            required: ['sourceCode', 'contractName'],
          },
        },
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;
        const typedArgs = (args || {}) as ToolArguments;

        switch (name) {
          // Price tools
          case 'get_fan_token_price':
            result = await getFanTokenPrice(typedArgs.symbol as string);
            break;
          case 'get_multiple_prices':
            result = await getMultipleFanTokenPrices(typedArgs.symbols as string[]);
            break;
          case 'get_market_chart':
            result = await getTokenMarketChart(
              typedArgs.symbol as string,
              typedArgs.days as number
            );
            break;

          // Wallet tools
          case 'get_wallet_balance':
            result = await getWalletBalance(typedArgs.address as string);
            break;
          case 'get_my_balance':
            result = await getMyWalletBalance();
            break;

          // Blockchain tools
          case 'get_blockchain_info':
            result = await getBlockchainInfo();
            break;
          case 'get_transaction':
            result = await getTransaction(typedArgs.txHash as string);
            break;

          // Token tools
          case 'get_fan_tokens_list':
            result = await getFanTokensList();
            break;
          case 'get_token_holders':
            result = await getTokenHolders(
              typedArgs.symbol as string,
              typedArgs.limit as number
            );
            break;

          // Transaction tools
          case 'send_tokens':
            result = await sendTokens({
              to: typedArgs.to as string,
              amount: typedArgs.amount as string,
              token: typedArgs.token as string | undefined,
            });
            break;
          case 'approve_token':
            result = await approveToken({
              token: typedArgs.token as string,
              spender: typedArgs.spender as string,
              amount: typedArgs.amount as string,
            });
            break;
          case 'swap_tokens':
            result = await swapTokens({
              fromToken: typedArgs.fromToken as string,
              toToken: typedArgs.toToken as string,
              amount: typedArgs.amount as string,
              slippage: typedArgs.slippage as number | undefined,
            });
            break;

          // Analytics tools
          case 'detect_whale_trades':
            result = await detectWhaleTrades({
              minValueUSD: typedArgs.minValueUSD as number | undefined,
              blockRange: typedArgs.blockRange as number | undefined,
            });
            break;
          case 'calculate_token_velocity':
            result = await calculateTokenVelocity({
              token: typedArgs.token as string,
              period: typedArgs.period as number,
            });
            break;
          case 'identify_unusual_patterns':
            result = await identifyUnusualTradingPatterns({
              token: typedArgs.token as string,
              threshold: typedArgs.threshold as number | undefined,
            });
            break;
          case 'get_market_sentiment':
            result = await getMarketSentiment({ token: typedArgs.token as string });
            break;

          // Social tools
          case 'get_social_sentiment':
            result = await getSocialSentiment({
              token: typedArgs.token as string,
              platforms: typedArgs.platforms as string[] | undefined,
            });
            break;
          case 'track_social_momentum':
            result = await trackSocialMomentum({
              token: typedArgs.token as string,
              timeframe: typedArgs.timeframe as number,
            });
            break;
          case 'get_influencer_activity':
            result = await getInfluencerActivity({
              token: typedArgs.token as string,
              minFollowers: typedArgs.minFollowers as number | undefined,
            });
            break;

          // Sports correlation tools
          case 'analyze_team_performance':
            result = await analyzeTeamPerformanceCorrelation({
              token: typedArgs.token as string,
              period: typedArgs.period as number | undefined,
            });
            break;
          case 'get_upcoming_matches':
            result = await getUpcomingMatches({
              tokens: typedArgs.tokens as string[] | undefined,
              days: typedArgs.days as number | undefined,
            });
            break;
          case 'get_league_standings':
            result = await getLeagueStandings({ league: typedArgs.league as string });
            break;

          // WebSocket real-time monitoring tools
          case 'start_block_monitoring':
            result = await startBlockMonitoring({
              storeHistory: typedArgs.storeHistory as boolean | undefined,
            });
            break;
          case 'start_log_monitoring':
            result = await startLogMonitoring({
              address: typedArgs.address as string | undefined,
              topics: typedArgs.topics as string[] | undefined,
              storeHistory: typedArgs.storeHistory as boolean | undefined,
            });
            break;
          case 'start_pending_tx_monitoring':
            result = await startPendingTxMonitoring({
              storeHistory: typedArgs.storeHistory as boolean | undefined,
              filterLargeTransactions: typedArgs.filterLargeTransactions as boolean | undefined,
              minValueETH: typedArgs.minValueETH as number | undefined,
            });
            break;
          case 'monitor_fan_token_transfers':
            result = await monitorFanTokenTransfers({
              tokenAddress: typedArgs.tokenAddress as string,
              tokenSymbol: typedArgs.tokenSymbol as string | undefined,
            });
            break;
          case 'get_recent_blocks':
            result = await getRecentBlocks({
              limit: typedArgs.limit as number | undefined,
            });
            break;
          case 'get_recent_logs':
            result = await getRecentLogs({
              filterId: typedArgs.filterId as string | undefined,
              address: typedArgs.address as string | undefined,
              limit: typedArgs.limit as number | undefined,
            });
            break;
          case 'get_recent_pending_transactions':
            result = await getRecentPendingTransactions({
              limit: typedArgs.limit as number | undefined,
              minValueETH: typedArgs.minValueETH as number | undefined,
            });
            break;
          case 'get_websocket_status':
            result = await getWebSocketStatus();
            break;
          case 'stop_all_monitoring':
            result = await stopAllMonitoring();
            break;

          // The Graph analytics tools
          case 'query_fan_token_analytics':
            result = await queryFanTokenAnalytics({
              symbol: typedArgs.symbol as string,
              days: typedArgs.days as number | undefined,
            });
            break;
          case 'get_governance_history':
            result = await getGovernanceHistory({
              symbol: typedArgs.symbol as string,
              status: typedArgs.status as 'active' | 'succeeded' | 'defeated' | 'queued' | 'executed' | undefined,
              limit: typedArgs.limit as number | undefined,
            });
            break;
          case 'analyze_holder_distribution':
            result = await analyzeHolderDistribution({
              symbol: typedArgs.symbol as string,
            });
            break;
          case 'track_whale_movements':
            result = await trackWhaleMovements({
              symbol: typedArgs.symbol as string,
              minAmount: typedArgs.minAmount as number,
              hours: typedArgs.hours as number | undefined,
            });
            break;
          case 'get_token_velocity_metrics':
            result = await getTokenVelocityMetrics({
              symbol: typedArgs.symbol as string,
              days: typedArgs.days as number | undefined,
            });
            break;
          case 'compare_token_distributions':
            result = await compareTokenDistributions({
              symbols: typedArgs.symbols as string[],
            });
            break;
          case 'get_historical_price_data':
            result = await getHistoricalPriceData({
              symbol: typedArgs.symbol as string,
              days: typedArgs.days as number | undefined,
              interval: typedArgs.interval as 'hour' | 'day' | undefined,
            });
            break;

          // KAYEN Protocol DEX tools
          case 'find_best_swap_route':
            result = await findBestSwapRoute({
              tokenIn: typedArgs.tokenIn as string,
              tokenOut: typedArgs.tokenOut as string,
              amountIn: typedArgs.amountIn as string,
            });
            break;
          case 'calculate_price_impact':
            result = await calculatePriceImpact({
              poolAddress: typedArgs.poolAddress as string,
              tokenIn: typedArgs.tokenIn as string,
              amountIn: typedArgs.amountIn as string,
            });
            break;
          case 'detect_arbitrage':
            result = await detectArbitrage({
              minProfitPercentage: typedArgs.minProfitPercentage as number | undefined,
              maxPriceImpact: typedArgs.maxPriceImpact as number | undefined,
            });
            break;
          case 'get_pool_apy':
            result = await getPoolAPY({
              poolAddress: typedArgs.poolAddress as string,
              period: typedArgs.period as number | undefined,
            });
            break;
          case 'track_liquidity_changes':
            result = await trackLiquidityChanges({
              poolAddress: typedArgs.poolAddress as string,
              hours: typedArgs.hours as number | undefined,
            });
            break;

          // Staking analytics tools
          case 'compare_validators':
            result = await compareValidators({
              sortBy: typedArgs.sortBy as 'apy' | 'uptime' | 'reputation' | 'total_staked' | undefined,
              limit: typedArgs.limit as number | undefined,
            });
            break;
          case 'calculate_staking_rewards':
            result = await calculateStakingRewards({
              amount: typedArgs.amount as string,
              validatorAddress: typedArgs.validatorAddress as string | undefined,
              days: typedArgs.days as number | undefined,
            });
            break;
          case 'get_validator_performance':
            result = await getValidatorPerformance({
              validatorAddress: typedArgs.validatorAddress as string,
              days: typedArgs.days as number | undefined,
            });
            break;
          case 'monitor_slashing_events':
            result = await monitorSlashingEvents({
              hours: typedArgs.hours as number | undefined,
              severity: typedArgs.severity as 'minor' | 'moderate' | 'severe' | undefined,
            });
            break;
          case 'get_validator_risks':
            result = await getValidatorRisks({
              validatorAddress: typedArgs.validatorAddress as string,
            });
            break;
          case 'calculate_optimal_stake':
            result = await calculateOptimalStake({
              amount: typedArgs.amount as string,
              riskTolerance: typedArgs.riskTolerance as 'low' | 'medium' | 'high' | undefined,
              duration: typedArgs.duration as number | undefined,
            });
            break;

          // Smart contract deployment tools
          case 'deploy_erc20_token':
            result = await deployERC20Token({
              name: typedArgs.name as string,
              symbol: typedArgs.symbol as string,
              initialSupply: typedArgs.initialSupply as number,
            });
            break;
          case 'deploy_nft_collection':
            result = await deployNFTCollection({
              name: typedArgs.name as string,
              symbol: typedArgs.symbol as string,
              maxSupply: typedArgs.maxSupply as number,
              baseTokenURI: typedArgs.baseTokenURI as string,
            });
            break;
          case 'deploy_custom_contract':
            result = await deployCustomContract({
              sourceCode: typedArgs.sourceCode as string,
              contractName: typedArgs.contractName as string,
              constructorArgs: typedArgs.constructorArgs as any[] | undefined,
            });
            break;

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error(`Error executing tool ${name}:`, error);

        if (error.code === 'INVALID_PARAMS') {
          throw new McpError(ErrorCode.InvalidParams, error.message);
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('Chiliz MCP server running on stdio');
  }
}

// Run the server
const server = new ChilizMCPServer();
server.run().catch(console.error);