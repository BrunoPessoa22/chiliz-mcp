# Chiliz MCP

Advanced Model Context Protocol (MCP) server for the Chiliz blockchain ecosystem. Features comprehensive tools for fan token management, DeFi operations, sports analytics, and social sentiment tracking.

![Chiliz MCP Banner](https://raw.githubusercontent.com/BrunoPessoa22/chiliz-mcp/main/landing-page/chiliz-banner.png)

## Features

### Core Blockchain Tools
- **Real-time Price Tracking**: Live prices for all Chiliz fan tokens
- **Wallet Management**: Balance checking, transaction history, portfolio analytics
- **Transaction Capabilities**: Send CHZ, swap tokens, approve spending
- **Smart Contract Deployment**: Deploy ERC-20 tokens, NFT collections, and custom contracts
- **Blockchain Analytics**: Network stats, gas prices, block explorer integration
- **WebSocket Monitoring**: Real-time block updates, pending transactions, contract events

### Advanced Analytics
- **Smart Money Tracking**: Whale movements, unusual patterns detection
- **Token Velocity Analysis**: Trading volume, liquidity metrics
- **Social Sentiment**: Twitter/Reddit sentiment analysis for fan tokens
- **Sports Correlation**: Team performance impact on token prices

### Supported Fan Tokens
Support for major Chiliz fan tokens including:
- European clubs: PSG, Barcelona, Juventus, Manchester City, AC Milan, Inter Milan
- Brazilian clubs: Flamengo (MENGO), Corinthians (SCCP), São Paulo (SPFC), Palmeiras (VERDAO)
- Esports: OG, Natus Vincere, Team Heretics
- Sports: UFC, PFL

### FanX DEX Integration
- Liquidity pool analytics
- Optimal swap routing
- APY calculations
- Impermanent loss tracking

### 🔐 Enterprise Security
- **KeyManager**: AES-256-GCM encrypted private key storage
- **TransactionSigner**: Secure transaction signing with confirmation callbacks
- **Key Rotation**: Support for multiple encrypted keys with ID-based management
- **Environment Protection**: Secure key handling from environment or encrypted storage

### 🔄 Advanced Error Handling & Resilience
- **Automatic Retry**: Exponential backoff for transient failures
- **Circuit Breaker**: Fast-fail pattern for persistent errors
- **Custom Error Types**: Comprehensive error hierarchy (NetworkError, RPCError, ValidationError, etc.)
- **Error Context**: Detailed error information with retryable status and metadata

### ⚡ Real-time Streaming
- **PriceStream**: Live price updates with WebSocket auto-reconnection
- **Whale Alerts**: Configurable threshold for large transaction notifications
- **DEX Activity**: Real-time swap and liquidity event monitoring
- **Event-Driven**: EventEmitter-based architecture for flexible subscriptions

### 🔄 1inch DEX Aggregation
- **Multi-DEX Routing**: Find best prices across multiple DEXes
- **Swap Optimization**: Automatic path finding for optimal execution
- **Gas Estimation**: Pre-execution cost analysis
- **Token Approvals**: Simplified approval transaction generation

### 📊 Advanced Analytics Tools
- **GasEstimator**: Real-time gas price recommendations (slow/standard/fast)
- **Transaction Cost Analysis**: Comprehensive cost breakdowns with network congestion detection
- **PortfolioTracker**: Complete portfolio analytics with ROI, diversity scores, and performance metrics
- **Portfolio Comparison**: Multi-wallet analysis and benchmarking

### 🧪 Production-Ready Testing
- **Jest Framework**: Comprehensive unit and integration tests
- **70% Coverage Target**: Enforced code coverage thresholds
- **ESM Support**: Modern JavaScript module testing
- **CI Integration**: Automated testing on every commit

### 🚀 CI/CD Pipelines
- **Automated Testing**: Matrix testing across Node 18.x and 20.x
- **Build Verification**: TypeScript compilation and type checking
- **Automated Publishing**: npm and GitHub Packages deployment on release
- **Release Automation**: Changelog generation and GitHub releases

### 📈 Monitoring & Observability
- **Telemetry System**: Comprehensive metrics collection (requests, errors, response times)
- **Performance Tracking**: p95/p99 response time monitoring
- **Health Checks**: Automated system health status
- **Prometheus Export**: Standard metrics format for monitoring tools

### 🐳 Production Deployment
- **Docker Support**: Multi-stage optimized builds
- **Docker Compose**: Full stack with Redis, Prometheus, and Grafana
- **Health Checks**: Container health monitoring
- **Non-root User**: Security-hardened container execution

## Installation

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/BrunoPessoa22/chiliz-mcp.git
cd chiliz-mcp
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Build the project**
```bash
npm run build
```

5. **Start the MCP server**
```bash
npm start
```

### Using with Claude Desktop

1. Install the MCP server globally:
```bash
npm install -g chiliz-mcp
```

2. Add to Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "chiliz-mcp": {
      "command": "node",
      "args": ["/path/to/chiliz-mcp/dist/index.js"],
      "env": {
        "CHILIZ_RPC_URL": "https://rpc.ankr.com/chiliz",
        "NETWORK": "mainnet"
      }
    }
  }
}
```

3. Restart Claude Desktop

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CHILIZ_RPC_URL` | Chiliz mainnet RPC endpoint | `https://rpc.ankr.com/chiliz` |
| `CHILIZ_WSS_URL` | WebSocket endpoint for real-time monitoring | `wss://rpc.ankr.com/chiliz/ws` |
| `NETWORK` | Network to connect to | `mainnet` or `testnet` |
| `COINGECKO_API_KEY` | CoinGecko API key (optional) | Your API key |

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CACHE_TTL` | Cache time-to-live (seconds) | `300` |
| `RATE_LIMIT_REQUESTS` | Max requests per window | `100` |
| `PRIVATE_KEY` | Wallet private key for transactions | None |

## Available Tools

### Price Tools
- `get_token_price` - Get current price for any fan token
- `get_price_history` - Historical price data with charts
- `get_market_overview` - Market cap rankings and trends

### Wallet Tools
- `get_wallet_balance` - Check CHZ and token balances
- `get_transaction_history` - Transaction history for addresses
- `get_portfolio_value` - Total portfolio valuation

### Transaction Tools
- `send_chz` - Send CHZ to another address
- `send_fan_token` - Transfer fan tokens
- `swap_tokens` - Swap between fan tokens via DEX
- `approve_token` - Approve token spending

### Smart Contract Deployment Tools
- `deploy_erc20_token` - Deploy custom ERC-20 tokens
- `deploy_nft_collection` - Deploy ERC-721 NFT collections
- `deploy_custom_contract` - Deploy arbitrary Solidity contracts

### Analytics Tools
- `track_whale_movements` - Monitor large transactions
- `analyze_token_velocity` - Trading volume analysis
- `detect_unusual_patterns` - Anomaly detection
- `get_liquidity_metrics` - DEX liquidity analytics
- `estimate_gas` - Advanced gas estimation with cost analysis
- `get_gas_price_recommendations` - Get slow/standard/fast gas prices
- `analyze_transaction_cost` - Comprehensive transaction cost breakdown
- `calculate_optimal_gas_price` - Calculate optimal gas by urgency
- `track_portfolio` - Track portfolio value and analytics
- `get_portfolio_performance` - ROI and performance metrics
- `get_portfolio_diversity` - Diversity score and recommendations
- `compare_portfolios` - Compare multiple wallet portfolios

### 1inch DEX Tools
- `get_1inch_quote` - Get swap quote from 1inch aggregator
- `get_1inch_swap` - Get swap transaction data
- `get_1inch_tokens` - List supported tokens
- `get_1inch_liquidity_sources` - Get available DEX sources
- `find_best_route` - Find optimal swap route across DEXes

### Social & Sports Tools
- `get_social_sentiment` - Twitter/Reddit sentiment
- `get_team_performance` - Sports results correlation
- `analyze_fan_engagement` - Community metrics

### WebSocket Real-time Monitoring
- `start_block_monitoring` - Monitor new blocks in real-time
- `start_log_monitoring` - Track contract events/logs
- `start_pending_tx_monitoring` - Watch pending transactions
- `monitor_fan_token_transfers` - Real-time token transfer alerts
- `get_recent_blocks` - Retrieve recent block history
- `get_recent_logs` - Get recent contract events
- `get_recent_pending_transactions` - View pending tx pool
- `get_websocket_status` - Check connection status
- `stop_all_monitoring` - Stop all real-time subscriptions

## Development

### Project Structure
```
chiliz-mcp/
├── src/
│   ├── tools/         # MCP tool implementations
│   ├── api/           # External API clients
│   ├── security/      # KeyManager & TransactionSigner
│   ├── errors/        # Error handling & retry logic
│   ├── streaming/     # Real-time PriceStream
│   ├── dex/           # 1inch DEX integration
│   ├── monitoring/    # Telemetry & metrics
│   ├── config/        # Configuration & validation
│   ├── types/         # TypeScript definitions
│   └── index.ts       # Main MCP server
├── tests/
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
├── .github/workflows/ # CI/CD pipelines
├── docs/              # Documentation
├── landing-page/      # Documentation website
└── Dockerfile         # Docker deployment
```

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Building from Source
```bash
npm run build
npm run dev  # Development mode with watch
```

## Deployment

### Deploy Landing Page to Vercel

```bash
cd landing-page
npx vercel
```

### Deploy to Production

1. Set up production environment variables
2. Build for production: `npm run build:prod`
3. Deploy using your preferred method (Docker, PM2, systemd)

### Docker Deployment

**Using Docker Compose (Recommended)**:
```bash
# Start all services (MCP + Redis)
docker-compose up -d

