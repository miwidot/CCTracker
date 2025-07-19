import React from 'react';
import { XMarkIcon, ChartBarIcon, CurrencyDollarIcon, BoltIcon, FireIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../hooks/useTranslation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, currentPage }) => {
  const { t } = useTranslation();

  const menuItems = [
    { icon: ChartBarIcon, label: t('navigation.dashboard'), page: 'dashboard' },
    { icon: CurrencyDollarIcon, label: t('navigation.analytics'), page: 'analytics' },
    { icon: BoltIcon, label: t('navigation.businessIntelligence'), page: 'business-intelligence' },
    { icon: FireIcon, label: t('navigation.liveMonitoring'), page: 'live-monitoring', highlight: true },
  ];

  const handleNavigation = (page: string) => {
    onNavigate(page);
    onClose(); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden animate-fade-in modal-overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] sidebar theme-transition transform ease-out ${
          isOpen ? 'translate-x-0 animate-slide-right' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header with macOS controls spacing */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] sidebar-with-controls theme-transition">
            <div className="flex items-center space-x-2 animate-slide-right animate-delay-100">
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center theme-transition interactive-scale">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-[var(--text-primary)] theme-transition">{t('app.title')}</span>
            </div>
            <button
              onClick={onClose}
              aria-label={t('navigation.closeMenu')}
              className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] lg:hidden interactive-scale theme-transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClose();
                }
              }}
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-3 stagger-children" role="navigation" aria-label="Main navigation">
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.page)}
                aria-current={currentPage === item.page ? 'page' : undefined}
                aria-label={item.label}
                className={`group w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left sidebar-item relative transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                  currentPage === item.page
                    ? 'bg-[var(--color-primary)] text-white shadow-lg transform scale-[1.02]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--text-primary)] hover:transform hover:scale-[1.01] hover:shadow-md'
                } ${item.highlight === true ? 'ring-2 ring-[var(--color-info)] ring-opacity-50 animate-pulse' : ''}`}
                style={{ animationDelay: `${index * 75}ms` }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavigation(item.page);
                  }
                }}
              >
                <div className={`p-2 rounded-lg transition-all duration-200 ${
                  currentPage === item.page
                    ? 'bg-white bg-opacity-20'
                    : 'bg-[var(--bg-tertiary)] group-hover:bg-[var(--color-primary)] group-hover:bg-opacity-10'
                }`}>
                  <item.icon className="h-5 w-5 theme-transition" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                  {item.highlight === true && (
                    <div className="flex items-center mt-1">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                        {t('common.new')}
                      </span>
                    </div>
                  )}
                </div>
                {currentPage === item.page && (
                  <div className="w-1 h-6 bg-white rounded-full opacity-80" />
                )}
              </button>
            ))}
          </nav>

        </div>
      </div>
    </>
  );
};