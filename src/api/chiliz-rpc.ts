import { ethers } from 'ethers';
import { config, getRPCUrl, getChainConfig } from '../config/index.js';
import { cacheManager } from '../utils/cache.js';
import { rateLimiter } from '../utils/rateLimiter.js';
import { WalletBalance, BlockchainInfo, Transaction, APIError } from '../types/index.js';

// ERC-20 ABI for token interactions
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// Token addresses on Chiliz Chain
const TOKEN_ADDRESSES: Record<string, string> = {
  'PSG': '0x4D6B9f281AF31916a0f16d1cEA2AE3B8B7c05f7b',
  'JUV': '0xaB7D44E32dbFa0608251a40043d5e4F95C2d1050',
  'BAR': '0xB5f6c2A93a36C674d5D554170Ca4fF8cf0879AD9',
  'ACM': '0x982e46e81E99Fbfb201cD1A078a9e7C83b9B049d',
  'INTER': '0x1C6aAD90b31fBcdf3fCbD37e26feFc09b3b3912C',
  'ATM': '0xC688e3BD87FabCcc9e14f5dCd4c872d40908bA0a',
  'GAL': '0x7Ed73a87bf3e7587F55C1726ee676eE95f842ad9',
  'CITY': '0xc60F08875dcc59F4B05c0E96a5a31D99e88Dd290',
  'ASR': '0xAAaD2F04719eBE2de1d9c3f61e0b756e56D0C891',
  'UFC': '0x96957C4Ef5aa3b31e9705b7Fa08f6F572B91bE80',
  'LAZIO': '0xdbC5C48EFD41180e5DDDdE65a43C0D3C96f3cf9b',
  // Add more token addresses as needed
};

export class ChilizRPCClient {
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;

  constructor(privateKey?: string) {
    const rpcUrl = getRPCUrl();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    } else if (process.env.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    }

