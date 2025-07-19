import { EventEmitter } from 'events';
import { SessionBlockService } from './sessionBlockService';
import type { FileMonitorService } from './FileMonitorService';
import type { UsageService } from './UsageService';
import type { ParsedUsageEntry } from '../../shared/types';
import { type SessionBlock, type BurnRate, calculateBurnRate } from '../../shared/burnRate';
import { log } from '../../shared/utils/logger';

export interface RealtimeMonitorConfig {
  refreshInterval: number; // milliseconds (1000-60000)
  sessionGapThreshold: number; // milliseconds
  sessionBlockDuration: number; // milliseconds
}

export interface RealtimeStats {
  activeBlocks: SessionBlock[];
  burnRates: Map<string, BurnRate>;
  totalActiveTokensPerMinute: number;
  totalActiveCostPerHour: number;
  lastUpdate: Date;
}

export class RealtimeMonitorService extends EventEmitter {
  private sessionBlockService: SessionBlockService;
  private readonly fileMonitorService: FileMonitorService;
  private readonly usageService: UsageService;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly config: RealtimeMonitorConfig;
  private isRunning = false;
  private readonly lastProcessedEntries: Set<string> = new Set();
  private readonly frameRateLimit = 16; // ~60fps
  private readonly maxProcessedEntries = 10000; // Prevent memory leaks

  constructor(
    fileMonitorService: FileMonitorService,
    usageService: UsageService,
    config: Partial<RealtimeMonitorConfig> = {}
  ) {
    super();
    
    this.fileMonitorService = fileMonitorService;
    this.usageService = usageService;
    
    this.config = {
      refreshInterval: Math.max(1000, Math.min(60000, config.refreshInterval ?? 1000)),
      sessionGapThreshold: config.sessionGapThreshold ?? 5 * 60 * 60 * 1000,
      sessionBlockDuration: config.sessionBlockDuration ?? 5 * 60 * 60 * 1000,
    };
    
    this.sessionBlockService = new SessionBlockService(
      this.config.sessionGapThreshold,
      this.config.sessionBlockDuration
    );

    this.setupEventHandlers();
  }

  private readonly fileChangeHandler = () => {
    void this.handleDataUpdate();
  };

  private setupEventHandlers(): void {
    // Listen for file changes with bound handler for proper cleanup
    this.fileMonitorService.on('jsonl-content-change', this.fileChangeHandler);
  }

  private removeEventHandlers(): void {
    this.fileMonitorService.removeListener('jsonl-content-change', this.fileChangeHandler);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      log.warn('Realtime monitoring is already running', 'RealtimeMonitorService');
      return;
    }

    try {
      this.isRunning = true;
      
      // Initial data load
      await this.loadAllData();
      
      // Start refresh timer
      this.startRefreshTimer();
      
      log.info('Realtime monitoring started', 'RealtimeMonitorService');
      this.emit('monitoring-started');
    } catch (error) {
      this.isRunning = false;
      log.service.error('RealtimeMonitorService', 'Failed to start realtime monitoring', error as Error);
      throw error;
    }
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Clear timer safely
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // Remove event handlers to prevent memory leaks
    this.removeEventHandlers();
    