# Start with monitoring stack (includes Prometheus + Grafana)
docker-compose --profile monitoring up -d

# View logs
docker-compose logs -f chiliz-mcp

# Stop all services
docker-compose down
```

**Using Docker directly**:
```bash
# Build image
docker build -t chiliz-mcp .

# Run container
docker run -d --name chiliz-mcp \
  -p 9090:9090 \
  -e CHILIZ_RPC_URL=https://rpc.ankr.com/chiliz \
  -e NETWORK=mainnet \
  chiliz-mcp

# Check health
docker ps
docker logs chiliz-mcp
```

## Documentation

Full documentation available at: https://chiliz-mcp.vercel.app

### Example Usage

```javascript
// Get Flamengo token price
const price = await mcp.callTool('get_token_price', {
  symbol: 'MENGO'
});

// Check wallet balance
const balance = await mcp.callTool('get_wallet_balance', {
  address: '0x...',
  tokens: ['MENGO', 'SCCP']
});

// Swap tokens via FanX DEX
const swap = await mcp.callTool('swap_tokens', {
  tokenIn: 'CHZ',
  tokenOut: 'MENGO',
  amount: '100'
});

// Deploy ERC-20 token
const token = await mcp.callTool('deploy_erc20_token', {
  name: 'Flamengo Fan Token',
  symbol: 'MENGO',
  initialSupply: 1000000
});

