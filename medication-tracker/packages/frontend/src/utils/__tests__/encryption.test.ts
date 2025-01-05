import { EncryptionService, NotificationData, isEncryptedData } from '../encryption';

describe('EncryptionService', () => {
  const testNotification: NotificationData = {
    id: '123',
    title: 'Take Medicine',
    body: 'Time to take your daily medication',
    timestamp: '2024-12-10T16:25:26.000Z',
    type: 'medication',
    metadata: {
      medicationId: 'med_123',
      dosage: '10mg'
    }
  };

  it('should encrypt and decrypt notification data correctly', async () => {
    const encrypted = await EncryptionService.encryptNotification(testNotification);
    
    // Verify encrypted data format
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('data');
    expect(typeof encrypted.iv).toBe('string');
    expect(typeof encrypted.data).toBe('string');

    // Verify decryption
    const decrypted = await EncryptionService.decryptNotification(encrypted);
    expect(decrypted).toEqual(testNotification);
  });

  it('should throw error when decrypting invalid data', async () => {
    const invalidData = {
      iv: 'invalid-iv',
      data: 'invalid-data'
    };

    await expect(EncryptionService.decrypt(invalidData)).rejects.toThrow();
  });

  it('should correctly identify encrypted data', () => {
    const validEncryptedData = {
      iv: 'base64-iv',
      data: 'base64-data'
    };

    const invalidData1 = {
      iv: 123,
      data: 'string'
    };

    const invalidData2 = {
      someOtherField: 'value'
    };

    expect(isEncryptedData(validEncryptedData)).toBe(true);
    expect(isEncryptedData(invalidData1)).toBe(false);
    expect(isEncryptedData(invalidData2)).toBe(false);
  });

  it('should handle large datasets', async () => {
    const largeNotification: NotificationData = {
      ...testNotification,
      metadata: {
        ...testNotification.metadata,
        additionalData: 'x'.repeat(1000) // Add 1KB of data
      }
    };

    const encrypted = await EncryptionService.encryptNotification(largeNotification);
    const decrypted = await EncryptionService.decryptNotification(encrypted);
    expect(decrypted).toEqual(largeNotification);
  });

  it('should handle special characters in data', async () => {
    const specialCharsNotification: NotificationData = {
      ...testNotification,
      body: '特殊字符!@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./',
      metadata: {
        ...testNotification.metadata,
        specialField: '🎉👨‍👩‍👧‍👦🌟'
      }
    };

    const encrypted = await EncryptionService.encryptNotification(specialCharsNotification);
    const decrypted = await EncryptionService.decryptNotification(encrypted);
    expect(decrypted).toEqual(specialCharsNotification);
  });
});
