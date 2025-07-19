import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { UsageService } from './services/UsageService';
import { FileMonitorService } from './services/FileMonitorService';
import { SettingsService } from './services/SettingsService';
import { CurrencyService } from './services/CurrencyService';
import { ExportService } from './services/ExportService';
import { autoUpdaterService } from './services/AutoUpdaterService';
import { fileSystemPermissionService } from './services/FileSystemPermissionService';
import { backupService } from './services/BackupService';
import { setupIpcHandlers } from './ipc/ipcHandlers';
import { registerRealtimeHandlers } from './ipc/realtimeHandlers';
import { log } from '@shared/utils/logger';

// Global reference for IPC handlers
declare global {
  var mainWindow: BrowserWindow | null;
}

class Application {
  private mainWindow: BrowserWindow | null = null;
  private readonly usageService: UsageService;
  private readonly fileMonitorService: FileMonitorService;
  private readonly settingsService: SettingsService;
  private readonly currencyService: CurrencyService;
  private readonly exportService: ExportService;

  constructor() {
    this.usageService = new UsageService();
    this.fileMonitorService = new FileMonitorService();
    this.settingsService = new SettingsService(); // Initialize without path first
    this.currencyService = new CurrencyService();
    this.exportService = new ExportService(); // Will be updated after app.getPath is available
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      // Removed titleBarStyle: 'hiddenInset' - causes modal click issues on macOS
      // titleBarOverlay: {
      //   color: '#1e293b', 
      //   symbolColor: '#ffffff',
      //   height: 32
      // },
      show: false,
      backgroundColor: '#ffffff',
      paintWhenInitiallyHidden: true
    });

    // Set global reference for IPC handlers
    global.mainWindow = this.mainWindow;

    const isDev = process.env.NODE_ENV === 'development';
    
    // Always load from file system - no web server needed  
    const htmlPath = path.join(__dirname, 'index.html');
    void this.mainWindow.loadFile(htmlPath);
    
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    // Multiple fallback events for window showing (production build issue)
    let windowShown = false;
    
    const showWindow = () => {
      if (!windowShown && this.mainWindow) {
        windowShown = true;
        this.mainWindow.show();
        this.mainWindow.focus();
        
        // Force bring to front on macOS
        if (process.platform === 'darwin') {
          app.focus({ steal: true });
        }
      }
    };
    
    // Primary method - ready-to-show event
    this.mainWindow.once('ready-to-show', showWindow);
    
    // Fallback method - did-finish-load event  
    this.mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(showWindow, 100); // Small delay to ensure rendering
    });
    
    // Emergency fallback - dom-ready event
    this.mainWindow.webContents.once('dom-ready', () => {
      setTimeout(showWindow, 500); // Longer delay for complex rendering
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      global.mainWindow = null;
    });
  }

  private async setupServices(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      
      // Check file system permissions first
      log.info('Checking file system permissions', 'Application');
      const healthReport = await fileSystemPermissionService.getFileSystemHealthReport(userDataPath);
      
      if (healthReport.overall === 'critical') {
        log.error('Critical file system permission issues detected', new Error('File system access denied'), 'Application');
        for (const recommendation of healthReport.recommendations) {
          log.warn(recommendation, 'Application');
        }
      } else if (healthReport.overall === 'warning') {
        log.warn('File system permission warnings detected', 'Application');
        for (const recommendation of healthReport.recommendations) {
          log.warn(recommendation, 'Application');
        }
      } else {
        log.info('File system permissions are healthy', 'Application');
      }
      
      // Ensure critical directories exist
      await fileSystemPermissionService.ensureDirectoryExists(userDataPath);
      await fileSystemPermissionService.ensureDirectoryExists(path.join(userDataPath, 'exports'));
      
      // Initialize services with proper async setup and error handling
      log.info('Initializing settings service', 'Application');
      await this.settingsService.initialize(userDataPath);
      
      log.info('Initializing usage service', 'Application');
      await this.usageService.initialize(userDataPath);
      
      log.info('Initializing currency service', 'Application');
      await this.currencyService.initialize(userDataPath);
      
      log.info('Initializing backup service', 'Application');
      await backupService.initialize(userDataPath);
      
      log.info('Starting file monitoring', 'Application');
      await this.fileMonitorService.startClaudeCliMonitoring();
      
      // Update export service directory  
      this.exportService.updateExportDirectory(path.join(userDataPath, 'exports'));
      
      log.info('Setting up IPC handlers', 'Application');
      setupIpcHandlers({
        usageService: this.usageService,
        fileMonitorService: this.fileMonitorService,
        settingsService: this.settingsService,
        currencyService: this.currencyService,
        exportService: this.exportService,
      });
      
      // Register realtime monitoring handlers
      registerRealtimeHandlers();
      
      log.info('Services initialized successfully', 'Application');
    } catch (error) {
      log.error('Failed to initialize services', error as Error, 'Application');
      // Continue anyway - don't crash the app
    }
  }

  public async initialize(): Promise<void> {
    try {
      log.info('Waiting for app ready', 'Application');
      await app.whenReady();
      
      log.info('App ready, setting up services', 'Application');
      await this.setupServices();
      
      // Small delay to ensure IPC handlers are fully registered
      log.info('Waiting for IPC handlers to be ready', 'Application');
      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, 100);
      });
      
      log.info('Creating window', 'Application');
      this.createWindow();
      
      // Initialize auto-updater after window is created
      if (this.mainWindow) {
        autoUpdaterService.setMainWindow(this.mainWindow);
        autoUpdaterService.initialize();
      }
      
      log.info('Application initialization complete', 'Application');
      
    } catch (error) {
      log.error('Failed to initialize application', error as Error, 'Application');
      // Still try to create window even if services fail
      try {
        this.createWindow();
        if (this.mainWindow) {
          autoUpdaterService.setMainWindow(this.mainWindow);
        }
      } catch (windowError) {
        log.error('Failed to create window', windowError as Error, 'Application');
      }
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
        if (this.mainWindow) {
          autoUpdaterService.setMainWindow(this.mainWindow);
        }
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      // Fire and forget cleanup - don't block app quit
      this.fileMonitorService.stopMonitoring().catch((error) => {
        log.error('Failed to stop monitoring during app quit', error as Error, 'Application');
        // Continue with quit process even if cleanup fails
      });
    });
  }
}

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception', error, 'Application');
  // Don't exit the process
});

process.on('unhandledRejection', (reason, _promise) => {
  log.error('Unhandled Rejection', reason as Error, 'Application');
  // Don't exit the process
});

const application = new Application();
application.initialize().catch((error) => {
  log.error('Failed to initialize application', error as Error, 'Application');
  // Still try to start the app
});