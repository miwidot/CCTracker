import packageJson from '../../../package.json';

/**
 * Centralized version management
 * Single source of truth from package.json
 */
export const VERSION = packageJson.version;

/**
 * Get the current application version
 */
export const getVersion = (): string => {
  return VERSION;
};

/**
 * Get version with 'v' prefix (for tags, etc.)
 */
export const getVersionWithPrefix = (): string => {
  return `v${VERSION}`;
};

/**
 * Check if current version is newer than provided version
 */
export const isNewerVersion = (compareVersion: string): boolean => {
  const current = VERSION.split('.').map(Number);
  const compare = compareVersion.split('.').map(Number);
  
  for (let i = 0; i < Math.max(current.length, compare.length); i++) {
    const currentPart = current[i] || 0;
    const comparePart = compare[i] || 0;
    
    if (currentPart > comparePart) return true;
    if (currentPart < comparePart) return false;
  }
  
  return false;
};

/**
 * Get version info object for display
 */
export const getVersionInfo = () => {
  return {
    version: VERSION,
    versionWithPrefix: `v${VERSION}`,
    major: parseInt(VERSION.split('.')[0]),
    minor: parseInt(VERSION.split('.')[1]),
    patch: parseInt(VERSION.split('.')[2])
  };
};