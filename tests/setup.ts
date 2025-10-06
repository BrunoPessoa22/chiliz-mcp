// Test setup file
import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CHILIZ_RPC_URL = process.env.CHILIZ_RPC_URL || 'https://rpc.ankr.com/chiliz';
process.env.CHILIZ_WSS_URL = process.env.CHILIZ_WSS_URL || 'wss://rpc.ankr.com/chiliz/ws';
process.env.NETWORK = 'testnet';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
