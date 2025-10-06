# System Architecture

## Overview

The Chiliz MCP follows a modular, layered architecture designed for scalability, reliability, and maintainability.

## Architecture Layers

### 1. Presentation Layer (MCP Interface)
```
┌─────────────────────────────────────┐
│   Model Context Protocol (MCP)      │
│   - Tool Registration               │
│   - Request/Response Handling       │
│   - Schema Validation               │
└─────────────────────────────────────┘
```

**Responsibilities:**
- Tool registration and discovery
- Request validation and routing
- Response formatting
- Error serialization

**Key Files:**
- `src/index.ts` - Main MCP server
- `src/tools/*.ts` - Individual tool implementations

### 2. Service Layer
```
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                           │
├───────────────┬───────────────┬────────────────────────┤
│   Security    │   Streaming   │   Contract Deployment  │
│               │               │                        │
│ • KeyManager  │ • PriceStream │ • Compiler            │
│ • TxSigner    │ • Events      │ • Deployer            │
└───────────────┴───────────────┴────────────────────────┘
```

**Responsibilities:**
- Business logic implementation
- Data processing and transformation
- Service orchestration

**Key Components:**
- **Security Services** (`src/security/`)
  - `KeyManager` - Encrypted key storage
  - `TransactionSigner` - Transaction signing and confirmation

- **Streaming Services** (`src/streaming/`)
  - `PriceStream` - Real-time price updates and alerts

- **Deployment Services** (`src/contracts/`)
  - `SolidityCompiler` - On-the-fly contract compilation
  - `ContractDeployer` - Contract deployment orchestration

### 3. Integration Layer
```
┌─────────────────────────────────────────────────────────┐
│                Integration Layer                         │
├────────────────┬────────────────┬────────────────────────┤
│   Blockchain   │   External APIs │   DEX Integration     │
│                │                 │                       │
│ • RPC Client   │ • CoinGecko     │ • 1inch              │
│ • WebSocket    │ • Block Explorer│ • FanX               │
└────────────────┴────────────────┴────────────────────────┘
```

**Responsibilities:**
- External API communication
- Data fetching and caching
- Protocol adaptation

**Key Components:**
- **Blockchain** (`src/api/chiliz-rpc.ts`)
  - JSON-RPC communication
  - WebSocket event handling

- **External APIs** (`src/api/`)
  - `CoinGeckoClient` - Price data
  - Block explorer integration

- **DEX** (`src/dex/`)
  - `OneInchClient` - Multi-DEX routing

### 4. Cross-Cutting Concerns
```
┌─────────────────────────────────────────────────────────┐
│              Cross-Cutting Concerns                      │
├───────────────┬──────────────┬──────────────────────────┤
│ Error Handler │  Monitoring  │   Configuration          │
│               │              │                          │
│ • Retry Logic │ • Telemetry  │ • Schema Validation     │
│ • Circuit     │ • Metrics    │ • Environment Config    │
│   Breaker     │ • Health     │                         │
└───────────────┴──────────────┴──────────────────────────┘
```

**Components:**
- **Error Handling** (`src/errors/`)
  - Custom error types
  - Automatic retry with exponential backoff
  - Circuit breaker pattern

- **Monitoring** (`src/monitoring/`)
  - Telemetry collection
  - Performance metrics
  - Health checks

- **Configuration** (`src/config/`)
  - Zod schema validation
  - Environment variable management

## Data Flow

### Request Flow (Read Operation)
```
User Request
    ↓
MCP Server (validate)
    ↓
Tool Handler
    ↓
Service Layer (business logic)
    ↓
Integration Layer (fetch data)
    ↓
Error Handler (retry if needed)
    ↓
Cache Layer
    ↓
Response
```

### Request Flow (Write Operation)
```
User Request
    ↓
MCP Server (validate)
    ↓
Tool Handler
    ↓
Security Layer (KeyManager, TxSigner)
    ↓
Service Layer (business logic)
    ↓
Blockchain (sign & send transaction)
    ↓
Wait for confirmation
    ↓
Telemetry (record metrics)
    ↓
Response
```

### Streaming Flow
```
WebSocket Connection
    ↓
PriceStream.start()
    ↓
Subscribe to events
    ├─→ Price Updates (CoinGecko API, polling)
    ├─→ Whale Alerts (Blockchain events)
    └─→ DEX Activity (Smart contract logs)
    ↓
Event Emitter
    ↓
User Callbacks
```

## Component Dependencies

