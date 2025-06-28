import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { UsageService } from './services/UsageService';
import { FileMonitorService } from './services/FileMonitorService';
import { SettingsService } from './services/SettingsService';
import { CurrencyService } from './services/CurrencyService';
import { ExportService } from './services/ExportService';
import { setupIpcHandlers } from './ipc/ipcHandlers';
import { log } from '@shared/utils/logger';

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
      titleBarStyle: 'hiddenInset',
      titleBarOverlay: {
        color: '#1e293b',
        symbolColor: '#ffffff',
        height: 32
      },
      show: false,
      backgroundColor: '#ffffff',
      paintWhenInitiallyHidden: true
    });

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
    });
  }

  private async setupServices(): Promise<void> {
    try {
      // Initialize services with proper async setup and error handling
      console.log('Initializing settings service...');
      await this.settingsService.initialize(app.getPath('userData'));
      
      console.log('Initializing usage service...');
      await this.usageService.initialize(app.getPath('userData'));
      
      console.log('Initializing currency service...');
      await this.currencyService.initialize(app.getPath('userData'));
      
      console.log('Starting file monitoring...');
      await this.fileMonitorService.startClaudeCliMonitoring();
      
      // Update export service directory  
      this.exportService.updateExportDirectory(path.join(app.getPath('userData'), 'exports'));
      
      console.log('Setting up IPC handlers...');
      setupIpcHandlers({
        usageService: this.usageService,
        fileMonitorService: this.fileMonitorService,
        settingsService: this.settingsService,
        currencyService: this.currencyService,
        exportService: this.exportService,
      });
      
      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      // Continue anyway - don't crash the app
    }
  }

  public async initialize(): Promise<void> {
    try {
      console.log('Waiting for app ready...');
      await app.whenReady();
      
      console.log('App ready, setting up services...');
      await this.setupServices();
      
      // Small delay to ensure IPC handlers are fully registered
      console.log('Waiting for IPC handlers to be ready...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Creating window...');
      this.createWindow();
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      // Still try to create window even if services fail
      try {
        this.createWindow();
      } catch (windowError) {
        console.error('Failed to create window:', windowError);
      }
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
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
  console.error('Uncaught Exception:', error);
  // Don't exit the process
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process
});

const application = new Application();
application.initialize().catch((error) => {
  console.error('Failed to initialize application:', error);
  // Still try to start the app
});