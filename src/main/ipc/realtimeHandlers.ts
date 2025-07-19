import { ipcMain } from 'electron';
import { RealtimeMonitorService, type RealtimeMonitorConfig } from '../services/RealtimeMonitorService';
import { fileMonitorService } from '../services/FileMonitorService';
import { usageService } from '../services/UsageService';
import { log } from '../../shared/utils/logger';

let realtimeMonitorService: RealtimeMonitorService | null = null;

export function registerRealtimeHandlers(): void {
  // Start realtime monitoring
  ipcMain.handle('realtime:start', async () => {
    try {
      realtimeMonitorService ??= new RealtimeMonitorService(
        fileMonitorService,
        usageService
      );
      
      await realtimeMonitorService.start();
      
      // Set up event forwarding to renderer with error handling
      realtimeMonitorService.on('stats-update', (stats) => {
        try {
          const mainWindow = global.mainWindow;
          if (mainWindow?.webContents && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send('realtime:stats-update', stats);
          }
        } catch (error) {
          log.service.error('RealtimeHandlers', 'Failed to send stats update to renderer', error as Error);
        }
      });
      
      log.info('Realtime monitoring started via IPC', 'RealtimeHandlers');
    } catch (error) {
      log.service.error('RealtimeHandlers', 'Failed to start realtime monitoring', error as Error);
      throw error;
    }
  });

  // Stop realtime monitoring
  ipcMain.handle('realtime:stop', async () => {
    try {
      if (realtimeMonitorService) {
        realtimeMonitorService.stop();
        // Give time for cleanup
        await new Promise<void>(resolve => {
          setTimeout(() => {
            resolve();
          }, 100);
        });
      }
      log.info('Realtime monitoring stopped via IPC', 'RealtimeHandlers');
    } catch (error) {
      log.service.error('RealtimeHandlers', 'Failed to stop realtime monitoring', error as Error);
      throw error;
    }
  });

  // Get current stats
  ipcMain.handle('realtime:get-stats', () => {
    try {
      if (!realtimeMonitorService) {
        throw new Error('Realtime monitoring service not initialized');
      }
      
      const stats = realtimeMonitorService.getStats();
      
      // Convert Map to serializable format
      const serializedStats = {
        ...stats,
        burnRates: Object.fromEntries(stats.burnRates),
        activeBlocks: stats.activeBlocks.map(block => ({
          ...block,
          startTime: block.startTime.toISOString(),
          endTime: block.endTime.toISOString(),
          entries: block.entries.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString(),
          })),
        })),
        lastUpdate: stats.lastUpdate.toISOString(),
      };
      
      return serializedStats;
    } catch (error) {
      log.service.error('RealtimeHandlers', 'Failed to get realtime stats', error as Error);
      throw error;
    }
  });

  // Get project-specific stats
  ipcMain.handle('realtime:get-project-stats', (_event, project: string) => {
    try {
      if (!realtimeMonitorService) {
        throw new Error('Realtime monitoring service not initialized');
      }
      
      const stats = realtimeMonitorService.getProjectStats(project);
      
      // Serialize for IPC
      return {
        ...stats,
        blocks: stats.blocks.map(block => ({
          ...block,
          startTime: block.startTime.toISOString(),
          endTime: block.endTime.toISOString(),
          entries: block.entries.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString(),
          })),
        })),
        activeBurnRate: stats.activeBurnRate,
      };
    } catch (error) {
      log.service.error('RealtimeHandlers', 'Failed to get project stats', error as Error);
      throw error;
    }
  });

  // Update configuration
  ipcMain.handle('realtime:update-config', (_event, config: Partial<RealtimeMonitorConfig>) => {
    try {
      if (!realtimeMonitorService) {
        throw new Error('Realtime monitoring service not initialized');
      }
      
      realtimeMonitorService.updateConfig(config);
      log.info('Realtime monitoring config updated', 'RealtimeHandlers');
    } catch (error) {
      log.service.error('RealtimeHandlers', 'Failed to update config', error as Error);
      throw error;
    }
  });
}

// Cleanup function with proper error handling
export async function cleanupRealtimeHandlers(): Promise<void> {
  try {
    const service = realtimeMonitorService;
    if (service) {
      realtimeMonitorService = null;
      await service.cleanup();
    }
    
    // Remove all IPC handlers
    ipcMain.removeHandler('realtime:start');
    ipcMain.removeHandler('realtime:stop');
    ipcMain.removeHandler('realtime:get-stats');
    ipcMain.removeHandler('realtime:get-project-stats');
    ipcMain.removeHandler('realtime:update-config');
    
    log.info('Realtime handlers cleanup completed', 'RealtimeHandlers');
  } catch (error) {
    log.service.error('RealtimeHandlers', 'Error during cleanup', error as Error);
  }
}