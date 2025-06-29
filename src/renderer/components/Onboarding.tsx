import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircleIcon, 
  DocumentTextIcon, 
  CogIcon, 
  ChartBarIcon,
  FolderIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onSkip }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: t('onboarding.welcome.title'),
      description: t('onboarding.welcome.description'),
      icon: DocumentTextIcon,
      content: (
        <div className="text-center space-y-4">
          <div className="text-6xl font-bold text-[var(--color-primary)] mb-4 theme-transition">CCTracker</div>
          <p className="text-lg text-[var(--text-secondary)] theme-transition">
            {t('onboarding.welcome.subtitle')}
          </p>
          <div className="bg-[var(--color-primary-bg)] p-4 rounded-lg theme-transition">
            <p className="text-sm text-[var(--color-primary)] theme-transition">
              {t('onboarding.welcome.note')}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'setup',
      title: t('onboarding.setup.title'),
      description: t('onboarding.setup.description'),
      icon: CogIcon,
      content: (
        <div className="space-y-6">
          <div className="bg-[var(--bg-secondary)] p-4 rounded-lg theme-transition">
            <h4 className="font-semibold mb-2 flex items-center text-[var(--text-primary)] theme-transition">
              <FolderIcon className="w-5 h-5 mr-2 text-[var(--color-primary)] theme-transition" />
              {t('onboarding.setup.fileLocation')}
            </h4>
            <p className="text-sm text-[var(--text-secondary)] mb-2 theme-transition">
              {t('onboarding.setup.fileLocationDesc')}
            </p>
            <code className="bg-[var(--bg-tertiary)] px-2 py-1 rounded text-xs text-[var(--text-primary)] theme-transition">
              ~/.claude/projects/
            </code>
          </div>
          
          <div className="bg-[var(--color-warning-bg)] p-4 rounded-lg theme-transition">
            <h4 className="font-semibold mb-2 text-[var(--color-warning)] theme-transition">
              {t('onboarding.setup.prerequisite')}
            </h4>
            <p className="text-sm text-[var(--color-warning)] opacity-90 theme-transition">
              {t('onboarding.setup.prerequisiteDesc')}
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-[var(--text-primary)] theme-transition">{t('onboarding.setup.steps')}</h4>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="bg-[var(--color-primary)] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 theme-transition">1</span>
                <span className="text-[var(--text-primary)] theme-transition">{t('onboarding.setup.step1')}</span>
              </li>
              <li className="flex items-start">
                <span className="bg-[var(--color-primary)] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 theme-transition">2</span>
                <span className="text-[var(--text-primary)] theme-transition">{t('onboarding.setup.step2')}</span>
              </li>
              <li className="flex items-start">
                <span className="bg-[var(--color-primary)] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 theme-transition">3</span>
                <span className="text-[var(--text-primary)] theme-transition">{t('onboarding.setup.step3')}</span>
              </li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: t('onboarding.features.title'),
      description: t('onboarding.features.description'),
      icon: ChartBarIcon,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[var(--border-color)] p-4 rounded-lg theme-transition">
              <h4 className="font-semibold mb-2 text-[var(--text-primary)] theme-transition">{t('onboarding.features.realtime')}</h4>
              <p className="text-sm text-[var(--text-secondary)] theme-transition">
                {t('onboarding.features.realtimeDesc')}
              </p>
            </div>
            
            <div className="border border-[var(--border-color)] p-4 rounded-lg theme-transition">
              <h4 className="font-semibold mb-2 text-[var(--text-primary)] theme-transition">{t('onboarding.features.analytics')}</h4>
              <p className="text-sm text-[var(--text-secondary)] theme-transition">
                {t('onboarding.features.analyticsDesc')}
              </p>
            </div>
            
            <div className="border border-[var(--border-color)] p-4 rounded-lg theme-transition">
              <h4 className="font-semibold mb-2 text-[var(--text-primary)] theme-transition">{t('onboarding.features.export')}</h4>
              <p className="text-sm text-[var(--text-secondary)] theme-transition">
                {t('onboarding.features.exportDesc')}
              </p>
            </div>
            
            <div className="border border-[var(--border-color)] p-4 rounded-lg theme-transition">
              <h4 className="font-semibold mb-2 text-[var(--text-primary)] theme-transition">{t('onboarding.features.multicurrency')}</h4>
              <p className="text-sm text-[var(--text-secondary)] theme-transition">
                {t('onboarding.features.multicurrencyDesc')}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'complete',
      title: t('onboarding.complete.title'),
      description: t('onboarding.complete.description'),
      icon: CheckCircleIcon,
      content: (
        <div className="text-center space-y-6">
          <CheckCircleIcon className="w-16 h-16 text-[var(--color-success)] mx-auto theme-transition" />
          <div>
            <h3 className="text-xl font-semibold mb-2 text-[var(--text-primary)] theme-transition">{t('onboarding.complete.ready')}</h3>
            <p className="text-[var(--text-secondary)] theme-transition">
              {t('onboarding.complete.readyDesc')}
            </p>
          </div>
          
          <div className="bg-[var(--color-success-bg)] p-4 rounded-lg theme-transition">
            <h4 className="font-semibold text-[var(--color-success)] mb-2 theme-transition">
              {t('onboarding.complete.nextSteps')}
            </h4>
            <ul className="text-sm text-[var(--color-success)] opacity-90 space-y-1 text-left theme-transition">
              <li>• {t('onboarding.complete.step1')}</li>
              <li>• {t('onboarding.complete.step2')}</li>
              <li>• {t('onboarding.complete.step3')}</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden theme-transition">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] theme-transition">
          <div className="flex items-center space-x-3">
            <div className="bg-[var(--color-primary-bg)] p-2 rounded-lg theme-transition">
              <IconComponent className="w-6 h-6 text-[var(--color-primary)] theme-transition" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] theme-transition">
                {currentStepData.title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] theme-transition">
                {t('onboarding.stepOf', { current: currentStep + 1, total: steps.length })}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors theme-transition"
            aria-label={t('onboarding.skip')}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2">
          <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2 theme-transition">
            <div 
              className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          <p className="text-[var(--text-secondary)] mb-6 theme-transition">
            {currentStepData.description}
          </p>
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--border-color)] theme-transition">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors theme-transition"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            {t('onboarding.previous')}
          </button>

          <div className="flex space-x-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors theme-transition ${
                  index === currentStep 
                    ? 'bg-[var(--color-primary)]' 
                    : index < currentStep 
                      ? 'bg-[var(--color-primary)] opacity-60' 
                      : 'bg-[var(--bg-tertiary)]'
                }`}
                aria-label={t('onboarding.goToStep', { step: index + 1 })}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-md hover:bg-opacity-90 transition-colors theme-transition"
          >
            {currentStep === steps.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
            <ArrowRightIcon className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};