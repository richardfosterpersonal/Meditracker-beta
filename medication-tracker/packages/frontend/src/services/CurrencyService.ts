import { liabilityProtection } from '../utils/liabilityProtection';

// Supported currencies with additional metadata
export const SUPPORTED_CURRENCIES = {
  'USD': { name: 'US Dollar', symbol: '$', decimals: 2, countries: ['US'] },
  'EUR': { name: 'Euro', symbol: '€', decimals: 2, countries: ['EU'] },
  'GBP': { name: 'British Pound', symbol: '£', decimals: 2, countries: ['GB'] },
  'JPY': { name: 'Japanese Yen', symbol: '¥', decimals: 0, countries: ['JP'] },
  'CNY': { name: 'Chinese Yuan', symbol: '¥', decimals: 2, countries: ['CN'] },
  'INR': { name: 'Indian Rupee', symbol: '₹', decimals: 2, countries: ['IN'] },
  'CAD': { name: 'Canadian Dollar', symbol: '$', decimals: 2, countries: ['CA'] },
  'AUD': { name: 'Australian Dollar', symbol: '$', decimals: 2, countries: ['AU'] },
  'CHF': { name: 'Swiss Franc', symbol: 'Fr', decimals: 2, countries: ['CH'] },
  'HKD': { name: 'Hong Kong Dollar', symbol: '$', decimals: 2, countries: ['HK'] },
  'SGD': { name: 'Singapore Dollar', symbol: '$', decimals: 2, countries: ['SG'] },
  'SEK': { name: 'Swedish Krona', symbol: 'kr', decimals: 2, countries: ['SE'] },
  'KRW': { name: 'South Korean Won', symbol: '₩', decimals: 0, countries: ['KR'] },
  'BRL': { name: 'Brazilian Real', symbol: 'R$', decimals: 2, countries: ['BR'] },
  'RUB': { name: 'Russian Ruble', symbol: '₽', decimals: 2, countries: ['RU'] },
  'ZAR': { name: 'South African Rand', symbol: 'R', decimals: 2, countries: ['ZA'] },
  'MXN': { name: 'Mexican Peso', symbol: '$', decimals: 2, countries: ['MX'] },
  'AED': { name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, countries: ['AE'] },
  'SAR': { name: 'Saudi Riyal', symbol: '﷼', decimals: 2, countries: ['SA'] },
  'NZD': { name: 'New Zealand Dollar', symbol: '$', decimals: 2, countries: ['NZ'] }
};

class CurrencyService {
  private exchangeRates: { [key: string]: number } = {};
  private lastUpdate: string = '';
  private readonly REFRESH_INTERVAL = 3600000; // 1 hour in milliseconds

  constructor() {
    this.initializeExchangeRates();
  }

  private async initializeExchangeRates(): Promise<void> {
    try {
      await this.fetchExchangeRates();
      
      // Log initialization for liability
      liabilityProtection.logCriticalAction(
        'CURRENCY_SERVICE_INITIALIZED',
        'system',
        {
          timestamp: new Date().toISOString(),
          currencies: Object.keys(this.exchangeRates)
        }
      );
    } catch (error) {
      console.error('Failed to initialize exchange rates:', error);
      liabilityProtection.logLiabilityRisk(
        'CURRENCY_INIT_FAILED',
        'MEDIUM',
        { error }
      );
    }
  }

  private async fetchExchangeRates(): Promise<void> {
    try {
      // Note: Replace with your preferred exchange rate API
      const response = await fetch('YOUR_EXCHANGE_RATE_API_ENDPOINT');
      const data = await response.json();
      
      this.exchangeRates = data.rates;
      this.lastUpdate = new Date().toISOString();

      liabilityProtection.logCriticalAction(
        'EXCHANGE_RATES_UPDATED',
        'system',
        {
          timestamp: this.lastUpdate,
          source: 'exchange_rate_api'
        }
      );
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      throw error;
    }
  }

  public async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    try {
      // Check if exchange rates need updating
      const now = new Date().getTime();
      const lastUpdateTime = new Date(this.lastUpdate).getTime();
      
      if (now - lastUpdateTime > this.REFRESH_INTERVAL) {
        await this.fetchExchangeRates();
      }

      // Perform conversion
      const rate = this.exchangeRates[toCurrency] / this.exchangeRates[fromCurrency];
      const converted = amount * rate;

      // Log conversion for liability
      liabilityProtection.logCriticalAction(
        'CURRENCY_CONVERSION',
        'system',
        {
          fromCurrency,
          toCurrency,
          amount,
          converted,
          timestamp: new Date().toISOString()
        }
      );

      return converted;
    } catch (error) {
      console.error('Currency conversion failed:', error);
      throw error;
    }
  }

  public format(
    amount: number,
    currency: string,
    locale: string = 'en-US'
  ): string {
    try {
      const currencyInfo = SUPPORTED_CURRENCIES[currency];
      
      if (!currencyInfo) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currencyInfo.decimals,
        maximumFractionDigits: currencyInfo.decimals
      }).format(amount);
    } catch (error) {
      console.error('Currency formatting failed:', error);
      throw error;
    }
  }

  public getSupportedCurrencies(): typeof SUPPORTED_CURRENCIES {
    return SUPPORTED_CURRENCIES;
  }

  public getCurrencySymbol(currency: string): string {
    return SUPPORTED_CURRENCIES[currency]?.symbol || currency;
  }

  public getCurrencyDecimals(currency: string): number {
    return SUPPORTED_CURRENCIES[currency]?.decimals || 2;
  }

  public getCurrencyByCountry(countryCode: string): string | undefined {
    const entry = Object.entries(SUPPORTED_CURRENCIES).find(([_, info]) => 
      info.countries.includes(countryCode)
    );
    return entry ? entry[0] : undefined;
  }

  public validateCurrencyAmount(amount: number, currency: string): boolean {
    const decimals = this.getCurrencyDecimals(currency);
    const multiplier = Math.pow(10, decimals);
    return Math.round(amount * multiplier) === amount * multiplier;
  }

  public roundToValidAmount(amount: number, currency: string): number {
    const decimals = this.getCurrencyDecimals(currency);
    const multiplier = Math.pow(10, decimals);
    return Math.round(amount * multiplier) / multiplier;
  }
}

export const currencyService = new CurrencyService();
