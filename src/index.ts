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