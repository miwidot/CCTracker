import { dialog, shell, type BrowserWindow } from 'electron';
import { log } from '@shared/utils/logger';
import { getVersion } from '@shared/utils/version';

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private readonly updateCheckInProgress = false;
  private readonly updateDownloaded = false;
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
    // DISABLED: Auto-updater disabled due to lack of code signing
    // Using manual notification system as primary update method
    log.info('Auto-updater disabled - using manual notification system', 'AutoUpdater');
    
    // Note: Auto-updater completely disabled to prevent signature validation errors
    // All update functionality uses manual GitHub API checks via checkForUpdatesManually()
  }

  /**
   * Check for updates manually (redirects to manual system)
   */
  async checkForUpdates(): Promise<boolean> {
    log.info('Auto-updater disabled - redirecting to manual update check', 'AutoUpdater');
    return this.checkForUpdatesManually();
  }

  /**
   * Download and install update (disabled - manual only)
   */
  downloadAndInstallUpdate(): Promise<void> {
    log.info('Auto-download disabled - please use manual update check', 'AutoUpdater');
    return Promise.reject(new Error('Automatic downloads disabled. Please use manual update check.'));
  }

  /**
   * Install update and restart app (disabled - manual only)
   */
  quitAndInstall(): void {
    log.info('Auto-install disabled - please download manually from GitHub', 'AutoUpdater');
    throw new Error('Automatic installation disabled. Please download manually from GitHub.');
  }

  // Note: Auto-updater event handlers removed since auto-updater is disabled
  // All update functionality now uses manual GitHub API system

  /**
   * Initialize update system (manual notification only)
   */
  initialize(): void {
    log.info('Update system initialized - manual notification mode only', 'AutoUpdater');
    
    // No automatic background checks since we use manual system
    // Users can check for updates via Settings > About > Check for Updates
    // This prevents background signature validation errors
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

  // Note: Signature error detection removed since auto-updater is completely disabled

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

  // Note: Signature error dialogs removed since we use manual-only update system
}

export const autoUpdaterService = new AutoUpdaterService();