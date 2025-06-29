import * as fs from 'fs/promises';
import * as path from 'path';
import type { AppSettings } from '@shared/types';
import { DEFAULT_SETTINGS, THEME_NAMES, SUPPORTED_LANGUAGES, getThemeConfig } from '@shared/constants';
import { log } from '@shared/utils/logger';

const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'MYR'];

export class SettingsService {
  private settingsFile: string;
  private settings: AppSettings;
  private isDirty = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(configDir: string = path.join(process.cwd(), 'config')) {
    // Use settings.json directly in the provided directory (userData)
    this.settingsFile = path.join(configDir, 'settings.json');
    this.settings = { ...DEFAULT_SETTINGS };
  }

  private async ensureConfigDirectory(): Promise<void> {
    try {
      const configDir = path.dirname(this.settingsFile);
      await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
      log.service.error('SettingsService', 'Failed to create config directory', error as Error);
      throw new Error(`Failed to create config directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Public initialize method for external use
   */
  async initialize(userDataPath?: string): Promise<void> {
    // Update settings file path if userDataPath is provided
    if (userDataPath) {
      this.settingsFile = path.join(userDataPath, 'settings.json');
    }
    
    await this.ensureConfigDirectory();
    await this.loadSettings();
  }

  /**
   * Load settings from persistent storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const content = await fs.readFile(this.settingsFile, 'utf-8');
      const savedSettings = JSON.parse(content);
      
      // Merge with defaults to ensure all required properties exist
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...savedSettings,
      };

      // Validate settings
      this.validateSettings();
      
      log.info('Settings loaded successfully', 'SettingsService');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        log.info('Settings file not found, using defaults', 'SettingsService');
        await this.saveSettings();
      } else {
        log.service.error('SettingsService', 'Failed to load settings', error as Error);
        // Use defaults on error
        this.settings = { ...DEFAULT_SETTINGS };
      }
    }
  }

  /**
   * Save settings to persistent storage
   */
  private async saveSettings(): Promise<void> {
    try {
      const content = JSON.stringify(this.settings, null, 2);
      await fs.writeFile(this.settingsFile, content, 'utf-8');
      this.isDirty = false;
      log.debug('Settings saved successfully', 'SettingsService');
    } catch (error) {
      log.service.error('SettingsService', 'Failed to save settings', error as Error);
      throw new Error(`Failed to save settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delayed save to avoid excessive writes
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      if (this.isDirty) {
        void this.saveSettings();
      }
    }, 500); // Save after 500ms of inactivity
  }

  /**
   * Validate settings values
   */
  private validateSettings(): void {
    // Validate theme (include 'system' as valid option)
    const validThemes = [...THEME_NAMES, 'system'];
    if (!validThemes.includes(this.settings.theme as string)) {
      log.warn(`Invalid theme: ${this.settings.theme}, using default`, 'SettingsService');
      this.settings.theme = DEFAULT_SETTINGS.theme;
    }

    // Validate language
    if (!Object.keys(SUPPORTED_LANGUAGES).includes(this.settings.language)) {
      log.warn(`Invalid language: ${this.settings.language}, using default`, 'SettingsService');
      this.settings.language = DEFAULT_SETTINGS.language;
    }

    // Validate currency
    if (!VALID_CURRENCIES.includes(this.settings.currency)) {
      log.warn(`Invalid currency: ${this.settings.currency}, using default`, 'SettingsService');
      this.settings.currency = DEFAULT_SETTINGS.currency;
    }

    // Validate refresh interval (min 100ms, max 60s)
    if (typeof this.settings.refresh_interval !== 'number' || 
        this.settings.refresh_interval < 100 || 
        this.settings.refresh_interval > 60000) {
      log.warn(`Invalid refresh interval: ${this.settings.refresh_interval}, using default`, 'SettingsService');
      this.settings.refresh_interval = DEFAULT_SETTINGS.refresh_interval;
    }

    // Validate data retention days (min 1, max 365)
    if (typeof this.settings.data_retention_days !== 'number' || 
        this.settings.data_retention_days < 1 || 
        this.settings.data_retention_days > 365) {
      log.warn(`Invalid data retention days: ${this.settings.data_retention_days}, using default`, 'SettingsService');
      this.settings.data_retention_days = DEFAULT_SETTINGS.data_retention_days;
    }

    // Validate monitoring enabled
    if (typeof this.settings.monitoring_enabled !== 'boolean') {
      log.warn(`Invalid monitoring enabled: ${this.settings.monitoring_enabled}, using default`, 'SettingsService');
      this.settings.monitoring_enabled = DEFAULT_SETTINGS.monitoring_enabled;
    }
  }

