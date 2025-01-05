import localforage from 'localforage';
import { liabilityProtection } from '../utils/liabilityProtection';

interface LanguagePack {
  locale: string;
  translations: Record<string, string>;
  lastUpdated: string;
  version: string;
}

interface LanguagePackMetadata {
  locale: string;
  name: string;
  nativeName: string;
  size: number;
  version: string;
  lastUpdated: string;
  requiredStorage: number;
  criticalOnly: boolean;
}

interface LanguagePackOptions {
  criticalOnly?: boolean;  // Only download emergency and critical medical terms
  includeMedicalTerms?: boolean;  // Include comprehensive medical vocabulary
  includeRegionalVariants?: boolean;  // Include regional language variations
}

class OfflineLanguageService {
  private static readonly STORAGE_KEY = 'offline_language_packs';
  private static readonly CRITICAL_PACK_SIZE = 100 * 1024; // 100KB for critical terms
  private static readonly FULL_PACK_SIZE = 5 * 1024 * 1024; // 5MB for full pack
  private installedPacks: Map<string, LanguagePack> = new Map();
  private storage: LocalForage;

  constructor() {
    this.storage = localforage.createInstance({
      name: 'MedicationTracker',
      storeName: 'languagePacks'
    });
    this.initialize();
    this.scheduleAutoCleanup();
  }