    log.info('Realtime monitoring stopped', 'RealtimeMonitorService');
    this.emit('monitoring-stopped');
  }

  private startRefreshTimer(): void {
    this.refreshTimer = setInterval(() => {
      this.refreshStats();
    }, this.config.refreshInterval);
  }

  private async loadAllData(): Promise<void> {
    try {
      // Get all usage data
      const allEntries = await this.usageService.getAllUsageData();
      
      // Clear existing data
      this.sessionBlockService.clear();
      this.lastProcessedEntries.clear();
      
      // Process all entries
      for (const entry of allEntries) {
        this.processEntry(entry);
      }
      
      // Emit initial stats
      this.emitStats();
    } catch (error) {
      log.service.error('RealtimeMonitorService', 'Failed to load initial data', error as Error);
    }
  }

  private processEntry(entry: ParsedUsageEntry): void {
    const entryId = `${entry.requestId}-${entry.timestamp.toISOString()}`;
    
    // Skip if already processed
    if (this.lastProcessedEntries.has(entryId)) {
      return;
    }
    
    this.lastProcessedEntries.add(entryId);
    
    // Prevent memory leaks by limiting Set size
    if (this.lastProcessedEntries.size > this.maxProcessedEntries) {
      const entries = Array.from(this.lastProcessedEntries);
      this.lastProcessedEntries.clear();
      // Keep only the most recent half
      entries.slice(entries.length / 2).forEach(id => this.lastProcessedEntries.add(id));
    }
    
    this.sessionBlockService.processEntry(entry);
  }

  private async handleDataUpdate(): Promise<void> {
    try {
      // Get latest entries
      const allEntries = await this.usageService.getAllUsageData();
      
      // Process only new entries
      let hasNewEntries = false;
      for (const entry of allEntries) {
        const entryId = `${entry.requestId}-${entry.timestamp.toISOString()}`;
        if (!this.lastProcessedEntries.has(entryId)) {
          this.processEntry(entry);
          hasNewEntries = true;
        }
      }
      
      if (hasNewEntries) {
        this.emitStats();
      }
    } catch (error) {
      log.service.error('RealtimeMonitorService', 'Failed to handle data update', error as Error);
    }
  }

  private refreshStats(): void {
    // Update active block status
    this.sessionBlockService.updateActiveBlocks();
    
    // Emit updated stats
    this.emitStats();
  }

  private emitStats(): void {
    const stats = this.getStats();
    
    // Rate limit emissions
    const now = Date.now();
    if (this.lastEmissionTime && now - this.lastEmissionTime < this.frameRateLimit) {
      return;
    }
    
    this.lastEmissionTime = now;
    this.emit('stats-update', stats);
  }
  
  private lastEmissionTime?: number;

  public getStats(): RealtimeStats {
    const activeBlocks = this.sessionBlockService.getActiveBlocks();
    const burnRates = new Map<string, BurnRate>();
    
    let totalTokensPerMinute = 0;
    let totalCostPerHour = 0;
    
    for (const block of activeBlocks) {
      const burnRate = calculateBurnRate(block);
      if (burnRate !== null) {
        burnRates.set(block.id, burnRate);
        totalTokensPerMinute += burnRate.tokensPerMinute;
        totalCostPerHour += burnRate.costPerHour;
      }
    }
    
    return {
      activeBlocks,
      burnRates,
      totalActiveTokensPerMinute: totalTokensPerMinute,
      totalActiveCostPerHour: totalCostPerHour,
      lastUpdate: new Date(),
    };
  }

  public getProjectStats(project: string): {
    blocks: SessionBlock[];
    activeBurnRate: BurnRate | null;
    totalCost: number;
    totalTokens: number;
  } {
    const blocks = this.sessionBlockService.getBlocksByProject(project);
    const activeBlock = blocks.find(b => b.isActive);
    const activeBurnRate = activeBlock ? calculateBurnRate(activeBlock) : null;
    
    let totalCost = 0;
    let totalTokens = 0;
    
    for (const block of blocks) {
      totalCost += block.costUSD;
      totalTokens += 
        block.tokenCounts.inputTokens + 
        block.tokenCounts.outputTokens +
        block.tokenCounts.cacheCreationTokens +
        block.tokenCounts.cacheReadTokens;
    }
    
    return {
      blocks,
      activeBurnRate,
      totalCost,
      totalTokens,
    };
  }

  public updateConfig(config: Partial<RealtimeMonitorConfig>): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }
    
    // Update config
    if (config.refreshInterval !== undefined) {
      this.config.refreshInterval = Math.max(1000, Math.min(60000, config.refreshInterval));
    }
    
    if (config.sessionGapThreshold !== undefined) {
      this.config.sessionGapThreshold = config.sessionGapThreshold;
    }
    
    if (config.sessionBlockDuration !== undefined) {
      this.config.sessionBlockDuration = config.sessionBlockDuration;
    }
    
    // Recreate session block service with new config
    this.sessionBlockService = new SessionBlockService(
      this.config.sessionGapThreshold,
      this.config.sessionBlockDuration
    );
    
    if (wasRunning) {
      void this.start();
    }
  }

  public getConfig(): RealtimeMonitorConfig {
    return { ...this.config };
  }

  public cleanup(): void {
    try {
      // Stop monitoring first
      this.stop();
      
      // Remove all event listeners safely
      this.removeAllListeners();
      
      // Clear data structures
      this.sessionBlockService.clear()
      
      this.lastProcessedEntries.clear();
      
      log.info('RealtimeMonitorService cleanup completed', 'RealtimeMonitorService');
    } catch (error) {
      log.service.error('RealtimeMonitorService', 'Error during cleanup', error as Error);
    }
  }
}