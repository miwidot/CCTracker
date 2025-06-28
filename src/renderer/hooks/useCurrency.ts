import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { CURRENCY_SYMBOLS } from '@shared/constants';
import { log } from '@shared/utils/logger';

interface CurrencyRates {
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
  CNY: number;
  MYR: number;
}

export const useCurrency = () => {
  const { settings } = useSettings();
  const [rates, setRates] = useState<CurrencyRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadCurrencyRates();
  }, []);

  const loadCurrencyRates = async () => {
    try {
      setIsLoading(true);
      const currentRates = await window.electronAPI.getCurrencyRates();
      setRates(currentRates);
    } catch (error) {
      log.error('Failed to load currency rates', error as Error, 'useCurrency');
    } finally {
      setIsLoading(false);
    }
  };

  const convertFromUSD = useCallback(
    (usdAmount: number): number => {
      // Validate input amount
      if (typeof usdAmount !== 'number' || !isFinite(usdAmount)) {
        log.warn(`Invalid USD amount provided to convertFromUSD: ${usdAmount}`, 'useCurrency');
        return 0;
      }

      // Check if rates are available
      if (rates == null || settings.currency == null) {
        log.warn('Currency rates or settings not available, returning USD amount', 'useCurrency');
        return usdAmount;
      }

      // No conversion needed for USD
      if (settings.currency === 'USD') {
        return usdAmount;
      }

      // Validate currency exists in rates
      const rate = rates[settings.currency as keyof CurrencyRates];
      
      // Comprehensive rate validation
      if (rate == null) {
        log.error(`Currency rate not found for ${settings.currency}, falling back to USD`, undefined, 'useCurrency');
        return usdAmount;
      }

      if (typeof rate !== 'number' || !isFinite(rate)) {
        log.error(`Invalid currency rate for ${settings.currency}: ${rate}, falling back to USD`, undefined, 'useCurrency');
        return usdAmount;
      }

      if (rate <= 0) {
        log.error(`Invalid currency rate (must be > 0) for ${settings.currency}: ${rate}, falling back to USD`, undefined, 'useCurrency');
        return usdAmount;
      }

      // Validate conversion result
      const convertedAmount = usdAmount * rate;
      
      if (!isFinite(convertedAmount)) {
        log.error(`Currency conversion resulted in invalid number for ${settings.currency}: ${convertedAmount}, falling back to USD`, undefined, 'useCurrency');
        return usdAmount;
      }

      return convertedAmount;
    },
    [rates, settings.currency]
  );

  const formatCurrency = useCallback(
    (amount: number): string => {
      const convertedAmount = convertFromUSD(amount);
      const symbol = CURRENCY_SYMBOLS[settings.currency] || '$';
      
      // Format based on currency conventions
      if (settings.currency === 'JPY' || settings.currency === 'CNY') {
        // Japanese Yen and Chinese Yuan don't use decimal places
        return `${symbol}${Math.round(convertedAmount).toLocaleString()}`;
      } else {
        // Use proper number formatting with thousand separators
        const formatted = convertedAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        return `${symbol}${formatted}`;
      }
    },
    [convertFromUSD, settings.currency]
  );

  const formatCurrencyDetailed = useCallback(
    (amount: number, decimals = 2): string => {
      const convertedAmount = convertFromUSD(amount);
      const symbol = CURRENCY_SYMBOLS[settings.currency] || '$';
      
      // Format based on currency conventions
      if (settings.currency === 'JPY' || settings.currency === 'CNY') {
        // Japanese Yen and Chinese Yuan don't use decimal places
        return `${symbol}${Math.round(convertedAmount).toLocaleString()}`;
      } else {
        // Use proper number formatting with thousand separators
        const formatted = convertedAmount.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
        return `${symbol}${formatted}`;
      }
    },
    [convertFromUSD, settings.currency]
  );

  const getCurrencySymbol = useCallback((): string => {
    return CURRENCY_SYMBOLS[settings.currency] || '$';
  }, [settings.currency]);

  return {
    convertFromUSD,
    formatCurrency,
    formatCurrencyDetailed,
    getCurrencySymbol,
    currentCurrency: settings.currency,
    rates,
    isLoading,
    refreshRates: loadCurrencyRates,
  };
};