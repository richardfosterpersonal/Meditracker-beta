import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { liabilityProtection } from '../utils/liabilityProtection';

// Supported languages with regional variants
export const SUPPORTED_LANGUAGES = {
  'en-US': { name: 'English (US)', region: 'United States' },
  'en-CA': { name: 'English (Canada)', region: 'Canada' },
  'en-GB': { name: 'English (UK)', region: 'United Kingdom' },
  'en-AU': { name: 'English (Australia)', region: 'Australia' },
  'es-ES': { name: 'Español (España)', region: 'Spain' },
  'es-MX': { name: 'Español (México)', region: 'Mexico' },
  'fr-FR': { name: 'Français (France)', region: 'France' },
  'fr-CA': { name: 'Français (Canada)', region: 'Canada' },
  'zh-CN': { name: '中文 (简体)', region: 'China' },
  'zh-TW': { name: '中文 (繁體)', region: 'Taiwan' },
  'ja-JP': { name: '日本語', region: 'Japan' },
  'ko-KR': { name: '한국어', region: 'South Korea' },
  'de-DE': { name: 'Deutsch', region: 'Germany' },
  'it-IT': { name: 'Italiano', region: 'Italy' },
  'pt-BR': { name: 'Português (Brasil)', region: 'Brazil' },
  'pt-PT': { name: 'Português (Portugal)', region: 'Portugal' },
  'ru-RU': { name: 'Русский', region: 'Russia' },
  'hi-IN': { name: 'हिन्दी', region: 'India' },
  'ar-SA': { name: 'العربية', region: 'Saudi Arabia' },
  'vi-VN': { name: 'Tiếng Việt', region: 'Vietnam' }
};

// Emergency numbers by country
export const EMERGENCY_NUMBERS = {
  'US': { emergency: '911', police: '911', ambulance: '911', fire: '911' },
  'CA': { emergency: '911', police: '911', ambulance: '911', fire: '911' },
  'GB': { emergency: '999', police: '999', ambulance: '999', fire: '999' },
  'AU': { emergency: '000', police: '000', ambulance: '000', fire: '000' },
  'EU': { emergency: '112', police: '112', ambulance: '112', fire: '112' },
  // Add more countries as needed
};

class TranslationService {
  private initialized = false;

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await i18next
        .use(Backend)
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
          fallbackLng: 'en-US',
          supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
          ns: ['common', 'medical', 'emergency', 'settings'],
          defaultNS: 'common',
          backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
          },
          detection: {
            order: ['querystring', 'cookie', 'localStorage', 'navigator'],
            caches: ['localStorage', 'cookie'],
          },
          interpolation: {
            escapeValue: false,
          }
        });

      this.initialized = true;

      // Log initialization for liability
      liabilityProtection.logCriticalAction(
        'TRANSLATION_INITIALIZED',
        'system',
        {
          language: i18next.language,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to initialize translations:', error);
      liabilityProtection.logLiabilityRisk(
        'TRANSLATION_INIT_FAILED',
        'HIGH',
        { error }
      );
      throw error;
    }
  }

  public async changeLanguage(language: string): Promise<void> {
    try {
      await i18next.changeLanguage(language);
      
      // Log language change for liability
      liabilityProtection.logCriticalAction(
        'LANGUAGE_CHANGED',
        'current-user',
        {
          language,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  }

  public getEmergencyNumbers(countryCode: string): typeof EMERGENCY_NUMBERS[keyof typeof EMERGENCY_NUMBERS] {
    return EMERGENCY_NUMBERS[countryCode] || EMERGENCY_NUMBERS['US'];
  }

  public async loadNamespace(namespace: string): Promise<void> {
    try {
      await i18next.loadNamespaces(namespace);
    } catch (error) {
      console.error(`Failed to load namespace ${namespace}:`, error);
      throw error;
    }
  }

  public getTranslation(key: string, namespace?: string, params?: object): string {
    return i18next.t(key, { ns: namespace, ...params });
  }

  public getCurrentLanguage(): string {
    return i18next.language;
  }

  public getLanguageDirection(): 'ltr' | 'rtl' {
    return i18next.dir() as 'ltr' | 'rtl';
  }

  public getSupportedLanguages(): typeof SUPPORTED_LANGUAGES {
    return SUPPORTED_LANGUAGES;
  }

  public formatNumber(number: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(i18next.language, options).format(number);
  }

  public formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat(i18next.language, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  public formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(i18next.language, options).format(date);
  }

  public formatTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(i18next.language, {
      ...options,
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  }

  public async validateContent(content: string): Promise<boolean> {
    try {
      // Check for missing translations or formatting issues
      const translated = this.getTranslation(content);
      return translated !== content && translated !== '';
    } catch (error) {
      console.error('Translation validation failed:', error);
      return false;
    }
  }

  public getAccessibleText(key: string, context?: object): string {
    // Get translation with additional context for screen readers
    return this.getTranslation(key, 'accessibility', {
      ...context,
      screenReader: true
    });
  }
}

export const translationService = new TranslationService();
