import { ContractDeployer } from '../contracts/deployer.js';
import { getRPCUrl, getExplorerUrl } from '../config/index.js';

export async function deployCustomContract(params: {
  sourceCode: string;
  contractName: string;
  constructorArgs?: any[];
}): Promise<{
  success: boolean;
  deployment: {
    contractAddress: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
    deployerAddress: string;
  };
  explorerUrl: string;
}> {
  const rpcUrl = getRPCUrl();
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable required for deployment');
  }

  // Deploy
  const deployer = new ContractDeployer(rpcUrl, privateKey);

  const result = await deployer.deploy(
    params.sourceCode,
    params.contractName,
    params.constructorArgs || []
  );

  const explorerUrl = getExplorerUrl();

  return {
    success: true,
    deployment: result,
    explorerUrl: `${explorerUrl}/address/${result.contractAddress}`,
  };
}
