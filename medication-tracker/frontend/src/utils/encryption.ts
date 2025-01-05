import { Buffer } from 'buffer';
import { KeyRotationService } from './keyRotation';
import { RetryStrategy } from './retryStrategy';
import SecurityAnalytics from './securityAnalytics';

interface EncryptedData {
  iv: string;
  data: string;
  keyVersion: number;
}

export class EncryptionService {
  private static async getKey(): Promise<CryptoKey> {
    const keyData = await KeyRotationService.getCurrentKey();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      Buffer.from(keyData.key, 'base64'),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    return key;
  }

  static async encrypt(data: any): Promise<EncryptedData> {
    SecurityAnalytics.startTracking('encryption');
    
    try {
      const result = await RetryStrategy.withRetry(async () => {
        const keyData = await KeyRotationService.getCurrentKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        
        const key = await crypto.subtle.importKey(
          'raw',
          Buffer.from(keyData.key, 'base64'),
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        );

        const encryptedData = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv,
          },
          key,
          encoder.encode(JSON.stringify(data))
        );

        return {
          iv: Buffer.from(iv).toString('base64'),
          data: Buffer.from(encryptedData).toString('base64'),
          keyVersion: keyData.version,
        };
      }, {
        maxAttempts: 3,
        initialDelay: 1000,
      });

      SecurityAnalytics.endTracking('encryption', true, {
        dataSize: JSON.stringify(data).length,
        keyVersion: result.keyVersion,
      });

      return result;
    } catch (error) {
      SecurityAnalytics.endTracking('encryption', false, {
        error: error.message,
        dataSize: JSON.stringify(data).length,
      });
      throw error;
    }
  }

  static async decrypt(encryptedData: EncryptedData): Promise<any> {
    SecurityAnalytics.startTracking('decryption');
    
    try {
      const result = await RetryStrategy.withRetry(async () => {
        const keys = await KeyRotationService.getAllKeys();
        const keyData = keys.find(k => k.version === encryptedData.keyVersion);
        
        if (!keyData) {
          throw new Error(`No key found for version ${encryptedData.keyVersion}`);
        }

        const key = await crypto.subtle.importKey(
          'raw',
          Buffer.from(keyData.key, 'base64'),
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );

        const iv = Buffer.from(encryptedData.iv, 'base64');
        const data = Buffer.from(encryptedData.data, 'base64');

        const decryptedData = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv,
          },
          key,
          data
        );

        const decoder = new TextDecoder();
        const result = JSON.parse(decoder.decode(decryptedData));

        SecurityAnalytics.endTracking('decryption', true, {
          dataSize: data.length,
          keyVersion: encryptedData.keyVersion,
        });

        return result;
      }, {
        maxAttempts: 3,
        initialDelay: 1000,
      });

      return result;
    } catch (error) {
      SecurityAnalytics.endTracking('decryption', false, {
        error: error.message,
        keyVersion: encryptedData.keyVersion,
      });
      throw error;
    }
  }

  static async encryptNotification(notification: NotificationData): Promise<EncryptedData> {
    return this.encrypt(notification);
  }

  static async decryptNotification(encryptedData: EncryptedData): Promise<NotificationData> {
    return this.decrypt(encryptedData);
  }
}

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'medication' | 'refill' | 'appointment';
  metadata?: {
    medicationId?: string;
    dosage?: string;
    appointmentId?: string;
    [key: string]: any;
  };
}

// Helper function to check if data is encrypted
export const isEncryptedData = (data: any): data is EncryptedData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'iv' in data &&
    'data' in data &&
    'keyVersion' in data &&
    typeof data.iv === 'string' &&
    typeof data.data === 'string' &&
    typeof data.keyVersion === 'number'
  );
};