  private async initialize(): Promise<void> {
    try {
      // Load installed packs from storage
      const storedPacks = await this.storage.getItem<Record<string, LanguagePack>>(
        OfflineLanguageService.STORAGE_KEY
      );

      if (storedPacks) {
        Object.entries(storedPacks).forEach(([locale, pack]) => {
          this.installedPacks.set(locale, pack);
        });
      }

      // Log initialization
      liabilityProtection.logCriticalAction(
        'OFFLINE_LANGUAGE_INITIALIZED',
        'system',
        {
          installedPacks: Array.from(this.installedPacks.keys()),
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to initialize offline language service:', error);
      liabilityProtection.logLiabilityRisk(
        'OFFLINE_LANGUAGE_INIT_FAILED',
        'MEDIUM',
        { error }
      );
    }
  }

  public async getPackMetadata(locale: string): Promise<LanguagePackMetadata> {
    try {
      const response = await fetch(`/api/language-packs/${locale}/metadata`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to get metadata for ${locale}:`, error);
      throw error;
    }
  }

  public async estimateStorageRequirement(options: LanguagePackOptions): Promise<number> {
    let estimatedSize = 0;
    if (options.criticalOnly) {
      estimatedSize = this.CRITICAL_PACK_SIZE;
    } else {
      estimatedSize = options.includeMedicalTerms ? this.FULL_PACK_SIZE : this.FULL_PACK_SIZE / 2;
    }
    if (options.includeRegionalVariants) {
      estimatedSize *= 1.3; // 30% more for regional variants
    }
    return estimatedSize;
  }

  public async installLanguagePack(
    locale: string,
    options: LanguagePackOptions = { criticalOnly: true }
  ): Promise<void> {
    try {
      const metadata = await this.getPackMetadata(locale);
      const storageInfo = await this.checkStorageUsage();
      
      // Show storage requirement warning if necessary
      if (metadata.requiredStorage > storageInfo.available) {
        throw new Error(`Insufficient storage. Required: ${this.formatSize(metadata.requiredStorage)}, Available: ${this.formatSize(storageInfo.available)}`);
      }

      // Fetch appropriate pack based on options
      const endpoint = options.criticalOnly 
        ? `/api/language-packs/${locale}/critical`
        : `/api/language-packs/${locale}/full`;

      const response = await fetch(endpoint);
      const pack: LanguagePack = await response.json();

      // Store pack
      this.installedPacks.set(locale, pack);
      await this.persistPacks();

      // Log installation
      liabilityProtection.logCriticalAction(
        'LANGUAGE_PACK_INSTALLED',
        'current-user',
        {
          locale,
          version: pack.version,
          options,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error(`Failed to install language pack for ${locale}:`, error);
      throw error;
    }
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  public async suggestPackOption(locale: string): Promise<LanguagePackOptions> {
    try {
      const storageInfo = await this.checkStorageUsage();
      const metadata = await this.getPackMetadata(locale);

      // If storage is very limited, suggest critical only
      if (storageInfo.available < this.FULL_PACK_SIZE) {
        return {
          criticalOnly: true,
          includeMedicalTerms: false,
          includeRegionalVariants: false
        };
      }

      // If storage is moderate, suggest partial pack
      if (storageInfo.available < this.FULL_PACK_SIZE * 2) {
        return {
          criticalOnly: false,
          includeMedicalTerms: true,
          includeRegionalVariants: false
        };
      }

      // If storage is abundant, suggest full pack
      return {
        criticalOnly: false,
        includeMedicalTerms: true,
        includeRegionalVariants: true
      };
    } catch (error) {
      console.error('Failed to suggest pack options:', error);
      // Default to critical only if error
      return {
        criticalOnly: true,
        includeMedicalTerms: false,
        includeRegionalVariants: false
      };
    }
  }

  public async uninstallLanguagePack(locale: string): Promise<void> {
    try {
      if (!this.installedPacks.has(locale)) {
        return;
      }

      this.installedPacks.delete(locale);
      await this.persistPacks();

      // Log uninstallation
      liabilityProtection.logCriticalAction(
        'LANGUAGE_PACK_UNINSTALLED',
        'current-user',
        {
          locale,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error(`Failed to uninstall language pack for ${locale}:`, error);
      throw error;
    }
  }

  public async getTranslation(key: string, locale: string): Promise<string | null> {
    try {
      const pack = this.installedPacks.get(locale);
      if (!pack) {
        return null;
      }

      return pack.translations[key] || null;
    } catch (error) {
      console.error('Failed to get translation:', error);
      return null;
    }
  }

  public async isPackInstalled(locale: string): Promise<boolean> {
    return this.installedPacks.has(locale);
  }

  public async getInstalledPacks(): Promise<string[]> {
    return Array.from(this.installedPacks.keys());
  }

  public async getPackInfo(locale: string): Promise<LanguagePack | null> {
    return this.installedPacks.get(locale) || null;
  }

  public async checkStorageUsage(): Promise<{
    used: number;
    total: number;
    available: number;
  }> {
    try {
      const packs = Array.from(this.installedPacks.values());
      const used = packs.reduce(
        (total, pack) => total + new Blob([JSON.stringify(pack)]).size,
        0
      );

      // Estimate total available storage (browser dependent)
      const total = navigator.storage && navigator.storage.estimate
        ? (await navigator.storage.estimate()).quota || 50 * 1024 * 1024 // 50MB default
        : 50 * 1024 * 1024;

      return {
        used,
        total,
        available: total - used
      };
    } catch (error) {
      console.error('Failed to check storage usage:', error);
      throw error;
    }
  }

  private async persistPacks(): Promise<void> {
    try {
      const packsObject = Object.fromEntries(this.installedPacks);
      await this.storage.setItem(OfflineLanguageService.STORAGE_KEY, packsObject);
    } catch (error) {
      console.error('Failed to persist language packs:', error);
      throw error;
    }
  }

  private async isPackUpToDate(pack: LanguagePack): Promise<boolean> {
    try {
      const response = await fetch(`/api/language-packs/${pack.locale}/version`);
      const { version } = await response.json();
      return pack.version === version;
    } catch (error) {
      console.error('Failed to check language pack version:', error);
      return false;
    }
  }

  public async validatePack(pack: LanguagePack): Promise<boolean> {
    try {
      // Validate pack structure
      if (!pack.locale || !pack.translations || !pack.version) {
        return false;
      }

      // Check for required translations
      const requiredKeys = [
        'common.yes',
        'common.no',
        'common.ok',
        'common.cancel',
        'emergency.call',
        'emergency.message'
      ];

      return requiredKeys.every(key => key in pack.translations);
    } catch (error) {
      console.error('Language pack validation failed:', error);
      return false;
    }
  }

  public async prefetchPacks(locales: string[]): Promise<void> {
    try {
      const storageInfo = await this.checkStorageUsage();
      const availableSpace = storageInfo.available;

      for (const locale of locales) {
        if (!this.installedPacks.has(locale)) {
          // Check if we have enough space
          const packInfo = await fetch(`/api/language-packs/${locale}/info`).then(r => r.json());
          if (packInfo.size <= availableSpace) {
            await this.installLanguagePack(locale);
          }
        }
      }
    } catch (error) {
      console.error('Failed to prefetch language packs:', error);
    }
  }

  public async cleanupUnusedPacks(): Promise<void> {
    try {
      const currentLanguage = translationService.getCurrentLanguage();
      const installedPacks = Array.from(this.installedPacks.keys());
      
      // Keep current language and its regional variants
      const packsToClear = installedPacks.filter(locale => 
        !locale.startsWith(currentLanguage.split('-')[0])
      );

      for (const locale of packsToClear) {
        await this.uninstallLanguagePack(locale);
      }

      // Log cleanup
      liabilityProtection.logCriticalAction(
        'LANGUAGE_PACKS_CLEANED',
        'system',
        {
          removed: packsToClear,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to cleanup language packs:', error);
      throw error;
    }
  }

  public async autoCleanup(threshold: number = 0.9): Promise<void> {
    try {
      const storageInfo = await this.checkStorageUsage();
      const usageRatio = storageInfo.used / storageInfo.total;

      if (usageRatio > threshold) {
        const currentLanguage = translationService.getCurrentLanguage();
        const installedPacks = Array.from(this.installedPacks.entries());
        
        // Sort packs by last access time
        const sortedPacks = installedPacks.sort((a, b) => {
          const lastAccessA = new Date(a[1].lastUpdated).getTime();
          const lastAccessB = new Date(b[1].lastUpdated).getTime();
          return lastAccessA - lastAccessB;
        });

        // Remove oldest packs until we're under threshold
        for (const [locale, pack] of sortedPacks) {
          if (locale.startsWith(currentLanguage.split('-')[0])) {
            continue; // Skip current language
          }

          await this.uninstallLanguagePack(locale);
          
          const newStorageInfo = await this.checkStorageUsage();
          if (newStorageInfo.used / newStorageInfo.total <= threshold) {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to auto-cleanup language packs:', error);
      throw error;
    }
  }

  private async scheduleAutoCleanup(): Promise<void> {
    // Check storage usage every hour
    setInterval(async () => {
      try {
        await this.autoCleanup();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, 3600000); // 1 hour
  }
}

export const offlineLanguageService = new OfflineLanguageService();
