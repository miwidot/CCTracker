import { useTranslation as useReactI18next } from 'react-i18next';

export const useTranslation = (namespace?: string) => {
  return useReactI18next(namespace);
};

export default useTranslation;