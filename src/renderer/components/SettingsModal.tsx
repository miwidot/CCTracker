import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowPathIcon, SunIcon, MoonIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { useTranslation } from '../hooks/useTranslation';
import { THEME_NAMES, getThemeConfig } from '@shared/constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { formatDateTime } = useTimeFormat();
  const { t } = useTranslation();
  const [currencyStatus, setCurrencyStatus] = useState<any>(null);
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

  const getThemeInfo = (themeName: string) => {
    switch (themeName) {
      case 'light':
        return { icon: SunIcon, label: t('theme.light'), description: t('theme.lightDescription') };
      case 'dark':
        return { icon: MoonIcon, label: t('theme.dark'), description: t('theme.darkDescription') };
      case 'catppuccin-latte':
        return { icon: SparklesIcon, label: t('theme.catppuccinLatte'), description: t('theme.catppuccinLatteDescription') };
      case 'catppuccin-frappe':
        return { icon: SparklesIcon, label: t('theme.catppuccinFrappe'), description: t('theme.catppuccinFrappeDescription') };
      case 'catppuccin-macchiato':
        return { icon: SparklesIcon, label: t('theme.catppuccinMacchiato'), description: t('theme.catppuccinMacchiatoDescription') };
      case 'catppuccin-mocha':
        return { icon: SparklesIcon, label: t('theme.catppuccinMocha'), description: t('theme.catppuccinMochaDescription') };
      default:
        return { icon: SparklesIcon, label: themeName, description: t('theme.custom') };
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCurrencyStatus();
    }
  }, [isOpen]);

  const loadCurrencyStatus = async () => {
    try {
      const status = await window.electronAPI.getCurrencyStatus();
      setCurrencyStatus(status);
    } catch (error) {
      console.error('Failed to load currency status:', error);
    }
  };

  const handleForceUpdateCurrency = async () => {
    setIsUpdatingCurrency(true);
    try {
      await window.electronAPI.forceUpdateCurrency();
      await loadCurrencyStatus(); // Refresh status
    } catch (error) {
      console.error('Failed to update currency rates:', error);
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  if (!isOpen) return null;

  const handleCurrencyChange = async (currency: string) => {
    await updateSettings({ currency } as any);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-[var(--bg-primary)] shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t('common.settings')}
            </h3>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Theme Section */}
            <div className="mb-8">
              <h4 className="text-base font-medium text-[var(--text-primary)] mb-4">
                {t('theme.title')}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {THEME_NAMES.map((themeName) => {
                  const themeNameStr = String(themeName);
                  const themeOption = getThemeConfig(themeName);
                  const themeInfo = getThemeInfo(themeNameStr);
                  const IconComponent = themeInfo.icon;
                  return (
                    <button
                      key={themeNameStr}
                      onClick={() => setTheme(themeName)}
                      className={`flex items-center space-x-3 rounded-lg border-2 p-4 text-left transition-all ${
                        theme.name === themeNameStr
                          ? 'border-[var(--text-accent)] bg-[var(--bg-secondary)]'
                          : 'border-[var(--border-color)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-5 w-5 text-[var(--text-primary)]" />
                        <div
                          className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: themeOption.primary }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[var(--text-primary)]">
                          {themeInfo.label}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {themeInfo.description}
                        </div>
                      </div>
                      {theme.name === themeNameStr && (
                        <div className="ml-auto">
                          <div className="h-2 w-2 rounded-full bg-[var(--text-accent)]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Currency Section */}
            <div className="mb-8">
              <h4 className="text-base font-medium text-[var(--text-primary)] mb-4">
                {t('settings.currency')}
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'MYR'].map((currency) => (
                  <button
                    key={currency}
                    onClick={() => handleCurrencyChange(currency)}
                    className={`rounded-lg border-2 p-3 text-center transition-all ${
                      settings.currency === currency
                        ? 'border-[var(--text-accent)] bg-[var(--bg-secondary)] text-[var(--text-accent)]'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="font-medium">{currency}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Format Section */}
            <div className="mb-8">
              <h4 className="text-base font-medium text-[var(--text-primary)] mb-4">
                {t('settings.timeFormat')}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: '12h', label: t('settings.timeFormat12') },
                  { value: '24h', label: t('settings.timeFormat24') }
                ].map((format) => (
                  <button
                    key={format.value}
                    onClick={() => updateSettings({ time_format: format.value } as any)}
                    className={`rounded-lg border-2 p-3 text-center transition-all ${
                      settings.time_format === format.value
                        ? 'border-[var(--text-accent)] bg-[var(--bg-secondary)] text-[var(--text-accent)]'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="font-medium">{format.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency Status Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-medium text-[var(--text-primary)]">
                  {t('settings.currencyRates')}
                </h4>
                <button
                  onClick={handleForceUpdateCurrency}
                  disabled={isUpdatingCurrency}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-[var(--text-accent)] text-white rounded-md hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${isUpdatingCurrency ? 'animate-spin' : ''}`} />
                  <span>{isUpdatingCurrency ? t('settings.updating') : t('settings.updateNow')}</span>
                </button>
              </div>
              <div className="rounded-lg border border-[var(--border-color)] p-4">
                {currencyStatus ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">{t('ui.status')}</span>
                      <span className={`font-medium ${currencyStatus.source === 'live' ? 'text-green-600' : currencyStatus.source === 'fallback' ? 'text-yellow-600' : 'text-orange-600'}`}>
                        {currencyStatus.source === 'live' ? t('settings.statusLive') : currencyStatus.source === 'fallback' ? t('settings.statusFallback') : t('settings.statusCached')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">{t('settings.lastUpdated')}:</span>
                      <span className="text-[var(--text-primary)]">
                        {currencyStatus.lastUpdated ? formatDateTime(currencyStatus.lastUpdated) : t('common.never')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">{t('settings.nextUpdate')}:</span>
                      <span className="text-[var(--text-primary)]">
                        {currencyStatus.nextUpdate ? formatDateTime(currencyStatus.nextUpdate) : t('settings.manual')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[var(--text-secondary)]">{t('settings.loadingStatus')}</div>
                )}
              </div>
            </div>

            {/* App Info Section */}
            <div className="rounded-lg border border-[var(--border-color)] p-4">
              <h4 className="text-base font-medium text-[var(--text-primary)] mb-3">
                {t('settings.about')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t('settings.version')}:</span>
                  <span className="text-[var(--text-primary)]">{t('ui.version')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t('settings.currentTheme')}:</span>
                  <span className="text-[var(--text-primary)] capitalize">{theme.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t('settings.currency')}:</span>
                  <span className="text-[var(--text-primary)]">{settings.currency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-[var(--border-color)] px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-md bg-[var(--text-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
            >
              {t('common.done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};