# Chiliz MCP Documentation

Welcome to the comprehensive documentation for the Chiliz MCP (Model Context Protocol) server.

## Table of Contents

### Getting Started
- [Quick Start Guide](./QUICKSTART.md)
- [Installation](./INSTALLATION.md)
- [Configuration](./CONFIGURATION.md)

### Architecture
- [System Architecture](./ARCHITECTURE.md)
- [Security Model](./SECURITY.md)
- [Error Handling](./ERROR_HANDLING.md)

### Features
- [Smart Contract Deployment](./DEPLOYMENT.md)
- [Real-time Monitoring](./REALTIME_MONITORING.md)
- [Portfolio Tracking](./PORTFOLIO_TRACKING.md)
- [DEX Integration](./DEX_INTEGRATION.md)

### Tools Reference
- [Price Tools](./tools/PRICE_TOOLS.md)
- [Wallet Tools](./tools/WALLET_TOOLS.md)
- [Transaction Tools](./tools/TRANSACTION_TOOLS.md)
- [Deployment Tools](./tools/DEPLOYMENT_TOOLS.md)
- [Analytics Tools](./tools/ANALYTICS_TOOLS.md)

### Advanced Topics
- [WebSocket Streaming](./advanced/WEBSOCKET_STREAMING.md)
- [Gas Optimization](./advanced/GAS_OPTIMIZATION.md)
- [Error Recovery](./advanced/ERROR_RECOVERY.md)
- [Performance Tuning](./advanced/PERFORMANCE.md)

### Development
- [Contributing Guide](../CONTRIBUTING.md)
- [Testing Guide](./TESTING.md)
- [API Reference](./API.md)

### Deployment
- [Docker Deployment](./deployment/DOCKER.md)
- [Cloud Deployment](./deployment/CLOUD.md)
- [CI/CD Setup](./deployment/CICD.md)
- [Monitoring Setup](./deployment/MONITORING.md)

### API Integration
- [1inch DEX](./integrations/ONEINCH.md)
- [CoinGecko](./integrations/COINGECKO.md)
- [FanX DEX](./integrations/FANX.md)

## Overview

The Chiliz MCP is an advanced blockchain integration server designed for the Chiliz ecosystem, supporting:

- **51+ MCP Tools** for blockchain operations
- **45+ Fan Tokens** including major sports teams
- **8 API Integrations** for comprehensive data
- **Real-time WebSocket** monitoring and alerts
- **Smart Contract** deployment capabilities
- **Advanced Analytics** for portfolios and trading

## Key Features

### 🔐 Security First
- Encrypted private key storage with `KeyManager`
- Transaction confirmation system with `TransactionSigner`
- Rate limiting and request validation
- Comprehensive error handling

### ⚡ Real-time Capabilities
- WebSocket price streaming with `PriceStream`
- Whale transaction alerts
- DEX activity monitoring
- Live portfolio tracking

### 🚀 Smart Contract Deployment
- Deploy ERC-20 tokens
- Deploy NFT collections (ERC-721)
- Deploy custom Solidity contracts
- On-the-fly compilation with OpenZeppelin support

### 📊 Advanced Analytics
- Gas estimation and optimization with `GasEstimator`
- Portfolio tracking and diversity analysis with `PortfolioTracker`
- Token velocity and whale movement detection
- Social sentiment analysis

### 🔄 DEX Integration
- 1inch aggregator integration with `OneInchClient`
- FanX DEX liquidity analytics
- Optimal swap routing
- Impermanent loss tracking

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Chiliz MCP Server                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Security   │  │   Streaming  │  │     DEX      │      │
│  │              │  │              │  │              │      │
│  │ KeyManager   │  │ PriceStream  │  │ OneInchClient│      │
│  │ TxSigner     │  │ WhaleAlerts  │  │ FanX Client  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Analytics   │  │  Deployment  │  │  Monitoring  │      │
│  │              │  │              │  │              │      │
│  │ GasEstimator │  │ Compiler     │  │ Telemetry    │      │
│  │ Portfolio    │  │ Deployer     │  │ Metrics      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Error Handler & Retry Logic             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │        External Integrations            │
        ├─────────────────────────────────────────┤
        │ • Chiliz RPC (HTTP/WebSocket)          │
        │ • CoinGecko API                         │
        │ • 1inch DEX Aggregator                  │
        │ • FanX DEX                              │
        │ • Block Explorers                       │
        └─────────────────────────────────────────┘
```

## Quick Example

```typescript
// Deploy an ERC-20 token
const token = await mcp.callTool('deploy_erc20_token', {
  name: 'Fan Token',
  symbol: 'FAN',
  initialSupply: 1000000
});

// Track portfolio
const portfolio = await mcp.callTool('track_portfolio', {
  address: '0x...'
});

// Get gas estimate
const gas = await mcp.callTool('estimate_gas', {
  to: '0x...',
  value: '0.1'
});

// Start price streaming
await priceStream.start();
priceStream.on('whale_alert', (alert) => {
  console.log(`Whale alert: ${alert.amountUSD} USD`);
});
```

## Support

- **GitHub Issues**: [Report bugs](https://github.com/BrunoPessoa22/chiliz-mcp/issues)
- **Discord**: [Join community](https://discord.gg/chiliz)
- **Documentation**: [Full docs](https://chiliz-mcp.vercel.app)

## License

MIT License - see [LICENSE](../LICENSE) file
