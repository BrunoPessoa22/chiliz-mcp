import { ethers } from 'ethers';
import { SolidityCompiler } from './compiler.js';

export interface DeploymentResult {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  deployerAddress: string;
}

export class ContractDeployer {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private compiler: SolidityCompiler;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.compiler = new SolidityCompiler();
  }

  async deploy(
    sourceCode: string,
    contractName: string,
    constructorArgs: any[] = []
  ): Promise<DeploymentResult> {
    // Compile contract
    const compiled = this.compiler.compile(sourceCode, contractName);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      compiled.abi,
      compiled.bytecode,
      this.wallet
    );

    // Deploy
    const contract = await factory.deploy(...constructorArgs);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const deployTx = contract.deploymentTransaction();

    if (!deployTx) {
      throw new Error('Deployment transaction not found');
    }

    const receipt = await deployTx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    return {
      contractAddress: address,
      transactionHash: deployTx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      deployerAddress: this.wallet.address,
    };
  }

  async estimateDeploymentGas(
    sourceCode: string,
    contractName: string,
    constructorArgs: any[] = []
  ): Promise<bigint> {
    const compiled = this.compiler.compile(sourceCode, contractName);
    const factory = new ethers.ContractFactory(
      compiled.abi,
      compiled.bytecode,
      this.wallet
    );

    const deployTx = await factory.getDeployTransaction(...constructorArgs);
    return await this.provider.estimateGas(deployTx);
  }
}
