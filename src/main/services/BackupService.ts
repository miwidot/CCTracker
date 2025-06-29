import { promises as fs, createReadStream, createWriteStream } from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
import { log } from '@shared/utils/logger';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  version: string;
  description: string;
  size: number;
  files: {
    settings: boolean;
    usageData: boolean;
    exports: boolean;
  };
}

export interface BackupOptions {
  includeSettings: boolean;
  includeUsageData: boolean;
  includeExports: boolean;
  description?: string;
  compress: boolean;
}

export interface RestoreOptions {
  backupId: string;
  restoreSettings: boolean;
  restoreUsageData: boolean;
  restoreExports: boolean;
  createBackupBeforeRestore: boolean;
}

export interface BackupStatus {
  isRunning: boolean;
  lastBackup: string | null;
  nextScheduledBackup: string | null;
  totalBackups: number;
  totalSize: number;
  autoBackupEnabled: boolean;
}

export class BackupService {
  private userDataPath = '';
  private backupDirectory = '';
  private isBackupRunning = false;
  private autoBackupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the backup service
   */
  async initialize(userDataPath: string): Promise<void> {
    this.userDataPath = userDataPath;
    this.backupDirectory = path.join(userDataPath, 'backups');
    
    // Ensure backup directory exists
    try {
      await fs.mkdir(this.backupDirectory, { recursive: true });
      log.info('Backup service initialized', 'BackupService');
    } catch (error) {
      log.error('Failed to initialize backup service', error as Error, 'BackupService');
      throw error;
    }
  }

  /**
   * Create a full backup
   */
  async createBackup(options: BackupOptions): Promise<{ success: boolean; backupId?: string; error?: string }> {
    if (this.isBackupRunning) {
      return { success: false, error: 'Another backup is already in progress' };
    }

    this.isBackupRunning = true;
    const backupId = `backup_${Date.now()}`;
    const backupPath = path.join(this.backupDirectory, backupId);

    try {
      log.info(`Starting backup: ${backupId}`, 'BackupService');
      
      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date().toISOString(),
        version: '1.0.1', // TODO: Get from package.json
        description: options.description ?? 'Manual backup',
        size: 0,
        files: {
          settings: false,
          usageData: false,
          exports: false
        }
      };

      let totalSize = 0;

      // Backup settings
      if (options.includeSettings) {
        const settingsSuccess = await this.backupSettings(backupPath, options.compress);
        metadata.files.settings = settingsSuccess;
        if (settingsSuccess) {
          const settingsSize = await this.getFileSize(path.join(backupPath, 'settings.json'));
          totalSize += settingsSize;
        }
      }

      // Backup usage data
      if (options.includeUsageData) {
        const usageDataSuccess = await this.backupUsageData(backupPath, options.compress);
        metadata.files.usageData = usageDataSuccess;
        if (usageDataSuccess) {
          const usageDataSize = await this.getDirectorySize(path.join(backupPath, 'usage-data'));
          totalSize += usageDataSize;
        }
      }

      // Backup exports
      if (options.includeExports) {
        const exportsSuccess = await this.backupExports(backupPath, options.compress);
        metadata.files.exports = exportsSuccess;
        if (exportsSuccess) {
          const exportsSize = await this.getDirectorySize(path.join(backupPath, 'exports'));
          totalSize += exportsSize;
        }
      }

      metadata.size = totalSize;

      // Save metadata
      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf8'
      );

