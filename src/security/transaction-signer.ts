import { ethers } from 'ethers';
import { KeyManager } from './key-manager.js';

export interface TransactionRequest {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce?: number;
  chainId?: number;
}

export interface SignedTransaction {
  raw: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  chainId: number;
}

export interface TransactionConfirmation {
  approved: boolean;
  reason?: string;
  timestamp: number;
}

/**
 * Secure transaction signing with user confirmation
 */
export class TransactionSigner {
  private keyManager: KeyManager;
  private provider: ethers.Provider;
  private confirmationCallback?: (tx: TransactionRequest) => Promise<TransactionConfirmation>;

  constructor(
    rpcUrl: string,
    keyManager?: KeyManager,
    confirmationCallback?: (tx: TransactionRequest) => Promise<TransactionConfirmation>
  ) {
    this.keyManager = keyManager || new KeyManager();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.confirmationCallback = confirmationCallback;
  }

  /**
   * Sign a transaction with user confirmation
   */
  async signTransaction(
    txRequest: TransactionRequest,
    keyId: string = 'default'
  ): Promise<SignedTransaction> {
    // Request user confirmation if callback is set
    if (this.confirmationCallback) {
      const confirmation = await this.confirmationCallback(txRequest);
      if (!confirmation.approved) {
        throw new Error(`Transaction rejected: ${confirmation.reason || 'User declined'}`);
      }
    }

    // Get private key
    const privateKey = await this.keyManager.getPrivateKey(keyId);
    const wallet = new ethers.Wallet(privateKey, this.provider);

    // Prepare transaction
    const tx: ethers.TransactionRequest = {
      to: txRequest.to,
      value: txRequest.value ? ethers.parseEther(txRequest.value) : 0n,
      data: txRequest.data || '0x',
      chainId: txRequest.chainId
    };

    // Fill in missing fields
    if (txRequest.nonce !== undefined) {
      tx.nonce = txRequest.nonce;
    } else {
      tx.nonce = await wallet.getNonce();
    }

    if (txRequest.gasLimit) {
      tx.gasLimit = BigInt(txRequest.gasLimit);
    } else {
      try {
        tx.gasLimit = await this.provider.estimateGas({
          from: wallet.address,
          to: tx.to,
          value: tx.value,
          data: tx.data
        });
      } catch (error) {
        // Fallback to a safe default
        tx.gasLimit = 21000n;
      }
    }

    if (txRequest.gasPrice) {
      tx.gasPrice = BigInt(txRequest.gasPrice);
    } else {
      const feeData = await this.provider.getFeeData();
      tx.gasPrice = feeData.gasPrice || 1000000000n; // 1 gwei fallback
    }

    // Sign transaction
    const signedTx = await wallet.signTransaction(tx);
    const parsedTx = ethers.Transaction.from(signedTx);

    return {
      raw: signedTx,
      hash: parsedTx.hash || '',
      from: wallet.address,
      to: (tx.to || '').toString(),
      value: tx.value?.toString() || '0',
      gasLimit: tx.gasLimit?.toString() || '0',
      gasPrice: tx.gasPrice?.toString() || '0',
      nonce: Number(tx.nonce) || 0,
      chainId: Number(tx.chainId) || 0
    };
  }

  /**
   * Sign and send a transaction
   */
  async signAndSendTransaction(
    txRequest: TransactionRequest,
    keyId: string = 'default'
  ): Promise<ethers.TransactionResponse> {
    const privateKey = await this.keyManager.getPrivateKey(keyId);
    const wallet = new ethers.Wallet(privateKey, this.provider);

    // Request confirmation
    if (this.confirmationCallback) {
      const confirmation = await this.confirmationCallback(txRequest);
      if (!confirmation.approved) {
        throw new Error(`Transaction rejected: ${confirmation.reason || 'User declined'}`);
      }
    }

    // Prepare transaction
    const tx: ethers.TransactionRequest = {
      to: txRequest.to,
      value: txRequest.value ? ethers.parseEther(txRequest.value) : 0n,
      data: txRequest.data || '0x'
    };

    // Fill in optional fields
    if (txRequest.gasLimit) tx.gasLimit = BigInt(txRequest.gasLimit);
    if (txRequest.gasPrice) tx.gasPrice = BigInt(txRequest.gasPrice);
    if (txRequest.nonce !== undefined) tx.nonce = txRequest.nonce;
    if (txRequest.chainId) tx.chainId = txRequest.chainId;

    // Send transaction
    return await wallet.sendTransaction(tx);
  }

  /**
   * Sign a message
   */
  async signMessage(message: string, keyId: string = 'default'): Promise<string> {
    const privateKey = await this.keyManager.getPrivateKey(keyId);
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
  }

  /**
   * Sign typed data (EIP-712)
   */
  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>,
    keyId: string = 'default'
  ): Promise<string> {
    const privateKey = await this.keyManager.getPrivateKey(keyId);
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signTypedData(domain, types, value);
  }

  /**
   * Get wallet address without exposing private key
   */
  async getAddress(keyId: string = 'default'): Promise<string> {
    const privateKey = await this.keyManager.getPrivateKey(keyId);
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  }

  /**
   * Verify a signature
   */
  verifySignature(message: string, signature: string): string {
    return ethers.verifyMessage(message, signature);
  }

  /**
   * Set confirmation callback
   */
  setConfirmationCallback(
    callback: (tx: TransactionRequest) => Promise<TransactionConfirmation>
  ): void {
    this.confirmationCallback = callback;
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(txRequest: TransactionRequest, keyId: string = 'default'): Promise<bigint> {
    const privateKey = await this.keyManager.getPrivateKey(keyId);
    const wallet = new ethers.Wallet(privateKey, this.provider);

    return await this.provider.estimateGas({
      from: wallet.address,
      to: txRequest.to,
      value: txRequest.value ? ethers.parseEther(txRequest.value) : 0n,
      data: txRequest.data || '0x'
    });
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || 1000000000n;
  }

  /**
   * Get transaction count (nonce)
   */
  async getTransactionCount(keyId: string = 'default'): Promise<number> {
    const address = await this.getAddress(keyId);
    return await this.provider.getTransactionCount(address);
  }
}
