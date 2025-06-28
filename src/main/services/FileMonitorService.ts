import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import * as os from 'os';
import { EventEmitter } from 'events';
import type { FileSystemEvent } from '@shared/types';
import { log } from '@shared/utils/logger';

export class FileMonitorService extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private isMonitoring = false;
  private readonly watchedPaths: Set<string> = new Set();
  private readonly lastFileStates: Map<string, { size: number; mtime: number }> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('file-change', (event: FileSystemEvent) => {
      log.debug(`File system event: ${JSON.stringify(event)}`, 'FileMonitorService');
    });
  }

  /**
   * Start monitoring Claude CLI output directories
   */
  async startMonitoring(paths: string | string[]): Promise<void> {
    try {
      if (this.isMonitoring) {
        log.warn('File monitoring is already active', 'FileMonitorService');
        return;
      }

      const pathsToWatch = Array.isArray(paths) ? paths : [paths];
      
      // Validate paths exist
      for (const watchPath of pathsToWatch) {
        try {
          await fs.promises.access(watchPath);
        } catch (_error) {
          log.warn(`Path does not exist or is not accessible: ${watchPath}`, 'FileMonitorService');
          // Create directory if it doesn't exist (for output directories)
          try {
            await fs.promises.mkdir(watchPath, { recursive: true });
            log.info(`Created directory: ${watchPath}`, 'FileMonitorService');
          } catch (createError) {
            log.service.error('FileMonitorService', `Failed to create directory ${watchPath}`, createError as Error);
            throw new Error(`Cannot monitor path: ${watchPath}`);
          }
        }
      }

      // Initialize file states
      await this.initializeFileStates(pathsToWatch);

      // Create watcher with optimized settings
      this.watcher = chokidar.watch(pathsToWatch, {
        ignored: [
          /(^|[/\\])\../, // ignore dotfiles
          /node_modules/,
          /\.git/,
          /\.DS_Store/,
          /Thumbs\.db/,
        ],
        persistent: true,
        ignoreInitial: false,
        followSymlinks: false,
        depth: 2, // Limit depth to avoid deep recursion
        awaitWriteFinish: {
          stabilityThreshold: 100, // Wait 100ms for file to stabilize
          pollInterval: 50,
        },
        usePolling: false, // Use native file system events when possible
      });

      // Set up event listeners
      this.watcher
        .on('add', (filePath) => void this.handleFileEvent('created', filePath))
        .on('change', (filePath) => void this.handleFileEvent('modified', filePath))
        .on('unlink', (filePath) => void this.handleFileEvent('deleted', filePath))
        .on('error', (error) => {
          log.service.error('FileMonitorService', 'File watcher error', error);
          this.emit('error', error);
        })
        .on('ready', () => {
          log.info('File monitoring initialized and ready', 'FileMonitorService');
          this.isMonitoring = true;
          pathsToWatch.forEach(p => this.watchedPaths.add(p));
          this.emit('monitoring-started', pathsToWatch);
        });

      log.info(`Started monitoring paths: ${pathsToWatch.join(', ')}`, 'FileMonitorService');
    } catch (error) {
      log.service.error('FileMonitorService', 'Failed to start file monitoring', error as Error);
      throw new Error(`Failed to start file monitoring: ${error}`);
    }
  }

  /**
   * Stop file monitoring
   */
  async stopMonitoring(): Promise<void> {
    try {
      if (!this.isMonitoring || !this.watcher) {
        log.warn('File monitoring is not active', 'FileMonitorService');
        return;
      }

      await this.watcher.close();
      this.watcher = null;
      this.isMonitoring = false;
      this.watchedPaths.clear();
      this.lastFileStates.clear();

      log.info('File monitoring stopped', 'FileMonitorService');
      this.emit('monitoring-stopped');
    } catch (error) {
      log.service.error('FileMonitorService', 'Failed to stop file monitoring', error as Error);
      throw new Error(`Failed to stop file monitoring: ${error}`);
    }
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): { 
    isMonitoring: boolean; 
    watchedPaths: string[];
    fileCount: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      watchedPaths: Array.from(this.watchedPaths),
      fileCount: this.lastFileStates.size,
    };
  }

  /**
   * Add additional path to monitoring
   */
  async addWatchPath(watchPath: string): Promise<void> {
    try {
      if (!this.isMonitoring || !this.watcher) {
        throw new Error('File monitoring is not active');
      }

      // Validate path exists
      try {
        await fs.promises.access(watchPath);
      } catch (_error) {
        // Try to create the directory
        await fs.promises.mkdir(watchPath, { recursive: true });
      }

      this.watcher.add(watchPath);
      this.watchedPaths.add(watchPath);
      
      // Initialize file states for new path
      await this.initializeFileStates([watchPath]);
      
      log.info(`Added watch path: ${watchPath}`, 'FileMonitorService');
      this.emit('path-added', watchPath);
    } catch (error) {
      log.service.error('FileMonitorService', 'Failed to add watch path', error as Error);
      throw new Error(`Failed to add watch path: ${error}`);
    }
  }

  /**
   * Remove path from monitoring
   */
  removeWatchPath(watchPath: string): void {
    try {
      if (!this.isMonitoring || !this.watcher) {
        throw new Error('File monitoring is not active');
      }

      this.watcher.unwatch(watchPath);
      this.watchedPaths.delete(watchPath);
      
      // Clean up file states for removed path
      for (const [filePath] of this.lastFileStates) {
        if (filePath.startsWith(watchPath)) {
          this.lastFileStates.delete(filePath);
        }
      }
      
      log.info(`Removed watch path: ${watchPath}`, 'FileMonitorService');
      this.emit('path-removed', watchPath);
    } catch (error) {
      log.service.error('FileMonitorService', 'Failed to remove watch path', error as Error);
      throw new Error(`Failed to remove watch path: ${error}`);
    }
  }

  /**
   * Handle file system events
   */
  private async handleFileEvent(eventType: 'created' | 'modified' | 'deleted', filePath: string): Promise<void> {
    try {
      // Filter out non-relevant files
      if (!this.isRelevantFile(filePath)) {
        return;
      }

      const event: FileSystemEvent = {
        event_type: eventType,
        file_path: filePath,
        timestamp: new Date().toISOString(),
      };

      // Update file state tracking
      if (eventType === 'deleted') {
        this.lastFileStates.delete(filePath);
      } else {
        try {
          const stats = await fs.promises.stat(filePath);
          this.lastFileStates.set(filePath, {
            size: stats.size,
            mtime: stats.mtime.getTime(),
          });
        } catch (_error) {
          log.warn(`Failed to get stats for ${filePath}`, 'FileMonitorService');
        }
      }

      // Emit events for different file types
      if (this.isJSONLFile(filePath)) {
        this.emit('jsonl-file-change', event);
      } else if (this.isLogFile(filePath)) {
        this.emit('log-file-change', event);
      } else if (this.isConfigFile(filePath)) {
        this.emit('config-file-change', event);
      }

      // Always emit general file change event
      this.emit('file-change', event);

      // Handle specific Claude CLI output files
      if (eventType === 'modified' && this.isJSONLFile(filePath)) {
        await this.handleJSONLFileChange(filePath);
      }

      log.debug(`File ${eventType}: ${filePath}`, 'FileMonitorService');
    } catch (error) {
      log.service.error('FileMonitorService', 'Error handling file event', error as Error);
      this.emit('error', error);
    }
  }

  /**
   * Handle changes to JSONL files (Claude CLI output)
   */
  private async handleJSONLFileChange(filePath: string): Promise<void> {
    try {
      // Read new content from the file
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      if (lines.length > 0) {
        // Emit event with new JSONL content
        this.emit('jsonl-content-change', {
          filePath,
          content,
          lineCount: lines.length,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      log.service.error('FileMonitorService', 'Failed to handle JSONL file change', error as Error);
    }
  }

  /**
   * Initialize file states for tracking changes
   */
  private async initializeFileStates(paths: string[]): Promise<void> {
    for (const watchPath of paths) {
      try {
        const files = await this.getFilesRecursively(watchPath);
        
        for (const filePath of files) {
          try {
            const stats = await fs.promises.stat(filePath);
            this.lastFileStates.set(filePath, {
              size: stats.size,
              mtime: stats.mtime.getTime(),
            });
          } catch (_error) {
            log.warn(`Failed to get initial stats for ${filePath}`, 'FileMonitorService');
          }
        }
      } catch (_error) {
        log.warn(`Failed to initialize file states for ${watchPath}`, 'FileMonitorService');
      }
    }
  }

  /**
   * Get all files recursively from a directory
   */
  private async getFilesRecursively(dir: string, maxDepth = 2, currentDepth = 0): Promise<string[]> {
    const files: string[] = [];
    
    if (currentDepth >= maxDepth) {
      return files;
    }

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !this.isIgnoredDirectory(entry.name)) {
          const subFiles = await this.getFilesRecursively(fullPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        } else if (entry.isFile() && this.isRelevantFile(fullPath)) {
          files.push(fullPath);
        }
      }
    } catch (_error) {
      log.warn(`Failed to read directory ${dir}`, 'FileMonitorService');
    }

    return files;
  }

  /**
   * Check if file is relevant for monitoring
   */
  private isRelevantFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();

    // Monitor JSONL files (Claude CLI output)
    if (ext === '.jsonl') return true;
    
    // Monitor log files
    if (ext === '.log' || ext === '.txt') return true;
    
    // Monitor config files
    if (ext === '.json' || ext === '.yaml' || ext === '.yml') return true;
    
    // Monitor files with specific patterns
    if (basename.includes('claude') || basename.includes('usage') || basename.includes('cost')) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is a JSONL file
   */
  private isJSONLFile(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.jsonl';
  }

  /**
   * Check if file is a log file
   */
  private isLogFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.log' || ext === '.txt';
  }

  /**
   * Check if file is a config file
   */
  private isConfigFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.json' || ext === '.yaml' || ext === '.yml';
  }

  /**
   * Check if directory should be ignored
   */
  private isIgnoredDirectory(dirName: string): boolean {
    const ignoredDirs = [
      'node_modules',
      '.git',
      '.vscode',
      '.idea',
      'dist',
      'build',
      'target',
      'tmp',
      'temp',
      '.cache',
    ];
    
    return ignoredDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Auto-start monitoring Claude CLI projects directory
   */
  async startClaudeCliMonitoring(): Promise<void> {
    try {
      const claudeProjectsPath = path.join(os.homedir(), '.claude', 'projects');
      
      // Check if Claude CLI directory exists
      try {
        await fs.promises.access(claudeProjectsPath);
        log.info(`Starting Claude CLI monitoring at: ${claudeProjectsPath}`, 'FileMonitorService');
        await this.startMonitoring(claudeProjectsPath);
        
        // Set up event handler for JSONL changes
        this.on('jsonl-content-change', (data) => {
          log.debug(`Claude CLI file updated: ${path.basename(data.filePath)} (${data.lineCount} lines)`, 'FileMonitorService');
          // This will be picked up by the main process to refresh usage data
        });
        
      } catch (_error) {
        log.warn('Claude CLI projects directory not found, monitoring disabled', 'FileMonitorService');
      }
    } catch (error) {
      log.service.error('FileMonitorService', 'Failed to start Claude CLI monitoring', error as Error);
    }
  }

  /**
   * Get file monitoring statistics
   */
  getStats(): {
    isMonitoring: boolean;
    watchedPaths: number;
    trackedFiles: number;
    lastActivity: string | null;
  } {
    return {
      isMonitoring: this.isMonitoring,
      watchedPaths: this.watchedPaths.size,
      trackedFiles: this.lastFileStates.size,
      lastActivity: this.lastFileStates.size > 0 ? new Date().toISOString() : null,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopMonitoring();
      this.removeAllListeners();
      log.info('FileMonitorService cleaned up', 'FileMonitorService');
    } catch (error) {
      log.service.error('FileMonitorService', 'Failed to cleanup FileMonitorService', error as Error);
    }
  }
}

// Export default instance
export const fileMonitorService = new FileMonitorService();