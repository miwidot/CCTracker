import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { UsageDataProvider } from './contexts/UsageDataContext';
import { Layout } from './components/Layout';
import UsageDashboard from './components/UsageDashboard';
import { BusinessIntelligenceDashboard } from './components/BusinessIntelligenceDashboard';
import { SimpleUsageAnalytics } from './components/SimpleUsageAnalytics';
import ProjectDetailView from './components/ProjectDetailView';
import { LiveMonitoringDashboard } from './components/LiveMonitoringDashboard';
import { Onboarding } from './components/Onboarding';
import { useTranslation } from './hooks/useTranslation';
import type { AppSettings, ProjectAnalytics } from '@shared/types';
import { log } from '@shared/utils/logger';

type CurrentPage = 'dashboard' | 'analytics' | 'business-intelligence' | 'project-detail' | 'live-monitoring';

// Type guard function to validate if a page is a valid CurrentPage
const isValidCurrentPage = (page: string): page is CurrentPage => {
  return page === 'dashboard' || page === 'analytics' || page === 'business-intelligence' || page === 'project-detail' || page === 'live-monitoring';
};

export const App: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<CurrentPage>('dashboard');
  const [selectedProject, setSelectedProject] = useState<ProjectAnalytics | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for DOM to be fully ready
        if (document.readyState !== 'complete') {
          await new Promise<void>(resolve => {
            window.addEventListener('load', () => resolve(), { once: true });
          });
        }
        
        // Small delay to ensure IPC is ready
        await new Promise<void>(resolve => {
          setTimeout(() => {
            resolve();
          }, 150);
        });
        
        const appSettings = await window.electronAPI.getSettings();
        setSettings(appSettings);
        
        // Sync i18n with settings language
        if (appSettings.language) {
          await import('./i18n').then(({ default: i18n }) => {
            void i18n.changeLanguage(appSettings.language);
          });
        }
        
        // Check if user has seen onboarding
        const hasSeenOnboarding = localStorage.getItem('cctracker-onboarding-completed');
        const isFirstTime = hasSeenOnboarding === null;
        setShowOnboarding(isFirstTime);
      } catch (error) {
        log.component.error('App', error as Error);
        // Set default settings if IPC fails
        setSettings({
          language: 'en',
          theme: 'light',
          currency: 'USD',
          monitoring_enabled: true,
          refresh_interval: 5000,
          data_retention_days: 90,
          time_format: '24h'
        });
        
        // For fallback settings, still check onboarding
        const hasSeenOnboarding = localStorage.getItem('cctracker-onboarding-completed');
        const isFirstTime = hasSeenOnboarding === null;
        setShowOnboarding(isFirstTime);
      } finally {
        setLoading(false);
      }
    };

    void initializeApp();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <div className="w-12 h-12 bg-[var(--text-accent)] rounded-full mx-auto" />
          </div>
          <p className="text-lg">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-error)] text-[var(--text-error)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('app.error')}</h1>
          <p>{t('app.errorMessage')}</p>
        </div>
      </div>
    );
  }

  const handleProjectSelect = (project: ProjectAnalytics) => {
    setSelectedProject(project);
    setCurrentPage('project-detail');
  };

  const handleBackToAnalytics = () => {
    setSelectedProject(null);
    setCurrentPage('analytics');
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('cctracker-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('cctracker-onboarding-completed', 'true');
    setShowOnboarding(false);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <UsageDashboard />;
      case 'analytics':
        return <SimpleUsageAnalytics onProjectSelect={handleProjectSelect} />;
      case 'business-intelligence':
        return <BusinessIntelligenceDashboard />;
      case 'live-monitoring':
        return <LiveMonitoringDashboard />;
      case 'project-detail':
        return selectedProject ? (
          <ProjectDetailView 
            project={selectedProject} 
            onBack={handleBackToAnalytics}
          />
        ) : (
          <SimpleUsageAnalytics onProjectSelect={handleProjectSelect} />
        );
      default:
        return <UsageDashboard />;
    }
  };

  return (
    <SettingsProvider initialSettings={settings}>
      <ThemeProvider>
        <UsageDataProvider>
          <Layout 
            onNavigate={(page: string) => {
              if (isValidCurrentPage(page)) {
                // Reset project selection when navigating away from project detail
                if (page !== 'project-detail') {
                  setSelectedProject(null);
                }
                setCurrentPage(page);
              } else {
                log.warn(`Invalid page navigation attempt: ${page}. Defaulting to dashboard.`, 'App');
                setCurrentPage('dashboard');
              }
            }} 
            currentPage={currentPage === 'project-detail' ? 'analytics' : currentPage}
            onShowOnboarding={() => setShowOnboarding(true)}
          >
            {renderCurrentPage()}
            {showOnboarding && (
              <Onboarding 
                onComplete={handleOnboardingComplete}
                onSkip={handleOnboardingSkip}
              />
            )}
          </Layout>
        </UsageDataProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
};