import { getVersion } from '@shared/utils/version';

/**
 * Injects the current version into i18n translation strings
 * Replaces {{version}} placeholders with actual version from package.json
 */
export const injectVersionIntoTranslations = (translations: any): any => {
  const version = getVersion();
  
  const injectIntoObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{version\}\}/g, version);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(injectIntoObject);
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = injectIntoObject(value);
      }
      return result;
    }
    
    return obj;
  };
  
  return injectIntoObject(translations);
};