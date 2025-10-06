import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { KeyManager } from '../../src/security/key-manager.js';
import fs from 'fs';
import path from 'path';

describe('KeyManager', () => {
  let keyManager: KeyManager;
  const testKeyId = 'test-key';
  const testPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const keyFilePath = path.join(process.cwd(), '.keys.enc');

  beforeEach(() => {
    keyManager = new KeyManager('test-password');
    // Clean up any existing key file
    if (fs.existsSync(keyFilePath)) {
      fs.unlinkSync(keyFilePath);
    }
  });

  afterEach(async () => {
    // Clean up
    await keyManager.clearAllKeys();
  });

  describe('storeKey', () => {
    it('should store a private key', async () => {
      await keyManager.storeKey(testKeyId, testPrivateKey);
      const hasKey = await keyManager.hasKey(testKeyId);
      expect(hasKey).toBe(true);
    });

    it('should encrypt the stored key', async () => {
      await keyManager.storeKey(testKeyId, testPrivateKey);
      // Read the file and verify it's not plain text
      const fileContent = fs.readFileSync(keyFilePath, 'utf8');
      expect(fileContent).not.toContain(testPrivateKey);
    });
  });

  describe('getKey', () => {
    it('should retrieve a stored key', async () => {
      await keyManager.storeKey(testKeyId, testPrivateKey);
      const retrievedKey = await keyManager.getKey(testKeyId);
      expect(retrievedKey).toBe(testPrivateKey);
    });

    it('should return null for non-existent key', async () => {
      const retrievedKey = await keyManager.getKey('non-existent');
      expect(retrievedKey).toBeNull();
    });

    it('should throw error with wrong password', async () => {
      await keyManager.storeKey(testKeyId, testPrivateKey);

      const wrongPasswordManager = new KeyManager('wrong-password');
      await expect(wrongPasswordManager.getKey(testKeyId)).rejects.toThrow();
    });
  });

  describe('deleteKey', () => {
    it('should delete a stored key', async () => {
      await keyManager.storeKey(testKeyId, testPrivateKey);
      const deleted = await keyManager.deleteKey(testKeyId);
      expect(deleted).toBe(true);

      const hasKey = await keyManager.hasKey(testKeyId);
      expect(hasKey).toBe(false);
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await keyManager.deleteKey('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('listKeys', () => {
    it('should list all stored keys', async () => {
      await keyManager.storeKey('key1', testPrivateKey);
      await keyManager.storeKey('key2', testPrivateKey);

      const keys = await keyManager.listKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });

    it('should return empty array when no keys stored', async () => {
      const keys = await keyManager.listKeys();
      expect(keys).toEqual([]);
    });
  });

  describe('getPrivateKey', () => {
    it('should get key from environment variable', async () => {
      const originalEnv = process.env.PRIVATE_KEY;
      process.env.PRIVATE_KEY = testPrivateKey;

      const key = await keyManager.getPrivateKey();
      expect(key).toBe(testPrivateKey);

      process.env.PRIVATE_KEY = originalEnv;
    });

    it('should get key from store if env not set', async () => {
      const originalEnv = process.env.PRIVATE_KEY;
      delete process.env.PRIVATE_KEY;

      await keyManager.storeKey('default', testPrivateKey);
      const key = await keyManager.getPrivateKey();
      expect(key).toBe(testPrivateKey);

      process.env.PRIVATE_KEY = originalEnv;
    });

    it('should throw error if no key found', async () => {
      const originalEnv = process.env.PRIVATE_KEY;
      delete process.env.PRIVATE_KEY;

      await expect(keyManager.getPrivateKey()).rejects.toThrow('No private key found');

      process.env.PRIVATE_KEY = originalEnv;
    });
  });
});