  /**
   * Get all current settings
   */
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Get specific setting value
   */
  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<AppSettings>): void {
    try {
      const oldSettings = { ...this.settings };
      
      // Apply updates
      Object.assign(this.settings, updates);
      
      // Validate the updated settings
      this.validateSettings();
      
      // Check if anything actually changed
      const hasChanges = Object.keys(updates).some(key => 
        oldSettings[key as keyof AppSettings] !== this.settings[key as keyof AppSettings]
      );

      if (hasChanges) {
        this.isDirty = true;
        this.scheduleSave();
        log.debug(`Settings updated: ${JSON.stringify(updates)}`, 'SettingsService');
        
        // Emit change events for specific settings
        this.notifySettingsChange(oldSettings, this.settings);
      }
    } catch (error) {
      log.service.error('SettingsService', 'Failed to update settings', error as Error);
      throw new Error(`Failed to update settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update single setting
   */
  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.updateSettings({ [key]: value } as Partial<AppSettings>);
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    try {
      const oldSettings = { ...this.settings };
      this.settings = { ...DEFAULT_SETTINGS };
      this.isDirty = true;
      await this.saveSettings();
      
      log.info('Settings reset to defaults', 'SettingsService');
      this.notifySettingsChange(oldSettings, this.settings);
    } catch (error) {
      log.service.error('SettingsService', 'Failed to reset settings', error as Error);
      throw new Error(`Failed to reset settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Notify about settings changes (for potential event system)
   */
  private notifySettingsChange(oldSettings: AppSettings, newSettings: AppSettings): void {
    // Check for theme changes
    if (oldSettings.theme !== newSettings.theme) {
      log.debug(`Theme changed: ${oldSettings.theme} -> ${newSettings.theme}`, 'SettingsService');
    }

    // Check for language changes
    if (oldSettings.language !== newSettings.language) {
      log.debug(`Language changed: ${oldSettings.language} -> ${newSettings.language}`, 'SettingsService');
    }

    // Check for currency changes
    if (oldSettings.currency !== newSettings.currency) {
      log.debug(`Currency changed: ${oldSettings.currency} -> ${newSettings.currency}`, 'SettingsService');
    }

    // Check for monitoring changes
    if (oldSettings.monitoring_enabled !== newSettings.monitoring_enabled) {
      log.debug(`Monitoring ${newSettings.monitoring_enabled ? 'enabled' : 'disabled'}`, 'SettingsService');
    }

    // Check for refresh interval changes
    if (oldSettings.refresh_interval !== newSettings.refresh_interval) {
      log.debug(`Refresh interval changed: ${oldSettings.refresh_interval}ms -> ${newSettings.refresh_interval}ms`, 'SettingsService');
    }

    // Check for data retention changes
    if (oldSettings.data_retention_days !== newSettings.data_retention_days) {
      log.debug(`Data retention changed: ${oldSettings.data_retention_days} -> ${newSettings.data_retention_days} days`, 'SettingsService');
    }
  }

  /**
   * Export settings as JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON
   */
  importSettings(jsonString: string): void {
    try {
      const importedSettings = JSON.parse(jsonString);
      
      // Validate imported settings structure
      if (typeof importedSettings !== 'object' || importedSettings === null) {
        throw new Error('Invalid settings format');
      }

      // Only import valid setting keys
      const validKeys = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[];
      const filteredSettings: Partial<AppSettings> = {};
      
      for (const key of validKeys) {
        if (key in importedSettings) {
          filteredSettings[key] = importedSettings[key];
        }
      }

      this.updateSettings(filteredSettings);
      log.info('Settings imported successfully', 'SettingsService');
    } catch (error) {
      log.service.error('SettingsService', 'Failed to import settings', error as Error);
      throw new Error(`Failed to import settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get available options for settings
   */
  getSettingsOptions(): {
    themes: { key: string; name: string }[];
    languages: { key: string; name: string }[];
    currencies: string[];
  } {
    return {
      themes: THEME_NAMES.map((key) => ({
        key: String(key),
        name: String(key).charAt(0).toUpperCase() + String(key).slice(1).replace('-', ' '),
      })),
      languages: Object.entries(SUPPORTED_LANGUAGES).map(([key, name]) => ({
        key,
        name,
      })),
      currencies: VALID_CURRENCIES,
    };
  }

  /**
   * Check if monitoring should be enabled
   */
  isMonitoringEnabled(): boolean {
    return this.settings.monitoring_enabled;
  }

  /**
   * Get current theme configuration
   */
  getCurrentTheme() {
    const theme = this.settings.theme;
    // Handle system theme by falling back to light theme for config
    if (theme === 'system') {
      return getThemeConfig('light');
    }
    return getThemeConfig(theme);
  }

  /**
   * Get refresh interval in milliseconds
   */
  getRefreshInterval(): number {
    return this.settings.refresh_interval;
  }

  /**
   * Get data retention period in days
   */
  getDataRetentionDays(): number {
    return this.settings.data_retention_days;
  }

  /**
   * Validate settings on startup
   */
  async validateAndRepair(): Promise<void> {
    try {
      this.validateSettings();
      
      if (this.isDirty) {
        await this.saveSettings();
        log.info('Settings validated and repaired', 'SettingsService');
      }
    } catch (error) {
      log.service.error('SettingsService', 'Failed to validate settings', error as Error);
      // Reset to defaults on validation failure
      await this.resetSettings();
    }
  }

  /**
   * Force immediate save
   */
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    if (this.isDirty) {
      await this.saveSettings();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }
}

// Export default instance
export const settingsService = new SettingsService();