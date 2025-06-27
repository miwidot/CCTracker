import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { UsageDataProvider } from './contexts/UsageDataContext';
import { Layout } from './components/Layout';
import UsageDashboard from './components/UsageDashboard';
import { BusinessIntelligenceDashboard } from './components/BusinessIntelligenceDashboard';
import { UsageAnalyticsDashboard } from './components/UsageAnalyticsDashboard';
import type { AppSettings } from '@shared/types';

type CurrentPage = 'dashboard' | 'business-intelligence' | 'analytics' | 'export' | 'settings';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<CurrentPage>('dashboard');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const appSettings = await window.electronAPI.getSettings();
        setSettings(appSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full mx-auto"></div>
          </div>
          <p className="text-lg">Loading Cost Tracker...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Failed to Load</h1>
          <p>Unable to initialize application settings</p>
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <UsageDashboard />;
      case 'business-intelligence':
        return <BusinessIntelligenceDashboard />;
      case 'analytics':
        return <UsageAnalyticsDashboard />;
      case 'export':
        return <div className="p-8 text-center text-gray-500">Export Data (Coming Soon)</div>;
      case 'settings':
        return <div className="p-8 text-center text-gray-500">Settings (Coming Soon)</div>;
      default:
        return <UsageDashboard />;
    }
  };

  return (
    <SettingsProvider initialSettings={settings}>
      <ThemeProvider>
        <UsageDataProvider>
          <Layout onNavigate={(page: string) => setCurrentPage(page as CurrentPage)} currentPage={currentPage}>
            {renderCurrentPage()}
          </Layout>
        </UsageDataProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
};