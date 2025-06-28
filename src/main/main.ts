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
    this.settingsService = new SettingsService();
    this.currencyService = new CurrencyService();
    this.exportService = new ExportService();
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
    });

    const isDev = process.env.NODE_ENV === 'development';
    
    // Always load from file system - no web server needed
    void this.mainWindow.loadFile(path.join(__dirname, 'index.html'));
    
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private async setupServices(): Promise<void> {
    // Initialize services with proper async setup
    await this.settingsService.initialize();
    await this.usageService.initialize();
    await this.currencyService.initialize();
    
    // Start Claude CLI monitoring
    await this.fileMonitorService.startClaudeCliMonitoring();
    
    setupIpcHandlers({
      usageService: this.usageService,
      fileMonitorService: this.fileMonitorService,
      settingsService: this.settingsService,
      currencyService: this.currencyService,
      exportService: this.exportService,
    });
  }

  public async initialize(): Promise<void> {
    await app.whenReady();
    await this.setupServices();
    this.createWindow();

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

const application = new Application();
application.initialize().catch((error) => {
  log.error('Failed to initialize application', error as Error, 'Application');
});