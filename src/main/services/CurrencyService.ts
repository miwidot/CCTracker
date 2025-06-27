import * as fs from 'fs/promises';
import * as path from 'path';
import { CurrencyRates } from '../../shared/types';
import { DEFAULT_CURRENCY_RATES } from '../../shared/constants';

interface CurrencyCache {
  rates: CurrencyRates;
  lastUpdated: number;
  ttl: number; // Time to live in milliseconds
}

export class CurrencyService {
  private cacheFile: string;
  private cache: CurrencyCache;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds
  private readonly UPDATE_INTERVAL = 3600000; // Check for updates every hour
  private readonly FALLBACK_RATES = DEFAULT_CURRENCY_RATES;

  constructor(dataDir: string = path.join(process.cwd(), 'data')) {
    this.cacheFile = path.join(dataDir, 'currency_cache.json');
    this.cache = {
      rates: { ...DEFAULT_CURRENCY_RATES },
      lastUpdated: 0,
      ttl: this.CACHE_TTL,
    };
    
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      await this.ensureDataDirectory();
      await this.loadCachedRates();
      
      // Start automatic updates
      this.startPeriodicUpdates();
      
      console.log('CurrencyService initialized');
    } catch (error) {
      console.error('Failed to initialize CurrencyService:', error);
      // Continue with fallback rates
    }
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      const dataDir = path.dirname(this.cacheFile);
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
      throw new Error(`Failed to create data directory: ${error}`);
    }
  }

  /**
   * Load cached exchange rates from disk
   */
  private async loadCachedRates(): Promise<void> {
    try {
      const content = await fs.readFile(this.cacheFile, 'utf-8');
      const cachedData = JSON.parse(content);
      
      // Validate cached data structure
      if (this.isValidCacheData(cachedData)) {
        this.cache = cachedData;
        console.log('Loaded cached currency rates');
      } else {
        console.warn('Invalid cached currency data, using defaults');
        await this.saveCachedRates();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No cached currency rates found, using defaults');
        await this.saveCachedRates();
      } else {
        console.error('Failed to load cached rates:', error);
      }
    }
  }

  /**
   * Save current rates to cache file
   */
  private async saveCachedRates(): Promise<void> {
    try {
      const content = JSON.stringify(this.cache, null, 2);
      await fs.writeFile(this.cacheFile, content, 'utf-8');
      console.log('Currency rates cached successfully');
    } catch (error) {
      console.error('Failed to save currency cache:', error);
    }
  }

  /**
   * Validate cached data structure
   */
  private isValidCacheData(data: any): data is CurrencyCache {
    return (
      data &&
      typeof data === 'object' &&
      data.rates &&
      typeof data.rates === 'object' &&
      typeof data.lastUpdated === 'number' &&
      typeof data.ttl === 'number' &&
      this.isValidRatesData(data.rates)
    );
  }

  /**
   * Validate currency rates data
   */
  private isValidRatesData(rates: any): rates is CurrencyRates {
    const requiredCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'MYR'];
    
    return (
      rates &&
      typeof rates === 'object' &&
      requiredCurrencies.every(currency => 
        currency in rates && typeof rates[currency] === 'number' && rates[currency] > 0
      )
    );
  }

  /**
   * Check if cached rates are still fresh
   */
  private isRatesFresh(): boolean {
    const now = Date.now();
    return (now - this.cache.lastUpdated) < this.cache.ttl;
  }

  /**
   * Get current exchange rates
   */
  async getCurrentRates(): Promise<CurrencyRates> {
    try {
      // Return cached rates if still fresh
      if (this.isRatesFresh()) {
        return { ...this.cache.rates };
      }

      // Try to update rates
      await this.updateRates();
      return { ...this.cache.rates };
    } catch (error) {
      console.error('Failed to get current rates:', error);
      // Return cached rates even if stale, or fallback rates
      return { ...this.cache.rates };
    }
  }

  /**
   * Update exchange rates from external source
   * Note: This is a placeholder - implement with real API when needed
   */
  private async updateRates(): Promise<void> {
    try {
      // For now, use static rates with small variations to simulate real data
      // In production, this would call a real exchange rate API
      const updatedRates = await this.fetchRatesFromAPI();
      
      if (this.isValidRatesData(updatedRates)) {
        this.cache.rates = updatedRates;
        this.cache.lastUpdated = Date.now();
        await this.saveCachedRates();
        console.log('Currency rates updated successfully');
      } else {
        throw new Error('Invalid rates data received from API');
      }
    } catch (error) {
      console.error('Failed to update currency rates:', error);
      // Don't throw - continue with cached rates
    }
  }

  /**
   * Fetch rates from external API (placeholder implementation)
   * In production, implement with real API like exchangerate-api.com or fixer.io
   */
  private async fetchRatesFromAPI(): Promise<CurrencyRates> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate slight variations in exchange rates
    const baseRates = { ...DEFAULT_CURRENCY_RATES };
    const variation = 0.02; // 2% variation
    
    return {
      USD: baseRates.USD, // USD is always 1.0
      EUR: baseRates.EUR * (1 + (Math.random() - 0.5) * variation),
      GBP: baseRates.GBP * (1 + (Math.random() - 0.5) * variation),
      JPY: baseRates.JPY * (1 + (Math.random() - 0.5) * variation),
      CNY: baseRates.CNY * (1 + (Math.random() - 0.5) * variation),
      MYR: baseRates.MYR * (1 + (Math.random() - 0.5) * variation),
    };
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: keyof CurrencyRates,
    toCurrency: keyof CurrencyRates
  ): Promise<number> {
    try {
      if (amount <= 0) {
        return 0;
      }

      if (fromCurrency === toCurrency) {
        return amount;
      }

      const rates = await this.getCurrentRates();
      
      // Convert to USD first, then to target currency
      const usdAmount = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency];
      const convertedAmount = toCurrency === 'USD' ? usdAmount : usdAmount * rates[toCurrency];
      
      return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Failed to convert currency:', error);
      throw new Error(`Failed to convert currency: ${error}`);
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(
    fromCurrency: keyof CurrencyRates,
    toCurrency: keyof CurrencyRates
  ): Promise<number> {
    return this.convertCurrency(1, fromCurrency, toCurrency);
  }

  /**
   * Format currency amount with proper symbol and formatting
   */
  formatCurrency(amount: number, currency: keyof CurrencyRates): string {
    const symbols: Record<keyof CurrencyRates, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      MYR: 'RM',
    };

    const symbol = symbols[currency] || currency;
    
    // Format based on currency conventions
    if (currency === 'JPY') {
      // Japanese Yen doesn't use decimal places
      return `${symbol}${Math.round(amount).toLocaleString()}`;
    } else {
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): Array<{ code: keyof CurrencyRates; name: string; symbol: string }> {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    ];
  }

  /**
   * Start periodic rate updates
   */
  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateRates();
      } catch (error) {
        console.error('Periodic rate update failed:', error);
      }
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Stop periodic updates
   */
  private stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Force update rates immediately
   */
  async forceUpdateRates(): Promise<void> {
    try {
      await this.updateRates();
      console.log('Currency rates force updated');
    } catch (error) {
      console.error('Failed to force update rates:', error);
      throw new Error(`Failed to force update rates: ${error}`);
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    lastUpdated: Date | null;
    isStale: boolean;
    ttl: number;
    nextUpdate: Date | null;
  } {
    return {
      lastUpdated: this.cache.lastUpdated > 0 ? new Date(this.cache.lastUpdated) : null,
      isStale: !this.isRatesFresh(),
      ttl: this.cache.ttl,
      nextUpdate: this.cache.lastUpdated > 0 
        ? new Date(this.cache.lastUpdated + this.cache.ttl)
        : null,
    };
  }

  /**
   * Reset to default rates
   */
  async resetToDefaultRates(): Promise<void> {
    try {
      this.cache = {
        rates: { ...DEFAULT_CURRENCY_RATES },
        lastUpdated: Date.now(),
        ttl: this.CACHE_TTL,
      };
      
      await this.saveCachedRates();
      console.log('Currency rates reset to defaults');
    } catch (error) {
      console.error('Failed to reset currency rates:', error);
      throw new Error(`Failed to reset currency rates: ${error}`);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopPeriodicUpdates();
    console.log('CurrencyService cleaned up');
  }
}

// Export default instance
export const currencyService = new CurrencyService();