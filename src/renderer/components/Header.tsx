import React, { useState } from 'react';
import { Bars3Icon, ArrowPathIcon, CogIcon } from '@heroicons/react/24/outline';
import { useUsageData } from '../contexts/UsageDataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { LanguageSelector } from './LanguageSelector';
import { SettingsModal } from './SettingsModal';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { t } = useTranslation();
  const { refreshData, isLoading, lastUpdated } = useUsageData();
  const { theme } = useTheme();
  const { formatTime } = useTimeFormat();
  const [showSettings, setShowSettings] = useState(false);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    return formatTime(date);
  };

  return (
    <>
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4 window-drag">
        <div className="flex items-center justify-between">
          {/* Left side with macOS spacing */}
          <div className="flex items-center space-x-4 header-with-controls">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors window-no-drag"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            
            <div className="window-no-drag">
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                {t('app.title')}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {t('app.subtitle')}
              </p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-4 window-no-drag">
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
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
              title={t('common.settings')}
            >
              <CogIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
};