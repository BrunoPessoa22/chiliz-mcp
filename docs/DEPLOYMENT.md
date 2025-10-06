# Smart Contract Deployment Guide

## Overview

The Chiliz MCP includes powerful smart contract deployment tools that allow you to deploy custom ERC-20 tokens, NFT collections, and arbitrary Solidity contracts directly to the Chiliz blockchain.

## Prerequisites

### Required
- **Private Key**: A wallet private key with CHZ for gas fees
- **RPC URL**: Configured Chiliz RPC endpoint (automatically set to Ankr mainnet)
- **PRIVATE_KEY in .env**: Your private key must be set as an environment variable

### Security Warning
⚠️ **NEVER commit your private key to version control!**
- Keep your `.env` file in `.gitignore`
- Use test networks for development
- Consider using a dedicated deployment wallet

## Available Tools

### 1. Deploy ERC-20 Token (`deploy_erc20_token`)

Deploy a custom fungible token following the ERC-20 standard.

**Parameters:**
- `name` (string): Token name (e.g., "Fan Token")
- `symbol` (string): Token symbol (e.g., "FAN", max 11 characters)
- `initialSupply` (number): Initial supply in tokens (not wei)

**Features:**
- OpenZeppelin contracts for security
- Mintable by owner
- 18 decimals (standard)
- Optimized gas usage

**Example:**
```javascript
const result = await mcp.callTool('deploy_erc20_token', {
  name: 'Flamengo Fan Token',
  symbol: 'MENGO',
  initialSupply: 1000000
});

console.log('Contract Address:', result.deployment.contractAddress);
console.log('Transaction Hash:', result.deployment.transactionHash);
console.log('Explorer URL:', result.explorerUrl);
```

**Response:**
```json
{
  "success": true,
  "deployment": {
    "contractAddress": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "1234567",
    "deployerAddress": "0x..."
  },
  "tokenDetails": {
    "name": "Flamengo Fan Token",
    "symbol": "MENGO",
    "initialSupply": 1000000,
    "decimals": 18
  },
  "explorerUrl": "https://chiliscan.com/address/0x..."
}
```

### 2. Deploy NFT Collection (`deploy_nft_collection`)

Deploy an ERC-721 NFT collection with batch minting capabilities.

**Parameters:**
- `name` (string): Collection name (e.g., "Match Highlights")
- `symbol` (string): Collection symbol (e.g., "HIGHLIGHT", max 11 characters)
- `maxSupply` (number): Maximum number of NFTs that can be minted
- `baseTokenURI` (string): Base URI for token metadata (e.g., "ipfs://QmXxx/")

**Features:**
- ERC-721 standard compliance
- URI storage for metadata
- Batch minting support
- Max supply enforcement
- Owner-controlled minting

**Example:**
```javascript
const result = await mcp.callTool('deploy_nft_collection', {
  name: 'Corinthians Match Moments',
  symbol: 'SCCP-NFT',
  maxSupply: 10000,
  baseTokenURI: 'ipfs://QmYourCIDHere/'
});

console.log('NFT Contract:', result.deployment.contractAddress);
```

**Response:**
```json
{
  "success": true,
  "deployment": {
    "contractAddress": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 12346,
    "gasUsed": "2345678",
    "deployerAddress": "0x..."
  },
  "collectionDetails": {
    "name": "Corinthians Match Moments",
    "symbol": "SCCP-NFT",
    "maxSupply": 10000,
    "baseTokenURI": "ipfs://QmYourCIDHere/"
  },
  "explorerUrl": "https://chiliscan.com/address/0x..."
}
```

### 3. Deploy Custom Contract (`deploy_custom_contract`)

Deploy any custom Solidity smart contract.

**Parameters:**
- `sourceCode` (string): Complete Solidity source code
- `contractName` (string): Name of the contract to deploy (must match contract name in source)
- `constructorArgs` (array, optional): Constructor arguments as JSON array

**Features:**
- Compiles Solidity code on-the-fly
- Supports OpenZeppelin imports
- Optimizer enabled (200 runs)
- Gas estimation before deployment

**Example:**
```javascript
const sourceCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 private value;

    constructor(uint256 _initialValue) {
        value = _initialValue;
    }

    function setValue(uint256 _value) public {
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}
`;

const result = await mcp.callTool('deploy_custom_contract', {
  sourceCode: sourceCode,
  contractName: 'SimpleStorage',
  constructorArgs: [42]
});
```

## Step-by-Step Guide

### Setting Up Your Environment

1. **Install Chiliz MCP**
```bash
npm install -g chiliz-mcp
```

2. **Configure Environment Variables**
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your private key
nano .env
```

