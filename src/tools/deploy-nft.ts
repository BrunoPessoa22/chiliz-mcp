import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ContractDeployer } from '../contracts/deployer.js';
import { getRPCUrl, getExplorerUrl } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function deployNFTCollection(params: {
  name: string;
  symbol: string;
  maxSupply: number;
  baseTokenURI: string;
}): Promise<{
  success: boolean;
  deployment: {
    contractAddress: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
    deployerAddress: string;
  };
  collectionDetails: {
    name: string;
    symbol: string;
    maxSupply: number;
    baseTokenURI: string;
  };
  explorerUrl: string;
}> {
  const rpcUrl = getRPCUrl();
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable required for deployment');
  }

  // Load template
  const templatePath = path.join(__dirname, '../contracts/templates/ERC721Template.sol');
  const sourceCode = fs.readFileSync(templatePath, 'utf8');

  // Deploy
  const deployer = new ContractDeployer(rpcUrl, privateKey);

  const result = await deployer.deploy(
    sourceCode,
    'CustomNFT',
    [params.name, params.symbol, params.maxSupply, params.baseTokenURI]
  );

  const explorerUrl = getExplorerUrl();

  return {
    success: true,
    deployment: result,
    collectionDetails: {
      name: params.name,
      symbol: params.symbol,
      maxSupply: params.maxSupply,
      baseTokenURI: params.baseTokenURI,
    },
    explorerUrl: `${explorerUrl}/address/${result.contractAddress}`,
  };
}
