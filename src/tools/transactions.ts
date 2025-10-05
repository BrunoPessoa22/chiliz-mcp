import { ChilizRPCClient } from '../api/chiliz-rpc.js';

export async function sendTokens(params: {
  to: string;
  amount: string;
  token?: string;
}): Promise<{ hash: string; status: string }> {
  const client = new ChilizRPCClient();

  if (!params.token || params.token.toUpperCase() === 'CHZ') {
    return await client.sendCHZ(params.to, params.amount);
  } else {
    return await client.sendFanToken(params.token, params.to, params.amount);
  }
}

export async function approveToken(params: {
  token: string;
  spender: string;
  amount: string;
}): Promise<{ hash: string; status: string }> {
  const client = new ChilizRPCClient();
  return await client.approveToken(params.token, params.spender, params.amount);
}

export async function swapTokens(_params: {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: number;
}): Promise<{ hash: string; status: string }> {
  // This would integrate with 1inch or another DEX aggregator
  // For now, returning a placeholder
  return {
    hash: '0x...',
    status: 'not_implemented'
  };
}