      log.info(`Backup completed: ${backupId} (${totalSize} bytes)`, 'BackupService');
      return { success: true, backupId };

    } catch (error) {
      log.error(`Backup failed: ${backupId}`, error as Error, 'BackupService');
      
      // Clean up failed backup
      try {
        await fs.rm(backupPath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
      
      return { success: false, error: (error as Error).message };
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Restore from a backup
   */
  async restoreFromBackup(options: RestoreOptions): Promise<{ success: boolean; error?: string }> {
    const backupPath = path.join(this.backupDirectory, options.backupId);
    
    try {
      // Verify backup exists
      const metadataPath = path.join(backupPath, 'metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata: BackupMetadata = JSON.parse(metadataContent);

      log.info(`Starting restore from backup: ${options.backupId}`, 'BackupService');

      // Create backup before restore if requested
      if (options.createBackupBeforeRestore) {
        const preRestoreBackup = await this.createBackup({
          includeSettings: true,
          includeUsageData: true,
          includeExports: true,
          description: `Pre-restore backup (before restoring ${options.backupId})`,
          compress: true
        });
        
        if (!preRestoreBackup.success) {
          return { success: false, error: 'Failed to create pre-restore backup' };
        }
      }

      // Restore settings
      if (options.restoreSettings && metadata.files.settings) {
        await this.restoreSettings(backupPath);
      }

      // Restore usage data
      if (options.restoreUsageData && metadata.files.usageData) {
        await this.restoreUsageData(backupPath);
      }

      // Restore exports
      if (options.restoreExports && metadata.files.exports) {
        await this.restoreExports(backupPath);
      }

      log.info(`Restore completed from backup: ${options.backupId}`, 'BackupService');
      return { success: true };

    } catch (error) {
      log.error(`Restore failed from backup: ${options.backupId}`, error as Error, 'BackupService');
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get list of available backups
   */
  async getAvailableBackups(): Promise<BackupMetadata[]> {
    try {
      const backups: BackupMetadata[] = [];
      const entries = await fs.readdir(this.backupDirectory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const metadataPath = path.join(this.backupDirectory, entry.name, 'metadata.json');
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata: BackupMetadata = JSON.parse(metadataContent);
            backups.push(metadata);
          } catch {
            // Skip invalid backup directories
          }
        }
      }

      // Sort by timestamp (newest first)
      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    } catch (error) {
      log.error('Failed to get available backups', error as Error, 'BackupService');
      return [];
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
    const backupPath = path.join(this.backupDirectory, backupId);
    
    try {
      await fs.rm(backupPath, { recursive: true, force: true });
      log.info(`Backup deleted: ${backupId}`, 'BackupService');
      return { success: true };
    } catch (error) {
      log.error(`Failed to delete backup: ${backupId}`, error as Error, 'BackupService');
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get backup status
   */
  async getBackupStatus(): Promise<BackupStatus> {
    try {
      const backups = await this.getAvailableBackups();
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      
      return {
        isRunning: this.isBackupRunning,
        lastBackup: backups.length > 0 ? backups[0].timestamp : null,
        nextScheduledBackup: null, // TODO: Implement scheduling
        totalBackups: backups.length,
        totalSize,
        autoBackupEnabled: this.autoBackupInterval !== null
      };
    } catch (error) {
      log.error('Failed to get backup status', error as Error, 'BackupService');
      return {
        isRunning: false,
        lastBackup: null,
        nextScheduledBackup: null,
        totalBackups: 0,
        totalSize: 0,
        autoBackupEnabled: false
      };
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(maxBackups = 10): Promise<{ deletedCount: number; error?: string }> {
    try {
      const backups = await this.getAvailableBackups();
      
      if (backups.length <= maxBackups) {
        return { deletedCount: 0 };
      }

      const backupsToDelete = backups.slice(maxBackups);
      let deletedCount = 0;

      for (const backup of backupsToDelete) {
        const result = await this.deleteBackup(backup.id);
        if (result.success) {
          deletedCount++;
        }
      }

      log.info(`Cleaned up ${deletedCount} old backups`, 'BackupService');
      return { deletedCount };

    } catch (error) {
      log.error('Failed to cleanup old backups', error as Error, 'BackupService');
      return { deletedCount: 0, error: (error as Error).message };
    }
  }

  /**
   * Enable automatic backups
   */
  enableAutoBackup(intervalHours = 24): void {
    this.disableAutoBackup(); // Clear existing interval
    
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    // Use self-scheduling pattern to prevent overlapping backups
    const scheduleNextBackup = () => {
      this.autoBackupInterval = setTimeout(() => {
        void (async () => {
        try {
          if (this.isBackupRunning) {
            log.warn('Skipping scheduled backup - another backup is already running', 'BackupService');
            scheduleNextBackup(); // Schedule next attempt
            return;
          }

          log.info('Running scheduled backup', 'BackupService');
          
          const result = await this.createBackup({
            includeSettings: true,
            includeUsageData: true,
            includeExports: false, // Don't backup exports automatically
            description: 'Automatic scheduled backup',
            compress: true
          });
          
          if (result.success) {
            log.info(`Scheduled backup completed: ${result.backupId}`, 'BackupService');
            // Clean up old backups to maintain retention policy
            await this.cleanupOldBackups(10);
          } else {
            log.error(`Scheduled backup failed: ${result.error}`, new Error(result.error), 'BackupService');
          }
        } catch (error) {
          log.error('Auto backup failed', error as Error, 'BackupService');
        } finally {
          // Schedule next backup after completion
          scheduleNextBackup();
        }
        })().catch((error) => {
          log.error('Auto backup failed in timeout', error as Error, 'BackupService');
          scheduleNextBackup(); // Continue scheduling even if backup fails
        });
      }, intervalMs);
    };
    
    // Start the scheduling
    scheduleNextBackup();
    
    log.info(`Auto backup enabled (every ${intervalHours} hours)`, 'BackupService');
  }

  /**
   * Disable automatic backups
   */
  disableAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearTimeout(this.autoBackupInterval);
      this.autoBackupInterval = null;
      log.info('Auto backup disabled', 'BackupService');
    }
  }

  // Private helper methods
  
  private async backupSettings(backupPath: string, compress: boolean): Promise<boolean> {
    try {
      const settingsPath = path.join(this.userDataPath, 'settings.json');
      const backupSettingsPath = path.join(backupPath, 'settings.json');
      
      if (compress) {
        await this.compressFile(settingsPath, `${backupSettingsPath}.gz`);
      } else {
        await fs.copyFile(settingsPath, backupSettingsPath);
      }
      
      return true;
    } catch (_error) {
      log.warn('Failed to backup settings', 'BackupService');
      return false;
    }
  }

  private async backupUsageData(backupPath: string, compress: boolean): Promise<boolean> {
    try {
      const usageDataPath = path.join(this.userDataPath, 'usage-data');
      const backupUsageDataPath = path.join(backupPath, 'usage-data');
      
      await this.copyDirectory(usageDataPath, backupUsageDataPath, compress);
      return true;
    } catch (_error) {
      log.warn('Failed to backup usage data', 'BackupService');
      return false;
    }
  }

  private async backupExports(backupPath: string, compress: boolean): Promise<boolean> {
    try {
      const exportsPath = path.join(this.userDataPath, 'exports');
      const backupExportsPath = path.join(backupPath, 'exports');
      
      await this.copyDirectory(exportsPath, backupExportsPath, compress);
      return true;
    } catch (_error) {
      log.warn('Failed to backup exports', 'BackupService');
      return false;
    }
  }

  private async restoreSettings(backupPath: string): Promise<void> {
    const settingsPath = path.join(this.userDataPath, 'settings.json');
    const backupSettingsPath = path.join(backupPath, 'settings.json');
    const compressedPath = `${backupSettingsPath}.gz`;
    
    if (await this.fileExists(compressedPath)) {
      await this.decompressFile(compressedPath, settingsPath);
    } else {
      await fs.copyFile(backupSettingsPath, settingsPath);
    }
  }

  private async restoreUsageData(backupPath: string): Promise<void> {
    const usageDataPath = path.join(this.userDataPath, 'usage-data');
    const backupUsageDataPath = path.join(backupPath, 'usage-data');
    
    // Remove existing usage data
    try {
      await fs.rm(usageDataPath, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
    
    await this.copyDirectory(backupUsageDataPath, usageDataPath, false);
  }

  private async restoreExports(backupPath: string): Promise<void> {
    const exportsPath = path.join(this.userDataPath, 'exports');
    const backupExportsPath = path.join(backupPath, 'exports');
    
    // Remove existing exports
    try {
      await fs.rm(exportsPath, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
    
    await this.copyDirectory(backupExportsPath, exportsPath, false);
  }

  private async copyDirectory(src: string, dest: string, compress: boolean): Promise<void> {
    try {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          await this.copyDirectory(srcPath, destPath, compress);
        } else {
          if (compress) {
            await this.compressFile(srcPath, `${destPath}.gz`);
          } else {
            await fs.copyFile(srcPath, destPath);
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private async compressFile(src: string, dest: string): Promise<void> {
    const readStream = createReadStream(src);
    const writeStream = createWriteStream(dest);
    const gzipStream = createGzip();
    
    await pipeline(readStream, gzipStream, writeStream);
  }

  private async decompressFile(src: string, dest: string): Promise<void> {
    const readStream = createReadStream(src);
    const writeStream = createWriteStream(dest);
    const gunzipStream = createGunzip();
    
    await pipeline(readStream, gunzipStream, writeStream);
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      let size = 0;
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else {
          size += await this.getFileSize(fullPath);
        }
      }
      
      return size;
    } catch {
      return 0;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const backupService = new BackupService();