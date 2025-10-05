import { ChilizRPCClient } from '../api/chiliz-rpc.js';
import { BlockchainInfo, Transaction } from '../types/index.js';

export async function getBlockchainInfo(): Promise<BlockchainInfo> {
  const client = new ChilizRPCClient();
  return await client.getBlockchainInfo();
}

export async function getTransaction(txHash: string): Promise<Transaction> {
  const client = new ChilizRPCClient();
  return await client.getTransaction(txHash);
}