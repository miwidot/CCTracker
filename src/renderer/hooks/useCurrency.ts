import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';

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
    loadCurrencyRates();
  }, []);

  const loadCurrencyRates = async () => {
    try {
      setIsLoading(true);
      const currentRates = await window.electronAPI.getCurrencyRates();
      setRates(currentRates);
    } catch (error) {
      console.error('Failed to load currency rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const convertFromUSD = useCallback(
    (usdAmount: number): number => {
      if (!rates || !settings.currency) {
        return usdAmount;
      }

      if (settings.currency === 'USD') {
        return usdAmount;
      }

      // Convert USD to target currency
      const rate = rates[settings.currency as keyof CurrencyRates];
      return usdAmount * rate;
    },
    [rates, settings.currency]
  );

  const formatCurrency = useCallback(
    (amount: number): string => {
      const convertedAmount = convertFromUSD(amount);
      
      const symbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CNY: '¥',
        MYR: 'RM',
      };

      const symbol = symbols[settings.currency] || '$';
      
      // Format based on currency conventions
      if (settings.currency === 'JPY' || settings.currency === 'CNY') {
        // Japanese Yen and Chinese Yuan don't use decimal places
        return `${symbol}${Math.round(convertedAmount).toLocaleString()}`;
      } else {
        return `${symbol}${convertedAmount.toFixed(2)}`;
      }
    },
    [convertFromUSD, settings.currency]
  );

  const formatCurrencyDetailed = useCallback(
    (amount: number, decimals: number = 4): string => {
      const convertedAmount = convertFromUSD(amount);
      
      const symbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CNY: '¥',
        MYR: 'RM',
      };

      const symbol = symbols[settings.currency] || '$';
      
      // Format based on currency conventions
      if (settings.currency === 'JPY' || settings.currency === 'CNY') {
        // Japanese Yen and Chinese Yuan don't use decimal places
        return `${symbol}${Math.round(convertedAmount).toLocaleString()}`;
      } else {
        return `${symbol}${convertedAmount.toFixed(decimals)}`;
      }
    },
    [convertFromUSD, settings.currency]
  );

  const getCurrencySymbol = useCallback((): string => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      MYR: 'RM',
    };
    return symbols[settings.currency] || '$';
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