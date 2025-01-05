import axios from 'axios';
import { liabilityProtection } from '../utils/liabilityProtection';

export interface UserSettings {
  language: {
    preferred: string;  // ISO 639-1 code (e.g., 'en', 'es', 'fr')
    fallback: string;
  };
  locale: {
    country: string;    // ISO 3166-1 alpha-2 (e.g., 'US', 'CA')
    timezone: string;   // IANA timezone (e.g., 'America/New_York')
    currency: string;   // ISO 4217 (e.g., 'USD', 'CAD')
    numberFormat: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  emergency: {
    primaryNumber: string;
    showInternationalNumbers: boolean;
    preferredContactMethod: 'CALL' | 'SMS' | 'EMAIL';
  };
  notifications: {
    enabled: boolean;
    methods: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
    quiet: {
      enabled: boolean;
      start: string;  // HH:mm
      end: string;    // HH:mm
    };
    medicationReminders: {
      enabled: boolean;
      advance: number;  // minutes
      repeat: number;   // minutes
    };
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    reduceMotion: boolean;
    screenReader: boolean;
  };
  privacy: {
    shareLocation: boolean;
    shareMedData: boolean;
    shareAnalytics: boolean;
    dataRetention: number;  // days
  };
}

class UserSettingsService {
  private settings: UserSettings | null = null;
  private readonly STORAGE_KEY = 'user_settings';

  constructor() {
    this.initializeSettings();
  }

  private async initializeSettings() {
    try {
      // Try to load from local storage first
      const storedSettings = localStorage.getItem(this.STORAGE_KEY);
      if (storedSettings) {
        this.settings = JSON.parse(storedSettings);
        return;
      }

      // If no stored settings, detect user's environment
      const detectedSettings = await this.detectUserEnvironment();
      this.settings = detectedSettings;
      
      // Save to local storage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));

      // Sync with server
      await this.syncSettings();

    } catch (error) {
      console.error('Failed to initialize settings:', error);
      // Fall back to US English defaults if detection fails
      this.settings = this.getDefaultSettings();
    }
  }

  private async detectUserEnvironment(): Promise<UserSettings> {
    try {
      // Get browser language
      const browserLang = navigator.language.split('-')[0];
      
      // Get timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Get country and currency through IP geolocation
      const geoResponse = await axios.get('/api/geo/locate');
      const { country, currency } = geoResponse.data;

      return {
        ...this.getDefaultSettings(),
        language: {
          preferred: browserLang,
          fallback: 'en'
        },
        locale: {
          ...this.getDefaultSettings().locale,
          country,
          currency,
          timezone
        }
      };
    } catch (error) {
      console.error('Failed to detect user environment:', error);
      throw error;
    }
  }

  private getDefaultSettings(): UserSettings {
    return {
      language: {
        preferred: 'en',
        fallback: 'en'
      },
      locale: {
        country: 'US',
        timezone: 'America/New_York',
        currency: 'USD',
        numberFormat: 'en-US',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      emergency: {
        primaryNumber: '911',
        showInternationalNumbers: false,
        preferredContactMethod: 'CALL'
      },
      notifications: {
        enabled: true,
        methods: {
          push: true,
          email: true,
          sms: false
        },
        quiet: {
          enabled: false,
          start: '22:00',
          end: '07:00'
        },
        medicationReminders: {
          enabled: true,
          advance: 30,
          repeat: 15
        }
      },
      accessibility: {
        fontSize: 'medium',
        highContrast: false,
        reduceMotion: false,
        screenReader: false
      },
      privacy: {
        shareLocation: true,
        shareMedData: true,
        shareAnalytics: true,
        dataRetention: 365
      }
    };
  }

  public async updateSettings(newSettings: Partial<UserSettings>): Promise<void> {
    try {
      // Merge with existing settings
      this.settings = {
        ...this.settings,
        ...newSettings
      };

      // Save locally
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));

      // Sync with server
      await this.syncSettings();

      // Log settings update for liability
      liabilityProtection.logCriticalAction(
        'SETTINGS_UPDATED',
        'current-user',
        {
          timestamp: new Date().toISOString(),
          changes: Object.keys(newSettings)
        }
      );

      // Apply settings
      this.applySettings();

    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  private async syncSettings(): Promise<void> {
    try {
      await axios.put('/api/user/settings', this.settings);
    } catch (error) {
      console.error('Failed to sync settings with server:', error);
      throw error;
    }
  }

  private applySettings(): void {
    if (!this.settings) return;

    // Apply language
    document.documentElement.lang = this.settings.language.preferred;

    // Apply accessibility settings
    document.documentElement.style.fontSize = 
      this.settings.accessibility.fontSize === 'large' ? '120%' :
      this.settings.accessibility.fontSize === 'small' ? '90%' : '100%';

    // Apply high contrast
    document.documentElement.classList.toggle(
      'high-contrast',
      this.settings.accessibility.highContrast
    );

    // Apply reduced motion
    document.documentElement.classList.toggle(
      'reduce-motion',
      this.settings.accessibility.reduceMotion
    );
  }

  public getSettings(): UserSettings {
    return this.settings || this.getDefaultSettings();
  }

  public async exportSettings(): Promise<string> {
    return JSON.stringify(this.settings, null, 2);
  }

  public async importSettings(settingsJson: string): Promise<void> {
    try {
      const newSettings = JSON.parse(settingsJson);
      await this.updateSettings(newSettings);
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }

  public getFormattedCurrency(amount: number): string {
    const { currency, numberFormat } = this.settings?.locale || this.getDefaultSettings().locale;
    return new Intl.NumberFormat(numberFormat, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  public getFormattedDate(date: Date): string {
    const { dateFormat, numberFormat } = this.settings?.locale || this.getDefaultSettings().locale;
    return new Intl.DateTimeFormat(numberFormat, {
      dateStyle: 'full'
    }).format(date);
  }

  public getFormattedTime(date: Date): string {
    const { timeFormat, numberFormat } = this.settings?.locale || this.getDefaultSettings().locale;
    return new Intl.DateTimeFormat(numberFormat, {
      timeStyle: 'short',
      hour12: timeFormat === '12h'
    }).format(date);
  }
}

export const userSettingsService = new UserSettingsService();
