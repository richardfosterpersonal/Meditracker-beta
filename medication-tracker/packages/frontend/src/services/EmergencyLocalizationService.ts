import { liabilityProtection } from '../utils/liabilityProtection';

interface EmergencyContact {
  number: string;
  name: string;
  description?: string;
  available24x7: boolean;
  languages: string[];
}

interface EmergencyService {
  number: string;
  name: string;
  type: 'police' | 'ambulance' | 'fire' | 'general' | 'poison' | 'suicide' | 'domestic';
  smsEnabled: boolean;
  languages: string[];
}

interface RegionalEmergencyInfo {
  countryCode: string;
  countryName: string;
  emergencyServices: EmergencyService[];
  specializedContacts: EmergencyContact[];
  timezone: string;
  currencyCode: string;
  languageCodes: string[];
}

// Comprehensive database of emergency numbers and services worldwide
const EMERGENCY_DATABASE: { [key: string]: RegionalEmergencyInfo } = {
  'US': {
    countryCode: 'US',
    countryName: 'United States',
    emergencyServices: [
      {
        number: '911',
        name: 'Emergency Services',
        type: 'general',
        smsEnabled: true,
        languages: ['en']
      },
      {
        number: '1-800-222-1222',
        name: 'Poison Control',
        type: 'poison',
        smsEnabled: false,
        languages: ['en', 'es']
      }
    ],
    specializedContacts: [
      {
        number: '988',
        name: 'Suicide and Crisis Lifeline',
        available24x7: true,
        languages: ['en', 'es']
      }
    ],
    timezone: 'America/New_York',
    currencyCode: 'USD',
    languageCodes: ['en-US', 'es-US']
  },
  'GB': {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    emergencyServices: [
      {
        number: '999',
        name: 'Emergency Services',
        type: 'general',
        smsEnabled: true,
        languages: ['en']
      },
      {
        number: '111',
        name: 'NHS Non-emergency',
        type: 'general',
        smsEnabled: true,
        languages: ['en']
      }
    ],
    specializedContacts: [
      {
        number: '116 123',
        name: 'Samaritans',
        available24x7: true,
        languages: ['en']
      }
    ],
    timezone: 'Europe/London',
    currencyCode: 'GBP',
    languageCodes: ['en-GB']
  },
  'IN': {
    countryCode: 'IN',
    countryName: 'India',
    emergencyServices: [
      {
        number: '112',
        name: 'National Emergency Number',
        type: 'general',
        smsEnabled: true,
        languages: ['en', 'hi', 'ta', 'te', 'bn']
      },
      {
        number: '108',
        name: 'Ambulance',
        type: 'ambulance',
        smsEnabled: true,
        languages: ['en', 'hi', 'ta', 'te', 'bn']
      },
      {
        number: '101',
        name: 'Fire',
        type: 'fire',
        smsEnabled: false,
        languages: ['en', 'hi']
      }
    ],
    specializedContacts: [
      {
        number: '1098',
        name: 'Child Helpline',
        available24x7: true,
        languages: ['en', 'hi', 'ta', 'te', 'bn']
      },
      {
        number: '181',
        name: 'Women Helpline',
        available24x7: true,
        languages: ['en', 'hi', 'ta', 'te', 'bn']
      }
    ],
    timezone: 'Asia/Kolkata',
    currencyCode: 'INR',
    languageCodes: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN']
  },
  'JP': {
    countryCode: 'JP',
    countryName: 'Japan',
    emergencyServices: [
      {
        number: '119',
        name: 'Fire/Ambulance',
        type: 'general',
        smsEnabled: true,
        languages: ['ja', 'en']
      },
      {
        number: '110',
        name: 'Police',
        type: 'police',
        smsEnabled: true,
        languages: ['ja', 'en']
      }
    ],
    specializedContacts: [
      {
        number: '03-5285-8181',
        name: 'Tokyo English Lifeline',
        available24x7: true,
        languages: ['en', 'ja']
      }
    ],
    timezone: 'Asia/Tokyo',
    currencyCode: 'JPY',
    languageCodes: ['ja-JP', 'en-JP']
  },
  'KR': {
    countryCode: 'KR',
    countryName: 'South Korea',
    emergencyServices: [
      {
        number: '119',
        name: 'Fire/Ambulance',
        type: 'general',
        smsEnabled: true,
        languages: ['ko', 'en']
      },
      {
        number: '112',
        name: 'Police',
        type: 'police',
        smsEnabled: true,
        languages: ['ko', 'en']
      }
    ],
    specializedContacts: [
      {
        number: '1339',
        name: 'Emergency Medical Information Center',
        available24x7: true,
        languages: ['ko', 'en']
      }
    ],
    timezone: 'Asia/Seoul',
    currencyCode: 'KRW',
    languageCodes: ['ko-KR', 'en-KR']
  },
  'NG': {
    countryCode: 'NG',
    countryName: 'Nigeria',
    emergencyServices: [
      {
        number: '112',
        name: 'Emergency Services',
        type: 'general',
        smsEnabled: true,
        languages: ['en']
      },
      {
        number: '199',
        name: 'Fire',
        type: 'fire',
        smsEnabled: false,
        languages: ['en']
      }
    ],
    specializedContacts: [
      {
        number: '08001235428',
        name: 'National Emergency Management',
        available24x7: true,
        languages: ['en']
      }
    ],
    timezone: 'Africa/Lagos',
    currencyCode: 'NGN',
    languageCodes: ['en-NG']
  },
  'ZA': {
    countryCode: 'ZA',
    countryName: 'South Africa',
    emergencyServices: [
      {
        number: '10111',
        name: 'Police',
        type: 'police',
        smsEnabled: true,
        languages: ['en', 'af', 'zu']
      },
      {
        number: '10177',
        name: 'Ambulance',
        type: 'ambulance',
        smsEnabled: true,
        languages: ['en', 'af', 'zu']
      }
    ],
    specializedContacts: [
      {
        number: '0800055555',
        name: 'Child Protection',
        available24x7: true,
        languages: ['en', 'af', 'zu']
      }
    ],
    timezone: 'Africa/Johannesburg',
    currencyCode: 'ZAR',
    languageCodes: ['en-ZA', 'af-ZA', 'zu-ZA']
  },
  'KE': {
    countryCode: 'KE',
    countryName: 'Kenya',
    emergencyServices: [
      {
        number: '999',
        name: 'Emergency Services',
        type: 'general',
        smsEnabled: true,
        languages: ['en', 'sw']
      },
      {
        number: '112',
        name: 'Alternative Emergency',
        type: 'general',
        smsEnabled: true,
        languages: ['en', 'sw']
      }
    ],
    specializedContacts: [
      {
        number: '1195',
        name: 'Gender Violence',
        available24x7: true,
        languages: ['en', 'sw']
      }
    ],
    timezone: 'Africa/Nairobi',
    currencyCode: 'KES',
    languageCodes: ['en-KE', 'sw-KE']
  },
  'AE': {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    emergencyServices: [
      {
        number: '999',
        name: 'Police',
        type: 'police',
        smsEnabled: true,
        languages: ['ar', 'en']
      },
      {
        number: '998',
        name: 'Ambulance',
        type: 'ambulance',
        smsEnabled: true,
        languages: ['ar', 'en']
      },
      {
        number: '997',
        name: 'Fire',
        type: 'fire',
        smsEnabled: true,
        languages: ['ar', 'en']
      }
    ],
    specializedContacts: [
      {
        number: '800444',
        name: 'Ministry of Health',
        available24x7: true,
        languages: ['ar', 'en']
      }
    ],
    timezone: 'Asia/Dubai',
    currencyCode: 'AED',
    languageCodes: ['ar-AE', 'en-AE']
  },
  'SA': {
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    emergencyServices: [
      {
        number: '999',
        name: 'Police',
        type: 'police',
        smsEnabled: true,
        languages: ['ar', 'en']
      },
      {
        number: '997',
        name: 'Ambulance',
        type: 'ambulance',
        smsEnabled: true,
        languages: ['ar', 'en']
      },
      {
        number: '998',
        name: 'Fire',
        type: 'fire',
        smsEnabled: true,
        languages: ['ar', 'en']
      }
    ],
    specializedContacts: [
      {
        number: '937',
        name: 'Ministry of Health',
        available24x7: true,
        languages: ['ar', 'en']
      }
    ],
    timezone: 'Asia/Riyadh',
    currencyCode: 'SAR',
    languageCodes: ['ar-SA', 'en-SA']
  }
};

