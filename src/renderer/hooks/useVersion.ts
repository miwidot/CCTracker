import { getVersion, getVersionWithPrefix, getVersionInfo } from '@shared/utils/version';

/**
 * React hook for accessing version information
 * Provides centralized access to version data from package.json
 */
export const useVersion = () => {
  return {
    version: getVersion(),
    versionWithPrefix: getVersionWithPrefix(),
    versionInfo: getVersionInfo(),
  };
};