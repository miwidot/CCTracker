import React from 'react';
import { Bars3Icon, ArrowPathIcon, CogIcon } from '@heroicons/react/24/outline';
import { useUsageData } from '../contexts/UsageDataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { t } = useTranslation();
  const { refreshData, isLoading, lastUpdated } = useUsageData();
  const { theme } = useTheme();

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              {t('app.title')}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('app.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
            <span>{t('common.lastUpdated')}:</span>
            <span className="font-mono">{formatLastUpdated(lastUpdated)}</span>
          </div>

          <LanguageSelector className="text-[var(--text-primary)]" />

          <button
            onClick={refreshData}
            disabled={isLoading}
            className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors disabled:opacity-50"
            title={t('common.refresh')}
          >
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
            title={t('common.settings')}
          >
            <CogIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};