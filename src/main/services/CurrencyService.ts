import * as fs from 'fs/promises';
import * as path from 'path';
import type { CurrencyRates } from '@shared/types';
import { DEFAULT_CURRENCY_RATES, CURRENCY_SYMBOLS } from '@shared/constants';
import { log } from '@shared/utils/logger';

interface CurrencyCache {
  rates: CurrencyRates;
  lastUpdated: number;
  ttl: number; // Time to live in milliseconds
}

export class CurrencyService {
  private cacheFile: string;
  private cache: CurrencyCache;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly CACHE_TTL = 86400000; // 24 hours in milliseconds (daily updates)
  private readonly UPDATE_INTERVAL = 86400000; // Check for updates every 24 hours
  private readonly FALLBACK_RATES = DEFAULT_CURRENCY_RATES;
  private isUpdating = false; // Prevent concurrent updates

  constructor(dataDir: string = path.join(process.cwd(), 'data')) {
    this.cacheFile = path.join(dataDir, 'currency_cache.json');
    this.cache = {
      rates: { ...DEFAULT_CURRENCY_RATES },
      lastUpdated: 0,
      ttl: this.CACHE_TTL,
    };
  }

  /**
   * Public initialize method for external use
   */
  async initialize(userDataPath?: string): Promise<void> {
    // Update cache file path if userDataPath is provided
    if (userDataPath) {
      this.cacheFile = path.join(userDataPath, 'currency_cache.json');
    }
    
    await this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      await this.ensureDataDirectory();
      await this.loadCachedRates();
      
      // Start automatic updates
      this.startPeriodicUpdates();
      
      log.service.start('CurrencyService');
    } catch (error) {
      log.service.error('CurrencyService', 'Failed to initialize CurrencyService', error as Error);
      // Continue with fallback rates
    }
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      const dataDir = path.dirname(this.cacheFile);
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      log.service.error('CurrencyService', 'Failed to create data directory', error as Error);
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
        // Always ensure TTL is correct (fix legacy cache files)
        this.cache.ttl = this.CACHE_TTL;
        log.debug('Loaded cached currency rates', 'CurrencyService');
      } else {
        log.warn('Invalid cached currency data, using defaults', 'CurrencyService');
        await this.saveCachedRates();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        log.info('No cached currency rates found, using defaults', 'CurrencyService');
        await this.saveCachedRates();
      } else {
        log.service.error('CurrencyService', 'Failed to load cached rates', error as Error);
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
      log.debug('Currency rates cached successfully', 'CurrencyService');
    } catch (error) {
      log.service.error('CurrencyService', 'Failed to save currency cache', error as Error);
    }
  }

  /**
   * Validate cached data structure
   */
  private isValidCacheData(data: unknown): data is CurrencyCache {
    return (
      data != null &&
      typeof data === 'object' &&
      'rates' in data &&
      (data as Record<string, unknown>).rates != null &&
      typeof (data as Record<string, unknown>).rates === 'object' &&
      'lastUpdated' in data &&
      typeof (data as Record<string, unknown>).lastUpdated === 'number' &&
      'ttl' in data &&
      typeof (data as Record<string, unknown>).ttl === 'number' &&
      this.isValidRatesData((data as Record<string, unknown>).rates)
    );
  }

  /**
   * Validate currency rates data
   */
  private isValidRatesData(rates: unknown): rates is CurrencyRates {
    const requiredCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'MYR'];
    
    return (
      rates != null &&
      typeof rates === 'object' &&
      requiredCurrencies.every(currency => {
        const ratesObj = rates as Record<string, unknown>;
        return currency in ratesObj && 
               typeof ratesObj[currency] === 'number' && 
               ratesObj[currency] > 0;
      })
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
      log.service.error('CurrencyService', 'Failed to get current rates', error as Error);
      // Return cached rates even if stale, or fallback rates
      return { ...this.cache.rates };
    }
  }

  /**
   * Update exchange rates from external source
   */
  private async updateRates(): Promise<void> {
    // Prevent concurrent updates
    if (this.isUpdating) {
      log.debug('Currency update already in progress, skipping...', 'CurrencyService');
      return;
    }

    this.isUpdating = true;
    
    try {
      log.info('Updating currency rates...', 'CurrencyService');
      const updatedRates = await this.fetchRatesFromAPI();
      
      if (this.isValidRatesData(updatedRates)) {
        this.cache.rates = updatedRates;
        this.cache.lastUpdated = Date.now();
        this.cache.ttl = this.CACHE_TTL; // Ensure TTL is always 24 hours
        await this.saveCachedRates();
        log.info('Currency rates updated successfully', 'CurrencyService');
      } else {
        throw new Error('Invalid rates data received from API');
      }
    } catch (error) {
      log.service.error('CurrencyService', 'Failed to update currency rates', error as Error);
      // Don't throw - continue with cached rates
      // If we have no cached data at all, initialize with fallback rates
      if (this.cache.lastUpdated === 0) {
        log.warn('No cached rates available, using fallback rates', 'CurrencyService');
        this.cache.rates = { ...this.FALLBACK_RATES };
        this.cache.lastUpdated = Date.now();
        this.cache.ttl = this.CACHE_TTL; // Ensure TTL is always 24 hours
        await this.saveCachedRates();
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Fetch rates from external API using exchangerate-api.com
   * Free tier: 1500 requests/month, no auth required
   */
  private async fetchRatesFromAPI(): Promise<CurrencyRates> {
    const APIs = [
      // Primary API: exchangerate-api.com (free, no auth)
      {
        name: 'exchangerate-api.com',
        url: 'https://api.exchangerate-api.com/v4/latest/USD',
        parser: (data: Record<string, unknown>) => data.rates
      },
      // Fallback API: exchangerate.host (free, no auth)
      {
        name: 'exchangerate.host',
        url: 'https://api.exchangerate.host/latest?base=USD',
        parser: (data: Record<string, unknown>) => data.rates
      },
      // Another fallback: freeforexapi.com (free, no auth)
      {
        name: 'freeforexapi.com',
        url: 'https://api.freeforexapi.com/v1/rates?base=USD',
        parser: (data: Record<string, unknown>) => data.rates
      }
    ];

    for (const api of APIs) {
      try {
        log.debug(`Fetching currency rates from ${api.name}...`, 'CurrencyService');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(api.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'CCTracker-Currency-Service/1.0',
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const rates = api.parser(data);
        
        if (rates == null || typeof rates !== 'object') {
          throw new Error('Invalid API response format');
        }
        
        // Convert to our currency format
        const ratesObj = rates as Record<string, number>;
        const currencyRates: CurrencyRates = {
          USD: 1.0, // USD is always 1.0 as base currency
          EUR: (typeof ratesObj.EUR === 'number' ? ratesObj.EUR : null) ?? this.FALLBACK_RATES.EUR,
          GBP: (typeof ratesObj.GBP === 'number' ? ratesObj.GBP : null) ?? this.FALLBACK_RATES.GBP,
          JPY: (typeof ratesObj.JPY === 'number' ? ratesObj.JPY : null) ?? this.FALLBACK_RATES.JPY,
          CNY: (typeof ratesObj.CNY === 'number' ? ratesObj.CNY : null) ?? this.FALLBACK_RATES.CNY,
          MYR: (typeof ratesObj.MYR === 'number' ? ratesObj.MYR : null) ?? this.FALLBACK_RATES.MYR,
        };
        
        // Validate rates are reasonable (not zero, not negative, not extreme)
        for (const [currency, rate] of Object.entries(currencyRates)) {
          if (currency === 'USD') continue;
          if (rate == null || rate <= 0 || rate > 1000) {
            throw new Error(`Invalid rate for ${currency}: ${rate}`);
          }
        }
        
        log.debug(`Successfully fetched rates from ${api.name}`, 'CurrencyService');
        return currencyRates;
        
      } catch (_error) {
        log.warn(`Failed to fetch from ${api.name}`, 'CurrencyService');
        // Continue to next API
      }
    }
    
    // If all APIs fail, throw error
    throw new Error('All currency APIs failed, using cached/fallback rates');
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: keyof Omit<CurrencyRates, 'monthlyBudget'>,
    toCurrency: keyof Omit<CurrencyRates, 'monthlyBudget'>
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
      log.service.error('CurrencyService', 'Failed to convert currency', error as Error);
      throw new Error(`Failed to convert currency: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(
    fromCurrency: keyof Omit<CurrencyRates, 'monthlyBudget'>,
    toCurrency: keyof Omit<CurrencyRates, 'monthlyBudget'>
  ): Promise<number> {
    return this.convertCurrency(1, fromCurrency, toCurrency);
  }

  /**
   * Format currency amount with proper symbol and formatting
   */
  formatCurrency(amount: number, currency: keyof Omit<CurrencyRates, 'monthlyBudget'>): string {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    
    // Format based on currency conventions
    if (currency === 'JPY' || currency === 'CNY') {
      // Japanese Yen and Chinese Yuan don't use decimal places
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
      { code: 'USD', name: 'US Dollar', symbol: CURRENCY_SYMBOLS.USD },
      { code: 'EUR', name: 'Euro', symbol: CURRENCY_SYMBOLS.EUR },
      { code: 'GBP', name: 'British Pound', symbol: CURRENCY_SYMBOLS.GBP },
      { code: 'JPY', name: 'Japanese Yen', symbol: CURRENCY_SYMBOLS.JPY },
      { code: 'CNY', name: 'Chinese Yuan', symbol: CURRENCY_SYMBOLS.CNY },
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: CURRENCY_SYMBOLS.MYR },
    ];
  }

  /**
   * Start periodic rate updates
   */
  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(() => {
      void (async () => {
        try {
          await this.updateRates();
        } catch (error) {
          log.service.error('CurrencyService', 'Periodic rate update failed', error as Error);
        }
      })();
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
      log.info('Currency rates force updated', 'CurrencyService');
    } catch (error) {
      log.service.error('CurrencyService', 'Failed to force update rates', error as Error);
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
    isUpdating: boolean;
    source: string;
  } {
    const timeSinceUpdate = this.cache.lastUpdated > 0 ? Date.now() - this.cache.lastUpdated : 0;
    const hoursOld = Math.floor(timeSinceUpdate / (1000 * 60 * 60));
    
    let source = 'fallback';
    if (this.cache.lastUpdated > 0) {
      source = hoursOld < 24 ? 'live' : 'cached (stale)';
    }
    
    return {
      lastUpdated: this.cache.lastUpdated > 0 ? new Date(this.cache.lastUpdated) : null,
      isStale: !this.isRatesFresh(),
      ttl: this.cache.ttl,
      nextUpdate: this.cache.lastUpdated > 0 
        ? new Date(this.cache.lastUpdated + this.cache.ttl)
        : null,
      isUpdating: this.isUpdating,
      source,
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
      log.info('Currency rates reset to defaults', 'CurrencyService');
    } catch (error) {
      log.service.error('CurrencyService', 'Failed to reset currency rates', error as Error);
      throw new Error(`Failed to reset currency rates: ${error}`);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopPeriodicUpdates();
    log.info('CurrencyService cleaned up', 'CurrencyService');
  }
}

// Export default instance
export const currencyService = new CurrencyService();