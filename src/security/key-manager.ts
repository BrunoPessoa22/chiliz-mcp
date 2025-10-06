import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Secure key management with encryption at rest
 */
export class KeyManager {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly KEY_FILE = '.keys.enc';

  private encryptionKey: Buffer;
  private keyStorePath: string;

  constructor(password?: string) {
    this.keyStorePath = path.join(process.cwd(), KeyManager.KEY_FILE);

    // Derive encryption key from password or environment
    const secret = password || process.env.KEY_MANAGER_PASSWORD || 'default-insecure-key';
    this.encryptionKey = crypto.scryptSync(secret, 'salt', KeyManager.KEY_LENGTH);
  }

  /**
   * Store a private key securely with encryption
   */
  async storeKey(keyId: string, privateKey: string): Promise<void> {
    const keys = await this.loadKeys();

    // Encrypt the private key
    const iv = crypto.randomBytes(KeyManager.IV_LENGTH);
    const cipher = crypto.createCipheriv(
      KeyManager.ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      iv
    );

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Store encrypted key with IV and auth tag
    keys[keyId] = {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      createdAt: Date.now()
    };

    await this.saveKeys(keys);
  }

  /**
   * Retrieve and decrypt a stored private key
   */
  async getKey(keyId: string): Promise<string | null> {
    const keys = await this.loadKeys();
    const keyData = keys[keyId];

    if (!keyData) {
      return null;
    }

    try {
      const decipher = crypto.createDecipheriv(
        KeyManager.ENCRYPTION_ALGORITHM,
        this.encryptionKey,
        Buffer.from(keyData.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(keyData.authTag, 'hex'));

      let decrypted = decipher.update(keyData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt key: Invalid password or corrupted data');
    }
  }

  /**
   * Delete a stored key
   */
  async deleteKey(keyId: string): Promise<boolean> {
    const keys = await this.loadKeys();

    if (!keys[keyId]) {
      return false;
    }

    delete keys[keyId];
    await this.saveKeys(keys);
    return true;
  }

  /**
   * List all stored key IDs
   */
  async listKeys(): Promise<string[]> {
    const keys = await this.loadKeys();
    return Object.keys(keys);
  }

  /**
   * Check if a key exists
   */
  async hasKey(keyId: string): Promise<boolean> {
    const keys = await this.loadKeys();
    return keyId in keys;
  }

  /**
   * Get key from environment or key store
   */
  async getPrivateKey(keyId: string = 'default'): Promise<string> {
    // First, try environment variable
    const envKey = process.env.PRIVATE_KEY;
    if (envKey) {
      return envKey;
    }

    // Then, try key store
    const storedKey = await this.getKey(keyId);
    if (storedKey) {
      return storedKey;
    }

    throw new Error(
      'No private key found. Set PRIVATE_KEY environment variable or store a key using KeyManager.'
    );
  }

  /**
   * Load encrypted keys from file
   */
  private async loadKeys(): Promise<Record<string, any>> {
    if (!fs.existsSync(this.keyStorePath)) {
      return {};
    }

    try {
      const data = fs.readFileSync(this.keyStorePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to load key store, starting fresh');
      return {};
    }
  }

  /**
   * Save encrypted keys to file
   */
  private async saveKeys(keys: Record<string, any>): Promise<void> {
    const data = JSON.stringify(keys, null, 2);
    fs.writeFileSync(this.keyStorePath, data, { mode: 0o600 });
  }

  /**
   * Clear all stored keys
   */
  async clearAllKeys(): Promise<void> {
    if (fs.existsSync(this.keyStorePath)) {
      fs.unlinkSync(this.keyStorePath);
    }
  }
}
