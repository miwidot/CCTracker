import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

const getLanguages = (t: any): Language[] => [
  { code: 'en', name: t('languages.english'), nativeName: 'English' },
  { code: 'de', name: t('languages.german'), nativeName: 'Deutsch' },
  { code: 'fr', name: t('languages.french'), nativeName: 'Français' },
  { code: 'es', name: t('languages.spanish'), nativeName: 'Español' },
  { code: 'ja', name: t('languages.japanese'), nativeName: '日本語' },
  { code: 'zh', name: t('languages.chineseSimplified'), nativeName: '简体中文' },
];

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
  };

  return (
    <select
      value={i18n.language}
      onChange={handleLanguageChange}
      className={`input interactive-scale theme-transition bg-transparent border border-[var(--border-color)] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] hover:border-[var(--border-hover)] ${className}`}
      aria-label={t('ui.selectLanguage')}
    >
      {getLanguages(t).map((language) => (
        <option
          key={language.code}
          value={language.code}
          className="bg-[var(--bg-primary)] text-[var(--text-primary)] theme-transition"
        >
          {language.nativeName}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector;