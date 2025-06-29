import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ArrowPathIcon, SunIcon, MoonIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { useTranslation } from '../hooks/useTranslation';
import { THEME_NAMES, getThemeConfig, type COLOR_PALETTES } from '@shared/constants';
import { log } from '@shared/utils/logger';
import type { AppSettings } from '@shared/types';

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

const getLanguages = (t: (key: string) => string): Language[] => [
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
  onShowOnboarding: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onShowOnboarding }) => {
  const { theme, setTheme, systemTheme, followsSystemTheme, setFollowSystemTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { formatDateTime } = useTimeFormat();
  const { t, i18n } = useTranslation();
  const [currencyStatus, setCurrencyStatus] = useState<CurrencyStatus | null>(null);
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
      void loadCurrencyStatus();
      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      
      // Focus trapping
      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;
        
        const focusableElements = modal.querySelectorAll(
          'button, select, input, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadCurrencyStatus = async () => {
    try {
      const status = await window.electronAPI.getCurrencyStatus();
      setCurrencyStatus(status);
    } catch (error) {
      log.component.error('SettingsModal', error as Error);
    }
  };

  const handleForceUpdateCurrency = async () => {
    setIsUpdatingCurrency(true);
    try {
      await window.electronAPI.forceUpdateCurrency();
      await loadCurrencyStatus(); // Refresh status
    } catch (error) {
      log.component.error('SettingsModal', error as Error);
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  if (!isOpen) return null;

  const handleCurrencyChange = async (currency: string) => {
    await updateSettings({ currency } as Partial<AppSettings>);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 modal-overlay animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="modal modal-content relative w-full max-w-2xl transform overflow-hidden modal-radius bg-[var(--bg-primary)] modal-shadow theme-transition animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
            <h3 id="settings-modal-title" className="text-lg font-semibold text-[var(--text-primary)]">
              {t('common.settings')}
            </h3>
            <button
              ref={closeButtonRef}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              aria-label={t('common.close')}
              className="p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              type="button"
              style={{ zIndex: 10, position: 'relative', pointerEvents: 'auto' }}
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
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
                onChange={(e) => {
                  void i18n.changeLanguage(e.target.value);
                }}
                aria-label={t('ui.selectLanguage')}
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
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-medium text-[var(--text-primary)]">
                  {t('theme.title')}
                </h4>
                {systemTheme && (
                  <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                    {t('theme.systemDetected')}: {systemTheme === 'dark' ? t('theme.dark') : t('theme.light')}
                  </span>
                )}
              </div>
              
              {/* System Theme Toggle */}
              <div className="mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followsSystemTheme}
                    onChange={(e) => setFollowSystemTheme(e.target.checked)}
                    className="w-4 h-4 text-[var(--color-primary)] bg-[var(--bg-primary)] border-[var(--border-color)] rounded focus:ring-[var(--color-primary)]"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {t('theme.followSystem')}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {t('theme.followSystemDesc')}
                    </p>
                  </div>
                </label>
              </div>
              
              <select
                value={followsSystemTheme ? 'system' : theme.name}
                onChange={(e) => {
                  if (e.target.value === 'system') {
                    setFollowSystemTheme(true);
                  } else {
                    setFollowSystemTheme(false);
                    setTheme(e.target.value as keyof typeof COLOR_PALETTES);
                  }
                }}
                disabled={followsSystemTheme}
                aria-label={t('theme.title')}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent interactive-scale theme-transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="system" className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                  {t('theme.system')} ({systemTheme ? (systemTheme === 'dark' ? t('theme.dark') : t('theme.light')) : t('theme.unknown')})
                </option>
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
                      const themeOption = getThemeConfig(theme.name);
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
                    onClick={() => {
                      void handleCurrencyChange(currency);
                    }}
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
                    onClick={() => {
                      void updateSettings({ time_format: format.value } as Partial<AppSettings>);
                    }}
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
                  onClick={() => {
                    void handleForceUpdateCurrency();
                  }}
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
                        {(currencyStatus.lastUpdated != null && currencyStatus.lastUpdated !== '') ? formatDateTime(currencyStatus.lastUpdated) : t('common.never')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">{t('settings.nextUpdate')}:</span>
                      <span className="text-[var(--text-primary)]">
                        {(currencyStatus.nextUpdate != null && currencyStatus.nextUpdate !== '') ? formatDateTime(currencyStatus.nextUpdate) : t('settings.manual')}
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
              
              {/* Show Onboarding Button */}
              <div className="mt-4">
                <button
                  onClick={() => {
                    onShowOnboarding();
                    onClose();
                  }}
                  className="w-full btn interactive-scale rounded-lg border-2 border-[var(--border-color)] p-3 text-center text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--color-hover)] hover:text-[var(--text-primary)] theme-transition"
                >
                  <div className="font-medium">{t('settings.showOnboarding')}</div>
                  <div className="text-xs opacity-75">{t('settings.showOnboardingDesc')}</div>
                </button>
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