class EmergencyLocalizationService {
  private currentCountry: string = 'US';
  private currentLocation: GeolocationCoordinates | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Attempt to get user's location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.currentLocation = position.coords;
            this.updateCountryFromCoordinates();
          },
          (error) => {
            console.warn('Geolocation failed:', error);
            // Fall back to IP-based location
            this.updateCountryFromIP();
          }
        );
      } else {
        // Fall back to IP-based location
        await this.updateCountryFromIP();
      }

      // Log initialization
      liabilityProtection.logCriticalAction(
        'EMERGENCY_LOCALIZATION_INITIALIZED',
        'system',
        {
          country: this.currentCountry,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to initialize emergency localization:', error);
      liabilityProtection.logLiabilityRisk(
        'EMERGENCY_LOCALIZATION_INIT_FAILED',
        'HIGH',
        { error }
      );
    }
  }

  private async updateCountryFromIP(): Promise<void> {
    try {
      const response = await fetch('https://api.ipapi.com/api/check?access_key=YOUR_API_KEY');
      const data = await response.json();
      this.currentCountry = data.country_code;
    } catch (error) {
      console.error('Failed to get country from IP:', error);
      // Fall back to default country
      this.currentCountry = 'US';
    }
  }

  private async updateCountryFromCoordinates(): Promise<void> {
    if (!this.currentLocation) return;

    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${this.currentLocation.latitude}+${this.currentLocation.longitude}&key=YOUR_API_KEY`
      );
      const data = await response.json();
      this.currentCountry = data.results[0].components.country_code.toUpperCase();
    } catch (error) {
      console.error('Failed to get country from coordinates:', error);
      // Fall back to IP-based location
      await this.updateCountryFromIP();
    }
  }

  public getEmergencyNumbers(type?: EmergencyService['type']): EmergencyService[] {
    const info = EMERGENCY_DATABASE[this.currentCountry];
    if (!info) return EMERGENCY_DATABASE['US'].emergencyServices;

    if (type) {
      return info.emergencyServices.filter(service => service.type === type);
    }
    return info.emergencyServices;
  }

  public getSpecializedContacts(): EmergencyContact[] {
    const info = EMERGENCY_DATABASE[this.currentCountry];
    return info?.specializedContacts || EMERGENCY_DATABASE['US'].specializedContacts;
  }

  public async validateEmergencyContact(contact: string): Promise<boolean> {
    try {
      // Validate format and availability
      const info = EMERGENCY_DATABASE[this.currentCountry];
      const allNumbers = [
        ...info.emergencyServices.map(s => s.number),
        ...info.specializedContacts.map(c => c.number)
      ];
      
      return allNumbers.includes(contact);
    } catch (error) {
      console.error('Emergency contact validation failed:', error);
      return false;
    }
  }

  public getLocalizedEmergencyInstructions(language: string): string {
    // This would typically come from a translation service
    // For now, returning English instructions
    return `
      1. Stay calm
      2. Assess the situation
      3. Call appropriate emergency number
      4. Follow dispatcher instructions
      5. Keep your medication list ready
    `;
  }

  public getCurrentCountryInfo(): RegionalEmergencyInfo {
    return EMERGENCY_DATABASE[this.currentCountry] || EMERGENCY_DATABASE['US'];
  }

  public async updateLocation(latitude: number, longitude: number): Promise<void> {
    try {
      this.currentLocation = {
        latitude,
        longitude,
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      };
      
      await this.updateCountryFromCoordinates();

      // Log location update
      liabilityProtection.logCriticalAction(
        'EMERGENCY_LOCATION_UPDATED',
        'current-user',
        {
          latitude,
          longitude,
          country: this.currentCountry,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to update location:', error);
      throw error;
    }
  }

  public getEmergencyServiceByType(type: EmergencyService['type']): EmergencyService | undefined {
    const info = EMERGENCY_DATABASE[this.currentCountry];
    return info?.emergencyServices.find(service => service.type === type);
  }

  public getSupportedLanguages(): string[] {
    const info = EMERGENCY_DATABASE[this.currentCountry];
    return info?.languageCodes || ['en-US'];
  }

  public getTimezone(): string {
    const info = EMERGENCY_DATABASE[this.currentCountry];
    return info?.timezone || 'UTC';
  }

  public getCurrencyCode(): string {
    const info = EMERGENCY_DATABASE[this.currentCountry];
    return info?.currencyCode || 'USD';
  }
}

export const emergencyLocalizationService = new EmergencyLocalizationService();
