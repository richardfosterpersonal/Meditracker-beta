import { HIPAAComplianceService } from './HIPAAComplianceService';
import { EventTrackingService } from '../monitoring/EventTrackingService';
import { Buffer } from 'buffer';

/**
 * Service responsible for handling data encryption and decryption
 * Uses AES-256-GCM for encryption and implements HIPAA compliance requirements
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private hipaaCompliance: HIPAAComplianceService;
  private eventTracking: EventTrackingService;
  private keyCache: Map<string, CryptoKey>;
  private readonly ENCRYPTION_ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;

  private constructor() {
    this.hipaaCompliance = HIPAAComplianceService.getInstance();
    this.eventTracking = EventTrackingService.getInstance();
    this.keyCache = new Map();
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Encrypts sensitive data using AES-256-GCM
   * @param data - Data to encrypt
   * @param keyId - Identifier for the encryption key
   * @returns Encrypted data with IV and authentication tag
   */
  public async encrypt(data: any, keyId: string): Promise<string> {
    try {
      const key = await this.getOrGenerateKey(keyId);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(JSON.stringify(data));

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ENCRYPTION_ALGORITHM,
          iv,
        },
        key,
        encodedData
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Track encryption event
      await this.eventTracking.trackEvent({
        type: 'DATA_ENCRYPTED',
        category: 'security',
        action: 'encrypt',
        metadata: {
          keyId,
          timestamp: new Date().toISOString()
        }
      });

      return Buffer.from(combined).toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts encrypted data using AES-256-GCM
   * @param encryptedData - Base64 encoded encrypted data
   * @param keyId - Identifier for the decryption key
   * @returns Decrypted data
   */
  public async decrypt(encryptedData: string, keyId: string): Promise<any> {
    try {
      const key = await this.getOrGenerateKey(keyId);
      const combined = new Uint8Array(Buffer.from(encryptedData, 'base64'));
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ENCRYPTION_ALGORITHM,
          iv,
        },
        key,
        data
      );

      // Track decryption event
      await this.eventTracking.trackEvent({
        type: 'DATA_DECRYPTED',
        category: 'security',
        action: 'decrypt',
        metadata: {
          keyId,
          timestamp: new Date().toISOString()
        }
      });

      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generates or retrieves a cryptographic key
   * @param keyId - Identifier for the key
   * @returns CryptoKey
   */
  private async getOrGenerateKey(keyId: string): Promise<CryptoKey> {
    if (this.keyCache.has(keyId)) {
      return this.keyCache.get(keyId)!;
    }

    const key = await crypto.subtle.generateKey(
      {
        name: this.ENCRYPTION_ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );

    this.keyCache.set(keyId, key);
    return key;
  }

  /**
   * Rotates encryption keys periodically
   * @param oldKeyId - Current key identifier
   * @returns New key identifier
   */
  public async rotateKey(oldKeyId: string): Promise<string> {
    try {
      const newKeyId = `key-${Date.now()}`;
      await this.getOrGenerateKey(newKeyId);
      this.keyCache.delete(oldKeyId);

      // Track key rotation
      await this.eventTracking.trackEvent({
        type: 'KEY_ROTATED',
        category: 'security',
        action: 'key_rotation',
        metadata: {
          oldKeyId,
          newKeyId,
          timestamp: new Date().toISOString()
        }
      });

      return newKeyId;
    } catch (error) {
      console.error('Key rotation error:', error);
      throw new Error('Failed to rotate encryption key');
    }
  }

  /**
   * Validates the encryption configuration
   * @returns boolean indicating if the configuration is valid
   */
  public async validateConfiguration(): Promise<boolean> {
    try {
      const testKey = await this.getOrGenerateKey('test-key');
      const testData = { test: 'data' };
      const encrypted = await this.encrypt(testData, 'test-key');
      const decrypted = await this.decrypt(encrypted, 'test-key');
      
      return JSON.stringify(testData) === JSON.stringify(decrypted);
    } catch (error) {
      console.error('Encryption configuration validation failed:', error);
      return false;
    }
  }
}
