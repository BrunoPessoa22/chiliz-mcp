# Chiliz MCP 🌶️

Advanced Model Context Protocol (MCP) server for the Chiliz blockchain ecosystem. Features comprehensive tools for fan token management, DeFi operations, sports analytics, and social sentiment tracking.

![Chiliz MCP Banner](https://raw.githubusercontent.com/BrunoPessoa22/chiliz-mcp/main/landing-page/chiliz-banner.png)

## 🚀 Features

### Core Blockchain Tools
- **Real-time Price Tracking**: Live prices for all Chiliz fan tokens
- **Wallet Management**: Balance checking, transaction history, portfolio analytics
- **Transaction Capabilities**: Send CHZ, swap tokens, approve spending
- **Blockchain Analytics**: Network stats, gas prices, block explorer integration
- **WebSocket Monitoring**: Real-time block updates, pending transactions, contract events

### Advanced Analytics
- **Smart Money Tracking**: Whale movements, unusual patterns detection
- **Token Velocity Analysis**: Trading volume, liquidity metrics
- **Social Sentiment**: Twitter/Reddit sentiment analysis for fan tokens
- **Sports Correlation**: Team performance impact on token prices

### Brazilian Market Focus
Complete support for official Chiliz Brazilian football club tokens:
- Flamengo (MENGO)
- Corinthians (SCCP)
- São Paulo (SPFC)
- Atlético Mineiro (GALO)
- Palmeiras (VERDAO)
- Fluminense (FLU)
- Vasco da Gama (VASCO)
- Athletico Paranaense (CAP)
- Fortaleza (FOR)

### FanX DEX Integration
- Liquidity pool analytics
- Optimal swap routing
- APY calculations
- Impermanent loss tracking

## 📦 Installation

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

## 🛠️ Configuration

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

## 📚 Available Tools

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

### Analytics Tools
- `track_whale_movements` - Monitor large transactions
- `analyze_token_velocity` - Trading volume analysis
- `detect_unusual_patterns` - Anomaly detection
- `get_liquidity_metrics` - DEX liquidity analytics

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

## 💻 Development

### Project Structure
```
chiliz-mcp/
├── src/
│   ├── tools/         # MCP tool implementations
│   ├── api/           # External API clients
│   ├── types/         # TypeScript definitions
│   └── index.ts       # Main MCP server
├── landing-page/      # Documentation website
├── tests/             # Test suites
└── examples/          # Usage examples
```

### Running Tests
```bash
npm test
npm run test:coverage
```

### Building from Source
```bash
npm run build
npm run dev  # Development mode with watch
```

## 🌍 Deployment

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

```bash
docker build -t chiliz-mcp .
docker run -d --name chiliz-mcp -p 3000:3000 chiliz-mcp
```

## 📖 Documentation

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
  tokens: ['MENGO', 'SCCP', 'SANTOS']
});

// Swap tokens via FanX DEX
const swap = await mcp.callTool('swap_tokens', {
  tokenIn: 'CHZ',
  tokenOut: 'MENGO',
  amount: '100'
});
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Priority Areas
- 🔴 1inch DEX integration
- 🔴 WebSocket real-time updates
- 🟡 Historical data storage
- 🟡 NFT support
- 🟢 Documentation improvements

## 📜 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Links

- [Chiliz Chain](https://chiliz.com)
- [FanX DEX](https://fanx.chiliz.com)
- [Documentation](https://chiliz-mcp.vercel.app)
- [Discord Community](https://discord.gg/chiliz)
- [Report Issues](https://github.com/BrunoPessoa22/chiliz-mcp/issues)

## ⚡ Quick Commands

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

## 🙏 Acknowledgments

Built with ❤️ for the Chiliz community. Special thanks to all Brazilian football fans! 🇧🇷

---

**Note**: This is an independent project and is not officially affiliated with Chiliz. Always verify smart contract addresses and exercise caution when handling private keys.