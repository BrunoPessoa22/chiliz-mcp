import { ChilizRPCClient } from '../api/chiliz-rpc.js';
import { WalletBalance } from '../types/index.js';

export async function getWalletBalance(address: string): Promise<WalletBalance> {
  const client = new ChilizRPCClient();
  return await client.getBalance(address);
}

export async function getMyWalletBalance(): Promise<WalletBalance | null> {
  const client = new ChilizRPCClient();
  const address = await client.getWalletAddress();

  if (!address) {
    return null;
  }

  return await client.getBalance(address);
}