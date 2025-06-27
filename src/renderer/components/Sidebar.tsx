import React from 'react';
import { XMarkIcon, ChartBarIcon, CurrencyDollarIcon, DocumentArrowDownIcon, Cog6ToothIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { THEMES } from '@shared/constants';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, currentPage }) => {
  const { theme, setTheme } = useTheme();

  const menuItems = [
    { icon: ChartBarIcon, label: 'Dashboard', page: 'dashboard' },
    { icon: BoltIcon, label: 'Business Intelligence', page: 'business-intelligence', highlight: true },
    { icon: CurrencyDollarIcon, label: 'Usage Analytics', page: 'analytics' },
    { icon: DocumentArrowDownIcon, label: 'Export Data', page: 'export' },
    { icon: Cog6ToothIcon, label: 'Settings', page: 'settings' },
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[var(--text-accent)] rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-[var(--text-primary)]">Cost Tracker</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] lg:hidden"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.page)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors relative ${
                  currentPage === item.page
                    ? 'bg-[var(--text-accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                } ${item.highlight ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full font-bold">
                    NEW
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Theme Selector */}
          <div className="p-4 border-t border-[var(--border-color)]">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Theme</h3>
            <div className="space-y-2">
              {Object.values(THEMES).map((themeOption) => (
                <button
                  key={themeOption.name}
                  onClick={() => setTheme(themeOption.name)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    theme.name === themeOption.name
                      ? 'bg-[var(--text-accent)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-current"
                    style={{ backgroundColor: themeOption.primary }}
                  />
                  <span className="capitalize">{themeOption.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};