import solc from 'solc';
import fs from 'fs';
import path from 'path';

export interface CompilerOutput {
  abi: any[];
  bytecode: string;
  contractName: string;
}

export class SolidityCompiler {
  private loadImports(importPath: string): { contents: string } {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules', importPath);
    try {
      const contents = fs.readFileSync(nodeModulesPath, 'utf8');
      return { contents };
    } catch (error) {
      throw new Error(`Failed to load import: ${importPath}`);
    }
  }

  compile(sourceCode: string, contractName: string): CompilerOutput {
    const input = {
      language: 'Solidity',
      sources: {
        'Contract.sol': {
          content: sourceCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    };

    const output = JSON.parse(
      solc.compile(JSON.stringify(input), {
        import: (importPath: string) => this.loadImports(importPath),
      })
    );

    if (output.errors) {
      const errors = output.errors.filter((e: any) => e.severity === 'error');
      if (errors.length > 0) {
        throw new Error(`Compilation errors: ${JSON.stringify(errors, null, 2)}`);
      }
    }

    const contract = output.contracts['Contract.sol'][contractName];
    if (!contract) {
      throw new Error(`Contract ${contractName} not found in compilation output`);
    }

    return {
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      contractName,
    };
  }
}
