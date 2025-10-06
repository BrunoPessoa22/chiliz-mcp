import { ethers } from 'ethers';

export class DeploymentValidator {
  static validatePrivateKey(key: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(key) || /^[a-fA-F0-9]{64}$/.test(key);
  }

  static validateSourceCode(code: string): void {
    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /selfdestruct/i, name: 'selfdestruct' },
      { pattern: /delegatecall/i, name: 'delegatecall' },
    ];

    for (const { pattern, name } of dangerousPatterns) {
      if (pattern.test(code)) {
        console.warn(`Warning: Potentially dangerous pattern detected: ${name}`);
      }
    }
  }

  static async validateNetwork(rpcUrl: string): Promise<void> {
    // Verify we're on Chiliz network
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();

    const validChainIds = [
      88888n, // Chiliz mainnet
      88882n, // Chiliz testnet (Spicy)
    ];

    if (!validChainIds.includes(network.chainId)) {
      throw new Error(`Invalid network. Expected Chiliz, got chainId: ${network.chainId}`);
    }
  }

  static validateTokenParams(params: { name: string; symbol: string; initialSupply: number }): void {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Token name is required');
    }
    if (!params.symbol || params.symbol.trim().length === 0) {
      throw new Error('Token symbol is required');
    }
    if (params.symbol.length > 11) {
      throw new Error('Token symbol must be 11 characters or less');
    }
    if (params.initialSupply <= 0) {
      throw new Error('Initial supply must be greater than 0');
    }
  }

  static validateNFTParams(params: { name: string; symbol: string; maxSupply: number; baseTokenURI: string }): void {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Collection name is required');
    }
    if (!params.symbol || params.symbol.trim().length === 0) {
      throw new Error('Collection symbol is required');
    }
    if (params.symbol.length > 11) {
      throw new Error('Collection symbol must be 11 characters or less');
    }
    if (params.maxSupply <= 0) {
      throw new Error('Max supply must be greater than 0');
    }
    if (!params.baseTokenURI || params.baseTokenURI.trim().length === 0) {
      throw new Error('Base token URI is required');
    }
  }
}