Add to `.env`:
```env
# Required for deployment
PRIVATE_KEY=0xyourprivatekeyhere

# Network configuration
CHILIZ_RPC_URL=https://rpc.ankr.com/chiliz
NETWORK=mainnet
```

3. **Test on Testnet First**

Always test on Chiliz testnet (Spicy) before mainnet:

```env
NETWORK=testnet
CHILIZ_RPC_URL=https://spicy-rpc.chiliz.com
```

### Deploying Your First Token

```javascript
// In Claude Desktop or via MCP client
const deployment = await mcp.callTool('deploy_erc20_token', {
  name: 'My Fan Token',
  symbol: 'MYFAN',
  initialSupply: 1000000
});

// Save the contract address
const contractAddress = deployment.deployment.contractAddress;

// Verify on block explorer
console.log(`Verify at: ${deployment.explorerUrl}`);
```

### Deploying an NFT Collection

```javascript
const nftDeployment = await mcp.callTool('deploy_nft_collection', {
  name: 'Fan Collectibles',
  symbol: 'FANCOL',
  maxSupply: 5000,
  baseTokenURI: 'ipfs://QmYourMetadataFolder/'
});

// Contract is now live!
console.log('NFT Contract:', nftDeployment.deployment.contractAddress);
```

## Advanced Features

### Gas Optimization

All contracts are compiled with optimizer enabled:
- **Runs**: 200
- **Optimized bytecode**: Yes
- **Estimated gas**: Available before deployment

### Contract Verification

After deployment, verify your contract on Chiliscan:

1. Visit `https://chiliscan.com/address/YOUR_CONTRACT_ADDRESS`
2. Click "Verify Contract"
3. Use compiler version: `v0.8.20+commit.a1b79de6`
4. Optimization: Yes, 200 runs
5. Paste your source code

### Interacting with Deployed Contracts

Use the other MCP tools to interact with your deployed contracts:

```javascript
// Approve token spending
await mcp.callTool('approve_token', {
  token: contractAddress,
  spender: '0xRouterAddress',
  amount: '1000000000000000000'
});

// Send tokens
await mcp.callTool('send_tokens', {
  to: '0xRecipientAddress',
  amount: '100',
  token: contractAddress
});
```

## Error Handling

### Common Errors

**"PRIVATE_KEY environment variable required"**
- Solution: Add your private key to `.env` file

**"Insufficient funds for gas"**
- Solution: Ensure your wallet has enough CHZ for gas fees

**"Compilation errors"**
- Solution: Check your Solidity syntax and import statements

**"Invalid network"**
- Solution: Verify you're connected to Chiliz mainnet (88888) or testnet (88882)

### Debugging

Enable debug mode for verbose logging:
```env
DEBUG=true
```

## Best Practices

### Security
1. **Never share your private key**
2. **Use separate wallets for development and production**
3. **Test thoroughly on testnet before mainnet**
4. **Audit contracts before deploying significant value**
5. **Be aware of dangerous patterns** (selfdestruct, delegatecall)

### Development Workflow
1. Write contract locally
2. Test with Hardhat/Foundry
3. Deploy to testnet via MCP
4. Verify functionality
5. Deploy to mainnet
6. Verify contract on explorer

### Gas Management
- Test deployment on testnet to estimate costs
- Current Chiliz gas prices are typically low
- Consider deploying during off-peak hours

## Examples

### Fan Token with Custom Features
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TeamFanToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18;

    constructor() ERC20("Team Fan Token", "TEAM") Ownable(msg.sender) {
        _mint(msg.sender, 100000000 * 10**18);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}
```

### NFT with Royalties
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RoyaltyNFT is ERC721, ERC2981, Ownable {
    uint256 private _tokenIds;

    constructor() ERC721("Royalty NFT", "RNFT") Ownable(msg.sender) {
        _setDefaultRoyalty(msg.sender, 500); // 5% royalty
    }

    function mint(address to) public onlyOwner returns (uint256) {
        _tokenIds++;
        _safeMint(to, _tokenIds);
        return _tokenIds;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

## Resources

- [Chiliz Documentation](https://docs.chiliz.com)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Solidity Documentation](https://docs.soliditylang.org)
- [Chiliz Block Explorer](https://chiliscan.com)

## Support

For issues or questions:
- GitHub Issues: https://github.com/BrunoPessoa22/chiliz-mcp/issues
- Discord: https://discord.gg/chiliz
- Email: bruno.pessoa@chiliz.com
