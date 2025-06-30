import { autoUpdater } from 'electron-updater';
import { dialog, type BrowserWindow } from 'electron';
import { log } from '@shared/utils/logger';

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInProgress = false;
  private updateDownloaded = false;

  constructor() {
    this.setupAutoUpdater();
  }

  /**
   * Set the main window reference for dialogs and notifications
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Configure auto-updater settings and event handlers
   */
  private setupAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // DEVELOPMENT FIX: Force development mode to bypass macOS code signature validation
    // This solves "code object is not signed at all" error during development
    autoUpdater.forceDevUpdateConfig = true;
    
    // In development, only skip event handlers if forceDevUpdateConfig is not enabled
    if (process.env.NODE_ENV === 'development' && !autoUpdater.forceDevUpdateConfig) {
      return;
    }

    // Set up event handlers
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for updates', 'AutoUpdater');
      this.updateCheckInProgress = true;
    });

    autoUpdater.on('update-available', (info) => {
      log.info(`Update available: ${info.version}`, 'AutoUpdater');
      this.updateCheckInProgress = false;
      void this.handleUpdateAvailable(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info(`No updates available. Current version: ${info.version}`, 'AutoUpdater');
      this.updateCheckInProgress = false;
    });

    autoUpdater.on('error', (error) => {
      log.error('Auto-updater error', error, 'AutoUpdater');
      this.updateCheckInProgress = false;
      void this.handleUpdateError(error);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const logMessage = `Download progress: ${progressObj.percent.toFixed(2)}% (${progressObj.transferred}/${progressObj.total} bytes)`;
      log.info(logMessage, 'AutoUpdater');
      
      // Send progress to renderer process
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info(`Update downloaded: ${info.version}`, 'AutoUpdater');
      this.updateDownloaded = true;
      void this.handleUpdateDownloaded(info);
    });
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates(): Promise<boolean> {
    // Allow update checks in development when forceDevUpdateConfig is enabled
    if (process.env.NODE_ENV === 'development' && !autoUpdater.forceDevUpdateConfig) {
      log.info('Auto-updater disabled in development mode', 'AutoUpdater');
      return false;
    }

    if (this.updateCheckInProgress) {
      log.info('Update check already in progress', 'AutoUpdater');
      return false;
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      return result !== null;
    } catch (error) {
      log.error('Failed to check for updates', error as Error, 'AutoUpdater');
      return false;
    }
  }

  /**
   * Download and install update
   */
  async downloadAndInstallUpdate(): Promise<void> {
    // Allow downloads in development when forceDevUpdateConfig is enabled
    if (process.env.NODE_ENV === 'development' && !autoUpdater.forceDevUpdateConfig) {
      return;
    }

    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error('Failed to download update', error as Error, 'AutoUpdater');
      throw error;
    }
  }

  /**
   * Install update and restart app
   */
  quitAndInstall(): void {
    if (!this.updateDownloaded) {
      log.error('No update downloaded to install', new Error('No update available'), 'AutoUpdater');
      return;
    }

    log.info('Installing update and restarting app', 'AutoUpdater');
    autoUpdater.quitAndInstall();
  }

  /**
   * Handle update available event
   */
  private async handleUpdateAvailable(info: { version: string }): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it now?`,
      detail: 'The update will be downloaded in the background. You can continue using the app.',
      buttons: ['Download Update', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (response.response === 0) {
      try {
        await this.downloadAndInstallUpdate();
      } catch (error) {
        log.error('Failed to start update download', error as Error, 'AutoUpdater');
      }
    }
  }

  /**
   * Handle update downloaded event
   */
  private async handleUpdateDownloaded(info: { version: string }): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Update (${info.version}) has been downloaded and is ready to install.`,
      detail: 'The app will restart to complete the installation.',
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (response.response === 0) {
      this.quitAndInstall();
    }
  }

  /**
   * Handle update error
   */
  private async handleUpdateError(error: Error): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // Provide user-friendly error messages for common issues
    let userMessage = 'An error occurred while checking for updates.';
    let userDetail = error.message;

    if (error.message.includes('404') && error.message.includes('latest-mac.yml')) {
      userMessage = 'Update check temporarily unavailable.';
      userDetail = 'The update service is currently unavailable. Please try again later or check for updates manually.';
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      userMessage = 'Network connection issue.';
      userDetail = 'Unable to connect to the update server. Please check your internet connection.';
    }

    await dialog.showMessageBox(this.mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: userMessage,
      detail: userDetail,
      buttons: ['OK']
    });
  }

  /**
   * Initialize auto-updater after app is ready
   */
  initialize(): void {
    // Allow initialization in development when forceDevUpdateConfig is enabled
    if (process.env.NODE_ENV === 'development' && !autoUpdater.forceDevUpdateConfig) {
      log.info('Auto-updater skipped in development mode', 'AutoUpdater');
      return;
    }

    // Log development mode status
    if (autoUpdater.forceDevUpdateConfig) {
      log.info('Auto-updater initialized in development mode with forceDevUpdateConfig', 'AutoUpdater');
    }

    // Wait a bit after app startup before checking for updates
    setTimeout(() => {
      this.checkForUpdates().catch((error) => {
        log.error('Initial update check failed', error as Error, 'AutoUpdater');
      });
    }, 10000); // Wait 10 seconds after startup

    // Set up periodic checks (every 4 hours)
    setInterval(() => {
      this.checkForUpdates().catch((error) => {
        log.error('Periodic update check failed', error as Error, 'AutoUpdater');
      });
    }, 4 * 60 * 60 * 1000);
  }

  /**
   * Get current update status
   */
  getStatus(): {
    checking: boolean;
    updateAvailable: boolean;
    updateDownloaded: boolean;
  } {
    return {
      checking: this.updateCheckInProgress,
      updateAvailable: false, // Will be set via events
      updateDownloaded: this.updateDownloaded
    };
  }
}

export const autoUpdaterService = new AutoUpdaterService();