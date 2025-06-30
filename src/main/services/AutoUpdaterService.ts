import { autoUpdater } from 'electron-updater';
import { dialog, shell, type BrowserWindow } from 'electron';
import { log } from '@shared/utils/logger';
import { getVersion } from '@shared/utils/version';

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInProgress = false;
  private updateDownloaded = false;
  private readonly repoOwner = 'miwi-fbsd';
  private readonly repoName = 'CCTracker';
  private lastManualCheckTime = 0;
  private readonly manualCheckCooldown = 5 * 60 * 1000; // 5 minutes cooldown

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
      
      // Check if this is a signature validation error
      if (this.isSignatureError(error)) {
        log.info('Signature validation error detected, trying manual update check', 'AutoUpdater');
        void this.fallbackToManualUpdateCheck();
      } else {
        void this.handleUpdateError(error);
      }
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

  /**
   * Manual update check using GitHub API (fallback for signature issues)
   */
  async checkForUpdatesManually(): Promise<boolean> {
    // Rate limiting: only allow manual checks every 5 minutes
    const now = Date.now();
    if (now - this.lastManualCheckTime < this.manualCheckCooldown) {
      log.info('Manual update check rate limited', 'AutoUpdater');
      return false;
    }
    this.lastManualCheckTime = now;

    try {
      log.info('Checking for updates manually via GitHub API', 'AutoUpdater');
      const latestRelease = await this.fetchLatestRelease();
      
      if (!latestRelease) {
        log.info('No release information available', 'AutoUpdater');
        return false;
      }

      const currentVersion = getVersion();
      const latestVersion = latestRelease.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
      
      if (this.isNewerVersion(latestVersion, currentVersion)) {
        log.info(`Manual update available: ${latestVersion} (current: ${currentVersion})`, 'AutoUpdater');
        await this.showManualUpdateDialog(latestRelease);
        return true;
      } else {
        log.info(`No manual updates available. Latest: ${latestVersion}, Current: ${currentVersion}`, 'AutoUpdater');
        await this.showNoUpdatesDialog();
        return false;
      }
    } catch (error) {
      log.error('Manual update check failed', error as Error, 'AutoUpdater');
      await this.showManualUpdateError(error as Error);
      return false;
    }
  }

  /**
   * Check if error is related to code signature validation
   */
  private isSignatureError(error: Error): boolean {
    const signatureErrors = [
      'code object is not signed',
      'signature validation',
      'code signature',
      'gatekeeper',
      'developer cannot be verified'
    ];
    
    return signatureErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType.toLowerCase())
    );
  }

  /**
   * Fallback to manual update check when auto-updater fails with signature error
   */
  private async fallbackToManualUpdateCheck(): Promise<void> {
    try {
      const latestRelease = await this.fetchLatestRelease();
      
      if (!latestRelease) {
        await this.showSignatureErrorWithoutUpdate();
        return;
      }

      const currentVersion = getVersion();
      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      
      if (this.isNewerVersion(latestVersion, currentVersion)) {
        await this.showSignatureErrorWithUpdate(latestRelease);
      } else {
        await this.showSignatureErrorWithoutUpdate();
      }
    } catch (error) {
      log.error('Fallback manual update check failed', error as Error, 'AutoUpdater');
      await this.showSignatureErrorWithoutUpdate();
    }
  }

  /**
   * Fetch latest release from GitHub API
   */
  private async fetchLatestRelease(): Promise<any> {
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      log.error('Failed to fetch latest release', error as Error, 'AutoUpdater');
      throw error;
    }
  }

  /**
   * Compare version strings (semantic versioning)
   */
  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    
    return false;
  }

  /**
   * Show manual update dialog when update is available
   */
  private async showManualUpdateDialog(release: any): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    const releaseUrl = release.html_url;
    const version = release.tag_name;
    const publishedDate = new Date(release.published_at).toLocaleDateString();

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `CCTracker ${version} is now available!`,
      detail: `A new version was published on ${publishedDate}. Click "Download Now" to visit the GitHub releases page and download the latest version manually.`,
      buttons: ['Download Now', 'View Release Notes', 'Later'],
      defaultId: 0,
      cancelId: 2
    });

    if (response.response === 0) {
      // Download Now - open releases page
      await shell.openExternal(releaseUrl);
    } else if (response.response === 1) {
      // View Release Notes - open releases page
      await shell.openExternal(releaseUrl);
    }
    // Response 2 = Later, do nothing
  }

  /**
   * Show dialog when no updates are available
   */
  private async showNoUpdatesDialog(): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    const currentVersion = getVersion();

    await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'No Updates Available',
      message: 'You have the latest version!',
      detail: `CCTracker ${currentVersion} is the most recent version available.`,
      buttons: ['OK']
    });
  }

  /**
   * Show error dialog for manual update check failures
   */
  private async showManualUpdateError(error: Error): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    await dialog.showMessageBox(this.mainWindow, {
      type: 'error',
      title: 'Update Check Failed',
      message: 'Unable to check for updates',
      detail: `Failed to connect to GitHub releases. Please check your internet connection or try again later.\n\nError: ${error.message}`,
      buttons: ['OK']
    });
  }

  /**
   * Show signature error dialog when update is available
   */
  private async showSignatureErrorWithUpdate(release: any): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    const releaseUrl = release.html_url;
    const version = release.tag_name;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'warning',
      title: 'Update Available - Manual Download Required',
      message: `CCTracker ${version} is available!`,
      detail: `Automatic updates are not available due to code signing requirements. Please download the latest version manually from GitHub releases.`,
      buttons: ['Download Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (response.response === 0) {
      await shell.openExternal(releaseUrl);
    }
  }

  /**
   * Show signature error dialog when no update is available
   */
  private async showSignatureErrorWithoutUpdate(): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    await dialog.showMessageBox(this.mainWindow, {
      type: 'warning',
      title: 'Update Check Complete',
      message: 'Automatic updates unavailable',
      detail: 'Automatic updates are not available due to code signing requirements, but you already have the latest version.',
      buttons: ['OK']
    });
  }
}

export const autoUpdaterService = new AutoUpdaterService();