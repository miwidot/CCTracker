import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowPathIcon, SunIcon, MoonIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { useTranslation } from '../hooks/useTranslation';
import { THEME_NAMES, getThemeConfig } from '@shared/constants';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface CurrencyStatus {
  source: 'live' | 'fallback' | 'cached';
  lastUpdated: string | null;
  nextUpdate: string | null;
}

const getLanguages = (t: any): Language[] => [
  { code: 'en', name: t('languages.english'), nativeName: 'English' },
  { code: 'de', name: t('languages.german'), nativeName: 'Deutsch' },
  { code: 'fr', name: t('languages.french'), nativeName: 'Français' },
  { code: 'es', name: t('languages.spanish'), nativeName: 'Español' },
  { code: 'ja', name: t('languages.japanese'), nativeName: '日本語' },
  { code: 'zh', name: t('languages.chineseSimplified'), nativeName: '简体中文' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { formatDateTime } = useTimeFormat();
  const { t, i18n } = useTranslation();
  const [currencyStatus, setCurrencyStatus] = useState<CurrencyStatus | null>(null);
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
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 modal-overlay animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="modal modal-content relative w-full max-w-2xl transform overflow-hidden modal-radius bg-[var(--bg-primary)] modal-shadow theme-transition animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t('common.settings')}
            </h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              type="button"
              style={{ zIndex: 10, position: 'relative', pointerEvents: 'auto' }}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Language Section */}
            <div className="mb-8">
              <h4 className="text-base font-medium text-[var(--text-primary)] mb-4">
                {t('settings.language')}
              </h4>
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent interactive-scale theme-transition"
              >
                {getLanguages(t).map((language) => (
                  <option
                    key={language.code}
                    value={language.code}
                    className="bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  >
                    {language.nativeName} ({language.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Section */}
            <div className="mb-8">
              <h4 className="text-base font-medium text-[var(--text-primary)] mb-4">
                {t('theme.title')}
              </h4>
              <select
                value={theme.name}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent interactive-scale theme-transition"
              >
                {THEME_NAMES.map((themeName) => {
                  const themeNameStr = String(themeName);
                  const themeInfo = getThemeInfo(themeNameStr);
                  return (
                    <option
                      key={themeNameStr}
                      value={themeNameStr}
                      className="bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                    >
                      {themeInfo.label}
                    </option>
                  );
                })}
              </select>
              {/* Theme Preview */}
              <div className="mt-3 p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] animate-fade-in">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const themeInfo = getThemeInfo(theme.name);
                      const IconComponent = themeInfo.icon;
                      const themeOption = getThemeConfig(theme.name as any);
                      return (
                        <>
                          <IconComponent className="h-5 w-5 text-[var(--text-primary)]" />
                          <div
                            className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: themeOption.primary }}
                          />
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {getThemeInfo(theme.name).label}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {getThemeInfo(theme.name).description}
                    </div>
                  </div>
                </div>
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
                    className={`btn interactive-bounce rounded-lg border-2 p-3 text-center theme-transition animate-slide-up ${
                      settings.currency === currency
                        ? 'border-[var(--color-primary)] bg-[var(--bg-secondary)] text-[var(--color-primary)]'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--color-hover)] hover:text-[var(--text-primary)]'
                    }`}
                    style={{animationDelay: `${['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'MYR'].indexOf(currency) * 50}ms`}}
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
                    className={`btn interactive-bounce rounded-lg border-2 p-3 text-center theme-transition animate-slide-up ${
                      settings.time_format === format.value
                        ? 'border-[var(--color-primary)] bg-[var(--bg-secondary)] text-[var(--color-primary)]'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--color-hover)] hover:text-[var(--text-primary)]'
                    }`}
                    style={{animationDelay: `${[{ value: '12h', label: t('settings.timeFormat12') }, { value: '24h', label: t('settings.timeFormat24') }].findIndex(f => f.value === format.value) * 100}ms`}}
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
                  className="btn-primary interactive-scale flex items-center space-x-2 px-3 py-1 text-sm bg-[var(--color-primary)] text-white rounded-md hover:bg-opacity-90 disabled:opacity-50 theme-transition"
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
                      <span className={`font-medium theme-transition ${currencyStatus.source === 'live' ? 'text-[var(--color-success)]' : currencyStatus.source === 'fallback' ? 'text-[var(--color-warning)]' : 'text-[var(--color-info)]'}`}>
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
              className="btn-primary interactive-scale rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 theme-transition"
            >
              {t('common.done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};