    // Configure rate limiter
    rateLimiter.configure('rpc', config.rateLimit.rpc);
  }

  async getBalance(address: string): Promise<WalletBalance> {
    const cacheKey = `balance_${address}`;
    const cached = cacheManager.get('balances', cacheKey);
    if (cached) {
      return cached;
    }

    await rateLimiter.waitForLimit('rpc');

    try {
      // Get CHZ balance
      const chzBalance = await this.provider.getBalance(address);
      const chzFormatted = parseFloat(ethers.formatEther(chzBalance));

      // Get fan token balances
      const fanTokenBalances = [];

      for (const [symbol, tokenAddress] of Object.entries(TOKEN_ADDRESSES)) {
        try {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
          const balance = await tokenContract.balanceOf(address);

          if (balance > 0n) {
            const decimals = await tokenContract.decimals();
            const name = await tokenContract.name();
            const formatted = parseFloat(ethers.formatUnits(balance, decimals));

            fanTokenBalances.push({
              symbol,
              name,
              balance: balance.toString(),
              balanceFormatted: formatted,
              contractAddress: tokenAddress
            });
          }
        } catch (error) {
          // Skip tokens that fail
          if (config.debug) {
            console.error(`Failed to get balance for ${symbol}:`, error);
          }
        }
      }

      const result: WalletBalance = {
        address,
        chzBalance: chzBalance.toString(),
        chzBalanceFormatted: chzFormatted,
        fanTokens: fanTokenBalances
      };

      cacheManager.set('balances', cacheKey, result);
      return result;
    } catch (error: any) {
      throw {
        code: 'RPC_ERROR',
        message: `Failed to get wallet balance: ${error.message}`,
        details: error
      } as APIError;
    }
  }

  async getBlockchainInfo(): Promise<BlockchainInfo> {
    const cacheKey = 'blockchain_info';
    const cached = cacheManager.get('blockchainInfo', cacheKey);
    if (cached) {
      return cached;
    }

    await rateLimiter.waitForLimit('rpc');

    try {
      const [blockNumber, block, gasPrice, network] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getBlock('latest'),
        this.provider.getFeeData(),
        this.provider.getNetwork()
      ]);

      const chainConfig = getChainConfig();

      const result: BlockchainInfo = {
        chainId: Number(network.chainId),
        chainName: chainConfig.name,
        blockHeight: blockNumber,
        blockTime: block?.timestamp || 0,
        gasPrice: gasPrice.gasPrice?.toString() || '0',
        networkStatus: 'healthy',
        lastUpdate: new Date().toISOString()
      };

      cacheManager.set('blockchainInfo', cacheKey, result);
      return result;
    } catch (error: any) {
      throw {
        code: 'RPC_ERROR',
        message: `Failed to get blockchain info: ${error.message}`,
        details: error
      } as APIError;
    }
  }

  async getTransaction(txHash: string): Promise<Transaction> {
    const cacheKey = `tx_${txHash}`;
    const cached = cacheManager.get('transactions', cacheKey);
    if (cached) {
      return cached;
    }

    await rateLimiter.waitForLimit('rpc');

    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash)
      ]);

      if (!tx) {
        throw new Error('Transaction not found');
      }

      const block = await this.provider.getBlock(tx.blockNumber || 'latest');

      const result: Transaction = {
        hash: txHash,
        blockNumber: receipt?.blockNumber || 0,
        blockHash: receipt?.blockHash || '',
        timestamp: block?.timestamp || 0,
        from: tx.from,
        to: tx.to || '',
        value: tx.value.toString(),
        valueFormatted: parseFloat(ethers.formatEther(tx.value)),
        gasUsed: receipt?.gasUsed.toString() || '0',
        gasPrice: tx.gasPrice?.toString() || '0',
        status: receipt?.status === 1 ? 'success' : receipt?.status === 0 ? 'failed' : 'pending',
      };

      // Parse token transfers from logs
      if (receipt?.logs) {
        const transferTopic = ethers.id('Transfer(address,address,uint256)');
        const tokenTransfers = [];

        for (const log of receipt.logs) {
          if (log.topics[0] === transferTopic && log.topics.length === 3) {
            try {
              const from = ethers.getAddress('0x' + log.topics[1].slice(26));
              const to = ethers.getAddress('0x' + log.topics[2].slice(26));
              const amount = log.data;

              // Try to get token symbol
              let symbol = '';
              const tokenAddress = log.address;
              for (const [sym, addr] of Object.entries(TOKEN_ADDRESSES)) {
                if (addr.toLowerCase() === tokenAddress.toLowerCase()) {
                  symbol = sym;
                  break;
                }
              }

              tokenTransfers.push({
                from,
                to,
                token: tokenAddress,
                amount,
                symbol
              });
            } catch (error) {
              // Skip malformed logs
            }
          }
        }

        if (tokenTransfers.length > 0) {
          result.tokenTransfers = tokenTransfers;
        }
      }

      cacheManager.set('transactions', cacheKey, result);
      return result;
    } catch (error: any) {
      throw {
        code: 'RPC_ERROR',
        message: `Failed to get transaction: ${error.message}`,
        details: error
      } as APIError;
    }
  }

  // Enhanced transaction capabilities
  async sendCHZ(to: string, amount: string): Promise<{ hash: string; status: string }> {
    if (!this.wallet) {
      throw new Error('No wallet configured. Set PRIVATE_KEY in environment variables.');
    }

    await rateLimiter.waitForLimit('rpc');

    try {
      const tx = await this.wallet.sendTransaction({
        to,
        value: ethers.parseEther(amount)
      });

      return {
        hash: tx.hash,
        status: 'pending'
      };
    } catch (error: any) {
      throw {
        code: 'TRANSACTION_ERROR',
        message: `Failed to send CHZ: ${error.message}`,
        details: error
      } as APIError;
    }
  }

  async sendFanToken(token: string, to: string, amount: string): Promise<{ hash: string; status: string }> {
    if (!this.wallet) {
      throw new Error('No wallet configured. Set PRIVATE_KEY in environment variables.');
    }

    const tokenAddress = TOKEN_ADDRESSES[token.toUpperCase()];
    if (!tokenAddress) {
      throw new Error(`Unknown token: ${token}`);
    }

    await rateLimiter.waitForLimit('rpc');

    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      const decimals = await tokenContract.decimals();
      const tx = await tokenContract.transfer(to, ethers.parseUnits(amount, decimals));

      return {
        hash: tx.hash,
        status: 'pending'
      };
    } catch (error: any) {
      throw {
        code: 'TRANSACTION_ERROR',
        message: `Failed to send ${token}: ${error.message}`,
        details: error
      } as APIError;
    }
  }

  async approveToken(token: string, spender: string, amount: string): Promise<{ hash: string; status: string }> {
    if (!this.wallet) {
      throw new Error('No wallet configured. Set PRIVATE_KEY in environment variables.');
    }

    const tokenAddress = TOKEN_ADDRESSES[token.toUpperCase()];
    if (!tokenAddress) {
      throw new Error(`Unknown token: ${token}`);
    }

    await rateLimiter.waitForLimit('rpc');

    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      const decimals = await tokenContract.decimals();
      const tx = await tokenContract.approve(spender, ethers.parseUnits(amount, decimals));

      return {
        hash: tx.hash,
        status: 'pending'
      };
    } catch (error: any) {
      throw {
        code: 'TRANSACTION_ERROR',
        message: `Failed to approve ${token}: ${error.message}`,
        details: error
      } as APIError;
    }
  }

  async getTokenHolders(_tokenAddress: string, _limit: number = 10): Promise<any[]> {
    // This would require indexing service or graph protocol
    // For now, return a placeholder
    return [];
  }

  async detectWhaleTransactions(minValueUSD: number = 100000): Promise<any[]> {
    await rateLimiter.waitForLimit('rpc');

    try {
      const latestBlock = await this.provider.getBlockNumber();
      const block = await this.provider.getBlock(latestBlock, true);

      if (!block || !block.transactions) {
        return [];
      }

      const whaleTransactions = [];

      // Get CHZ price
      const chzPriceUSD = 0.1; // You would get this from CoinGecko

      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue;

        // TypeScript needs explicit type checking for transaction objects
        const txObj = tx as ethers.TransactionResponse;
        const valueInEther = parseFloat(ethers.formatEther(txObj.value));
        const valueInUSD = valueInEther * chzPriceUSD;

        if (valueInUSD >= minValueUSD) {
          whaleTransactions.push({
            hash: txObj.hash,
            from: txObj.from,
            to: txObj.to,
            value: valueInEther,
            valueUSD: valueInUSD,
            blockNumber: latestBlock
          });
        }
      }

      return whaleTransactions;
    } catch (error: any) {
      throw {
        code: 'RPC_ERROR',
        message: `Failed to detect whale transactions: ${error.message}`,
        details: error
      } as APIError;
    }
  }

  async getWalletAddress(): Promise<string | null> {
    return this.wallet ? this.wallet.address : null;
  }
}