// Deploy NFT collection
const nft = await mcp.callTool('deploy_nft_collection', {
  name: 'Match Highlights',
  symbol: 'HIGHLIGHT',
  maxSupply: 10000,
  baseTokenURI: 'ipfs://QmXxx/'
});
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Recently Completed ✅
- ✅ 1inch DEX integration
- ✅ WebSocket real-time updates
- ✅ Advanced error handling & retry logic
- ✅ Security features (KeyManager, TransactionSigner)
- ✅ Portfolio tracking & analytics
- ✅ Testing suite with 70% coverage
- ✅ CI/CD pipelines
- ✅ Docker deployment
- ✅ Monitoring & telemetry

### Current Priority Areas
- **High Priority**: Multi-chain support (expand beyond Chiliz)
- **High Priority**: GraphQL API layer
- **Medium Priority**: Historical data storage & analytics
- **Medium Priority**: Advanced NFT marketplace integration
- **Low Priority**: UI dashboard for monitoring

## License

MIT License - see [LICENSE](LICENSE) file

## Links

- [Chiliz Chain](https://chiliz.com)
- [FanX DEX](https://fanx.chiliz.com)
- [Documentation](https://chiliz-mcp.vercel.app)
- [Discord Community](https://discord.gg/chiliz)
- [Report Issues](https://github.com/BrunoPessoa22/chiliz-mcp/issues)

## Quick Commands

```bash
# Install
npm install -g chiliz-mcp

# Check version
chiliz-mcp --version

# Run server
chiliz-mcp start

# Run tests
chiliz-mcp test

# View logs
chiliz-mcp logs
```

## Acknowledgments

Built with love for the Chiliz community. Special thanks to all Brazilian football fans!

---

**Note**: This is an independent project and is not officially affiliated with Chiliz. Always verify smart contract addresses and exercise caution when handling private keys.