import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ContractDeployer } from '../contracts/deployer.js';
import { getRPCUrl, getExplorerUrl } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function deployERC20Token(params: {
  name: string;
  symbol: string;
  initialSupply: number;
}): Promise<{
  success: boolean;
  deployment: {
    contractAddress: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
    deployerAddress: string;
  };
  tokenDetails: {
    name: string;
    symbol: string;
    initialSupply: number;
    decimals: number;
  };
  explorerUrl: string;
}> {
  const rpcUrl = getRPCUrl();
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable required for deployment');
  }

  // Load template
  const templatePath = path.join(__dirname, '../contracts/templates/ERC20Template.sol');
  const sourceCode = fs.readFileSync(templatePath, 'utf8');

  // Deploy
  const deployer = new ContractDeployer(rpcUrl, privateKey);

  const result = await deployer.deploy(
    sourceCode,
    'CustomToken',
    [params.name, params.symbol, params.initialSupply]
  );

  const explorerUrl = getExplorerUrl();

  return {
    success: true,
    deployment: result,
    tokenDetails: {
      name: params.name,
      symbol: params.symbol,
      initialSupply: params.initialSupply,
      decimals: 18,
    },
    explorerUrl: `${explorerUrl}/address/${result.contractAddress}`,
  };
}
