import { OfflineLanguageService } from '../../services/OfflineLanguageService';

// Mock localforage
jest.mock('localforage', () => ({
  createInstance: jest.fn(() => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    length: jest.fn(),
    keys: jest.fn(),
    clear: jest.fn(),
  })),
}));

describe('OfflineLanguageService', () => {
  const mockLanguagePacks = [
    {
      id: 'en-critical',
      name: 'English (Critical)',
      type: 'critical',
      size: 1024 * 1024, // 1MB
      description: 'Critical medical terms in English',
    },
    {
      id: 'en-full',
      name: 'English (Full)',
      type: 'full',
      size: 5 * 1024 * 1024, // 5MB
      description: 'Complete medical vocabulary in English',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset storage info
    (OfflineLanguageService as any).storageInfo = {
      available: 100 * 1024 * 1024, // 100MB
      total: 120 * 1024 * 1024,     // 120MB
      used: 20 * 1024 * 1024,       // 20MB
    };
  });

  describe('Language Pack Management', () => {
    it('should get available language packs', async () => {
      jest.spyOn(OfflineLanguageService, 'getAvailableLanguagePacks')
        .mockResolvedValue(mockLanguagePacks);

      const packs = await OfflineLanguageService.getAvailableLanguagePacks();
      
      expect(packs).toHaveLength(2);
      expect(packs[0].type).toBe('critical');
      expect(packs[1].type).toBe('full');
    });

    it('should install language pack', async () => {
      const mockPack = mockLanguagePacks[0];
      jest.spyOn(OfflineLanguageService, 'getAvailableLanguagePacks')
        .mockResolvedValue([mockPack]);
      jest.spyOn(OfflineLanguageService, 'getStorageInfo')
        .mockResolvedValue({
          available: 50 * 1024 * 1024,
          total: 100 * 1024 * 1024,
          used: 50 * 1024 * 1024,
        });

      await OfflineLanguageService.installLanguagePack(mockPack.id);
      
      const installed = await OfflineLanguageService.getInstalledLanguagePacks();
      expect(installed).toContainEqual(expect.objectContaining({ id: mockPack.id }));
    });

    it('should prevent installation if insufficient storage', async () => {
      const mockPack = mockLanguagePacks[1]; // 5MB pack
      jest.spyOn(OfflineLanguageService, 'getStorageInfo')
        .mockResolvedValue({
          available: 1 * 1024 * 1024, // Only 1MB available
          total: 100 * 1024 * 1024,
          used: 99 * 1024 * 1024,
        });

      await expect(OfflineLanguageService.installLanguagePack(mockPack.id))
        .rejects
        .toThrow('Insufficient storage space');
    });

    it('should not allow uninstalling critical packs', async () => {
      const criticalPack = mockLanguagePacks[0];
      
      await expect(OfflineLanguageService.uninstallLanguagePack(criticalPack.id))
        .rejects
        .toThrow('Cannot uninstall critical language pack');
    });
  });

  describe('Storage Management', () => {
    it('should get accurate storage information', async () => {
      const storageInfo = await OfflineLanguageService.getStorageInfo();
      
      expect(storageInfo).toHaveProperty('available');
      expect(storageInfo).toHaveProperty('total');
      expect(storageInfo).toHaveProperty('used');
      expect(storageInfo.total).toBeGreaterThan(storageInfo.used);
    });

    it('should cleanup unused language data', async () => {
      const initialStorage = await OfflineLanguageService.getStorageInfo();
      await OfflineLanguageService.cleanupStorage();
      const finalStorage = await OfflineLanguageService.getStorageInfo();

      expect(finalStorage.available).toBeGreaterThanOrEqual(initialStorage.available);
    });
  });

  describe('Language Settings', () => {
    it('should set and get current language', async () => {
      const language = 'en-US';
      await OfflineLanguageService.setCurrentLanguage(language);
      const current = await OfflineLanguageService.getCurrentLanguage();

      expect(current).toBe(language);
    });

    it('should fall back to default language if requested language is not installed', async () => {
      const unavailableLanguage = 'unavailable-lang';
      await OfflineLanguageService.setCurrentLanguage(unavailableLanguage);
      const current = await OfflineLanguageService.getCurrentLanguage();

      expect(current).toBe('en'); // Default language
    });
  });

  describe('Pack Validation', () => {
    it('should validate pack integrity after download', async () => {
      const mockPack = mockLanguagePacks[0];
      const validatePack = jest.spyOn(OfflineLanguageService as any, 'validatePackIntegrity');
      
      await OfflineLanguageService.installLanguagePack(mockPack.id);
      
      expect(validatePack).toHaveBeenCalled();
    });

    it('should handle corrupt pack data', async () => {
      const mockPack = mockLanguagePacks[0];
      jest.spyOn(OfflineLanguageService as any, 'validatePackIntegrity')
        .mockRejectedValue(new Error('Corrupt pack data'));

      await expect(OfflineLanguageService.installLanguagePack(mockPack.id))
        .rejects
        .toThrow('Corrupt pack data');
    });
  });
});