```
┌──────────────────────────────────────────────────────────┐
│                      MCP Tools                            │
│  (51+ tools organized by category)                       │
└──────────────────────────────────────────────────────────┘
                    ↓ depends on
┌──────────────────────────────────────────────────────────┐
│                   Service Layer                           │
│  • Security (KeyManager, TransactionSigner)              │
│  • Analytics (GasEstimator, PortfolioTracker)           │
│  • Streaming (PriceStream)                               │
│  • Deployment (Compiler, Deployer)                       │
└──────────────────────────────────────────────────────────┘
                    ↓ depends on
┌──────────────────────────────────────────────────────────┐
│              Integration Layer                            │
│  • Blockchain RPC (ethers.js)                            │
│  • External APIs (axios)                                 │
│  • DEX Clients (1inch, FanX)                             │
└──────────────────────────────────────────────────────────┘
                    ↓ uses
┌──────────────────────────────────────────────────────────┐
│           Cross-Cutting Concerns                          │
│  • Error Handler (retry logic, circuit breaker)          │
│  • Telemetry (metrics, events)                           │
│  • Config (validation, environment)                      │
└──────────────────────────────────────────────────────────┘
```

## Security Architecture

### Key Management Flow
```
Private Key (Environment or User Input)
    ↓
KeyManager.storeKey()
    ↓
Encrypt with AES-256-GCM
    ↓
Store in .keys.enc (file system)
    ↓
Decrypt on demand
    ↓
Use in TransactionSigner
    ↓
Sign transaction
    ↓
Clear from memory
```

### Transaction Signing Flow
```
Transaction Request
    ↓
Validation (addresses, amounts, gas)
    ↓
Confirmation Callback (optional)
    ↓
User approves/rejects
    ↓
KeyManager.getPrivateKey()
    ↓
TransactionSigner.signTransaction()
    ↓
Estimate gas
    ↓
Sign with ethers.js
    ↓
Return signed transaction
```

## Error Handling Architecture

### Retry Strategy
```
Operation
    ↓
Try execution
    ↓
    ├─→ Success → Return result
    │
    └─→ Error
        ↓
        Check if retryable
        ↓
        ├─→ Yes
        │   ↓
        │   Calculate backoff delay
        │   ↓
        │   Wait (exponential backoff)
        │   ↓
        │   Retry (up to max attempts)
        │
        └─→ No → Throw error
```

### Circuit Breaker
```
Request
    ↓
Check circuit state
    ├─→ OPEN → Return error (fast fail)
    ├─→ HALF_OPEN → Try request
    │                ├─→ Success → Close circuit
    │                └─→ Failure → Keep open
    └─→ CLOSED → Execute request
                 ├─→ Success → Reset failure count
                 └─→ Failure → Increment count
                              ├─→ < threshold → Continue
                              └─→ ≥ threshold → Open circuit
```

## Monitoring Architecture

### Telemetry Collection
```
Request Start
    ↓
Record metric (request_start)
    ↓
Execute operation
    ↓
    ├─→ Success
    │   ↓
    │   Record metric (request_duration)
    │   Record metric (request_success)
    │
    └─→ Error
        ↓
        Record metric (request_duration)
        Record metric (request_error)
        Record event (error_details)
    ↓
Update aggregated metrics
    • Total requests
    • Success rate
    • Error rate
    • p95/p99 response times
    ↓
Expose via /metrics endpoint (Prometheus format)
```

## Scalability Considerations

### Horizontal Scaling
- Stateless design allows multiple instances
- Redis for shared caching
- Load balancer distribution

### Vertical Scaling
- Efficient memory management
- Connection pooling
- Request batching where applicable

### Caching Strategy
```
Request
    ↓
Check cache (Redis or in-memory)
    ├─→ Hit → Return cached data
    │
    └─→ Miss
        ↓
        Fetch from source
        ↓
        Store in cache (with TTL)
        ↓
        Return data
```

## Technology Stack

### Core
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.5+
- **Protocol**: Model Context Protocol (MCP)

### Blockchain
- **Library**: ethers.js v6
- **Compiler**: solc (Solidity compiler)
- **Standards**: ERC-20, ERC-721 (OpenZeppelin)

### External Services
- **Price Data**: CoinGecko API
- **DEX Aggregation**: 1inch API
- **Blockchain RPC**: Ankr, custom endpoints

### Infrastructure
- **Caching**: Redis (optional)
- **Monitoring**: Prometheus + Grafana
- **Container**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

### Development
- **Testing**: Jest + ts-jest
- **Validation**: Zod schemas
- **Linting**: TypeScript ESLint

## Design Patterns

### Service Layer Patterns
- **Dependency Injection**: Services receive dependencies via constructor
- **Factory Pattern**: ContractDeployer creates contract instances
- **Repository Pattern**: Data access abstraction

### Error Handling Patterns
- **Retry Pattern**: Exponential backoff for transient failures
- **Circuit Breaker**: Fast fail for persistent failures
- **Error Wrapping**: Consistent error types across layers

### Async Patterns
- **Promise-based**: All async operations return Promises
- **Event Emitter**: Real-time streaming via EventEmitter
- **Stream Processing**: Batch operations for efficiency

## Future Enhancements

1. **GraphQL API**: Add GraphQL layer for complex queries
2. **Event Sourcing**: Transaction history as event stream
3. **CQRS**: Separate read/write models for optimization
4. **Multi-chain**: Support for multiple blockchain networks
5. **ML Integration**: Predictive analytics for price movements
