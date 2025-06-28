import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
// Import MODEL_PRICING if needed in the future
// import { MODEL_PRICING } from '@shared/constants';
import { 
  calculateCost, 
  calculateModelEfficiency,
  calculateUsageTrends,
  calculatePredictiveAnalytics,
  calculateProjectAnalytics
} from './CostCalculatorService';
import { log } from '@shared/utils/logger';
import type { 
  UsageEntry, 
  SessionStats, 
  DateRangeStats, 
  BusinessIntelligence,
  AdvancedUsageStats,
  ModelEfficiency,
  UsageTrend,
  UsageAnomaly,
  PredictiveAnalytics,
  ProjectAnalytics,
  ProjectSession,
  ProjectComparison
} from '@shared/types';

// Real Claude CLI JSONL format
interface ClaudeJSONLEntry {
  uuid: string;
  sessionId: string;
  timestamp: string;
  cwd: string;
  type: 'user' | 'assistant';
  message: {
    role: 'user' | 'assistant';
    model?: string; // Only present for assistant messages
    usage?: {
      input_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens: number;
      service_tier?: string;
    };
    content: unknown; // Content varies by message type
  };
  requestId?: string;
  version: string;
}

// Legacy format for backwards compatibility
interface LegacyJSONLEntry {
  timestamp?: string;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  conversation_id?: string;
  session_id?: string;
  project_path?: string;
}

export class UsageService {
  private dataDir: string;
  private usageFile: string;
  private readonly cache: Map<string, UsageEntry> = new Map();
  private readonly sessionCache: Map<string, SessionStats> = new Map();

  constructor(dataDir: string = path.join(process.cwd(), 'data')) {
    this.dataDir = dataDir;
    this.usageFile = path.join(dataDir, 'usage.jsonl');
    void this.ensureDataDirectory();
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      log.service.error('UsageService', 'Failed to create data directory', error as Error);
      throw new Error(`Failed to create data directory: ${error}`);
    }
  }

  /**
   * Parse a single JSONL line and convert to UsageEntry (supports both Claude CLI and legacy formats)
   * Public method for testing and external use
   */
  public parseJSONLLine(line: string): UsageEntry | null {
    try {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        return null;
      }
      
      // Skip lines that are just strings (malformed entries)
      if (!trimmedLine.startsWith('{')) {
        log.parsing.error(`${trimmedLine.substring(0, 50)  }...`, new Error('Skipping malformed JSONL line (not JSON object)'));
        return null;
      }
      
      const data = JSON.parse(trimmedLine);
      
      // Skip if data is not an object
      if (data == null || typeof data !== 'object') {
        log.parsing.error('JSONL entry', new Error(`Skipping invalid JSONL entry (not an object): ${JSON.stringify(data)}`));
        return null;
      }
      
      // Check if it's Claude CLI format
      if (typeof data === 'object' && data != null && 'uuid' in data && 'sessionId' in data && 'message' in data) {
        return this.parseClaudeJSONLEntry(data as ClaudeJSONLEntry);
      }
      
      // Skip Claude CLI summary entries and other non-usage entries
      if (typeof data === 'object' && data != null && 'type' in data && typeof data.type === 'string' && ['summary', 'system', 'metadata'].includes(data.type)) {
        return null; // These are not usage entries, skip silently
      }
      
      // Fall back to legacy format
      return this.parseLegacyJSONLEntry(data as LegacyJSONLEntry);
    } catch (error) {
      log.parsing.error(`${line.substring(0, 100)  }...`, error as Error);
      return null;
    }
  }

  /**
   * Parse Claude CLI format JSONL entry
   */
  private parseClaudeJSONLEntry(data: ClaudeJSONLEntry): UsageEntry | null {
    // Validate required Claude CLI fields
    if (data.uuid == null || data.uuid === '' || data.sessionId == null || data.sessionId === '' || data.message == null || data.timestamp == null || data.timestamp === '') {
      log.warn('Invalid Claude CLI entry - missing required fields', 'UsageService');
      return null;
    }
    
    // Only process assistant messages with usage data
    if (data.type !== 'assistant' || data.message.usage == null || data.message.model == null || data.message.model === '') {
      return null;
    }

    const usage = data.message.usage;
    const model = data.message.model;

    const inputTokens = usage.input_tokens || 0;
    const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
    const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
    const outputTokens = usage.output_tokens || 0;
    
    // Total input tokens include cache tokens
    const totalInputTokens = inputTokens + cacheCreationTokens + cacheReadTokens;
    const totalTokens = totalInputTokens + outputTokens;

    // Calculate cost using centralized pricing model with separate cache pricing
    const costUsd = calculateCost(model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens);

    const entry: UsageEntry = {
      id: data.uuid, // Use Claude's UUID instead of generating new one
      timestamp: data.timestamp,
      model,
      input_tokens: inputTokens, // Pure input tokens only
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      session_id: data.sessionId,
      project_path: data.cwd,
      conversation_id: data.requestId,
      cache_creation_tokens: cacheCreationTokens,
      cache_read_tokens: cacheReadTokens,
    };

    return entry;
  }

  /**
   * Parse legacy format JSONL entry (backwards compatibility)
   */
  private parseLegacyJSONLEntry(data: LegacyJSONLEntry): UsageEntry | null {
    if (data.model == null || data.model === '' || !data.usage || data.timestamp == null || data.timestamp === '') {
      // Only log detailed warnings for entries that might actually be usage data
      const keys = Object.keys(data ?? {});
      const isLikelyUsageEntry = keys.some(key => ['model', 'usage', 'tokens', 'cost'].includes(key));
      
      if (isLikelyUsageEntry) {
        log.warn('Invalid legacy JSONL entry - missing required fields (model, usage, timestamp)', 'UsageService');
      }
      return null;
    }

    const inputTokens = data.usage.input_tokens ?? 0;
    const outputTokens = data.usage.output_tokens ?? 0;
    const totalTokens = data.usage.total_tokens ?? (inputTokens + outputTokens);

    const costUsd = calculateCost(data.model, inputTokens, outputTokens);

    const entry: UsageEntry = {
      id: uuidv4(),
      timestamp: data.timestamp,
      model: data.model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      session_id: data.session_id,
      project_path: data.project_path,
      conversation_id: data.conversation_id,
    };

    return entry;
  }

  /**
   * Parse JSONL file and extract usage entries
   */
  async parseJSONLFile(filePath: string): Promise<UsageEntry[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const entries: UsageEntry[] = [];
      
      for (const line of lines) {
        const entry = this.parseJSONLLine(line);
        if (entry) {
          entries.push(entry);
          this.cache.set(entry.id, entry);
        }
      }

      log.info(`Parsed ${entries.length} usage entries from ${filePath}`, 'UsageService');
      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        log.info(`File not found: ${filePath}`, 'UsageService');
        return [];
      }
      log.service.error('UsageService', 'Failed to parse JSONL file', error as Error);
      throw new Error(`Failed to parse JSONL file: ${error}`);
    }
  }

  /**
   * Add new usage entry and persist to storage
   */
  async addUsageEntry(entry: UsageEntry): Promise<void> {
    try {
      // Add to cache
      this.cache.set(entry.id, entry);

      // Append to JSONL file
      const jsonlLine = `${JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        model: entry.model,
        usage: {
          input_tokens: entry.input_tokens,
          output_tokens: entry.output_tokens,
          total_tokens: entry.total_tokens,
        },
        cost_usd: entry.cost_usd,
        session_id: entry.session_id,
        project_path: entry.project_path,
        conversation_id: entry.conversation_id,
      })  }\n`;

      await fs.appendFile(this.usageFile, jsonlLine, 'utf-8');
      log.debug(`Added usage entry: ${entry.id}`, 'UsageService');
    } catch (error) {
      log.service.error('UsageService', 'Failed to add usage entry', error as Error);
      throw new Error(`Failed to add usage entry: ${error}`);
    }
  }

  /**
   * Get all usage entries
   */
  async getAllUsageEntries(): Promise<UsageEntry[]> {
    try {
      if (this.cache.size === 0) {
        // Load from file if cache is empty
        await this.loadUsageData();
      }
      return Array.from(this.cache.values()).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      log.service.error('UsageService', 'Failed to get usage entries', error as Error);
      throw new Error(`Failed to get usage entries: ${error}`);
    }
  }

  /**
   * Get usage entries by date range
   */
  async getUsageByDateRange(startDate: string, endDate: string): Promise<DateRangeStats> {
    try {
      const allEntries = await this.getAllUsageEntries();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filteredEntries = allEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= start && entryDate <= end;
      });

      const totalCost = filteredEntries.reduce((sum, entry) => sum + entry.cost_usd, 0);
      const totalTokens = filteredEntries.reduce((sum, entry) => sum + entry.total_tokens, 0);

      // Calculate session stats for this date range
      const sessionMap = new Map<string, SessionStats>();
      
      filteredEntries.forEach(entry => {
        if (entry.session_id == null || entry.session_id === '') return;

        if (!sessionMap.has(entry.session_id)) {
          sessionMap.set(entry.session_id, {
            session_id: entry.session_id,
            start_time: entry.timestamp,
            end_time: entry.timestamp,
            total_cost: 0,
            total_tokens: 0,
            message_count: 0,
            model: entry.model,
          });
        }

        const session = sessionMap.get(entry.session_id);
        if (!session) return;
        session.total_cost += entry.cost_usd;
        session.total_tokens += entry.total_tokens;
        session.message_count += 1;
        
        // Update time range
        if (new Date(entry.timestamp) < new Date(session.start_time)) {
          session.start_time = entry.timestamp;
        }
        if (new Date(entry.timestamp) > new Date(session.end_time)) {
          session.end_time = entry.timestamp;
        }
      });

      return {
        start_date: startDate,
        end_date: endDate,
        total_cost: totalCost,
        total_tokens: totalTokens,
        entries: filteredEntries,
        sessions: Array.from(sessionMap.values()),
      };
    } catch (error) {
      log.service.error('UsageService', 'Failed to get usage by date range', error as Error);
      throw new Error(`Failed to get usage by date range: ${error}`);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<SessionStats | null> {
    try {
      if (this.sessionCache.has(sessionId)) {
        const cachedSession = this.sessionCache.get(sessionId);
        if (cachedSession) {
          return cachedSession;
        }
      }

      const allEntries = await this.getAllUsageEntries();
      const sessionEntries = allEntries.filter(entry => entry.session_id === sessionId);
      
      if (sessionEntries.length === 0) {
        return null;
      }

      // Sort by timestamp to get start/end times
      sessionEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const stats: SessionStats = {
        session_id: sessionId,
        start_time: sessionEntries[0].timestamp,
        end_time: sessionEntries[sessionEntries.length - 1].timestamp,
        total_cost: sessionEntries.reduce((sum, entry) => sum + entry.cost_usd, 0),
        total_tokens: sessionEntries.reduce((sum, entry) => sum + entry.total_tokens, 0),
        message_count: sessionEntries.length,
        model: sessionEntries[0].model, // Use first model as primary
      };

      this.sessionCache.set(sessionId, stats);
      return stats;
    } catch (error) {
      log.service.error('UsageService', 'Failed to get session stats', error as Error);
      throw new Error(`Failed to get session stats: ${error}`);
    }
  }

  /**
   * Load usage data from persistent storage
   */
  private async loadUsageData(): Promise<void> {
    try {
      const entries = await this.parseJSONLFile(this.usageFile);
      this.cache.clear();
      entries.forEach(entry => this.cache.set(entry.id, entry));
      log.info(`Loaded ${entries.length} usage entries from storage`, 'UsageService');
    } catch (error) {
      log.service.error('UsageService', 'Failed to load usage data', error as Error);
      // Don't throw - allow service to continue with empty cache
    }
  }


  /**
   * Process and store usage data from Claude CLI output
   */
  async processClaudeOutput(outputData: string): Promise<UsageEntry[]> {
    try {
      const lines = outputData.split('\n').filter(line => line.trim());
      const entries: UsageEntry[] = [];

      for (const line of lines) {
        const entry = this.parseJSONLLine(line);
        if (entry) {
          await this.addUsageEntry(entry);
          entries.push(entry);
        }
      }

      return entries;
    } catch (error) {
      log.service.error('UsageService', 'Failed to process Claude output', error as Error);
      throw new Error(`Failed to process Claude output: ${error}`);
    }
  }

  /**
   * Clean up old data based on retention policy
   */
  async cleanupOldData(retentionDays: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const allEntries = await this.getAllUsageEntries();
      const recentEntries = allEntries.filter(entry => 
        new Date(entry.timestamp) >= cutoffDate
      );

      if (recentEntries.length < allEntries.length) {
        // Clear cache and file, then rewrite with recent entries
        this.cache.clear();
        
        // Backup old file
        const backupFile = `${this.usageFile}.backup.${Date.now()}`;
        await fs.copyFile(this.usageFile, backupFile);
        
        // Rewrite file with recent entries
        const jsonlContent = `${recentEntries.map(entry => JSON.stringify({
          id: entry.id,
          timestamp: entry.timestamp,
          model: entry.model,
          usage: {
            input_tokens: entry.input_tokens,
            output_tokens: entry.output_tokens,
            total_tokens: entry.total_tokens,
          },
          cost_usd: entry.cost_usd,
          session_id: entry.session_id,
          project_path: entry.project_path,
          conversation_id: entry.conversation_id,
        })).join('\n')  }\n`;

        await fs.writeFile(this.usageFile, jsonlContent, 'utf-8');
        
        // Reload cache
        recentEntries.forEach(entry => this.cache.set(entry.id, entry));
        
        log.info(`Cleaned up ${allEntries.length - recentEntries.length} old entries, kept ${recentEntries.length}`, 'UsageService');
      }
    } catch (error) {
      log.service.error('UsageService', 'Failed to cleanup old data', error as Error);
      throw new Error(`Failed to cleanup old data: ${error}`);
    }
  }

  /**
   * Get usage statistics summary
   */
  async getUsageStats(): Promise<{
    totalEntries: number;
    totalCost: number;
    totalTokens: number;
    uniqueModels: string[];
    uniqueSessions: number;
    dateRange: { earliest: string | null; latest: string | null };
  }> {
    try {
      const allEntries = await this.getAllUsageEntries();
      
      if (allEntries.length === 0) {
        return {
          totalEntries: 0,
          totalCost: 0,
          totalTokens: 0,
          uniqueModels: [],
          uniqueSessions: 0,
          dateRange: { earliest: null, latest: null },
        };
      }

      const totalCost = allEntries.reduce((sum, entry) => sum + entry.cost_usd, 0);
      const totalTokens = allEntries.reduce((sum, entry) => sum + entry.total_tokens, 0);
      const uniqueModels = [...new Set(allEntries.map(entry => entry.model))];
      const uniqueSessions = new Set(allEntries.map(entry => entry.session_id).filter(Boolean)).size;
      
      // Sort entries by timestamp to get date range
      const sortedEntries = [...allEntries].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        totalEntries: allEntries.length,
        totalCost,
        totalTokens,
        uniqueModels,
        uniqueSessions,
        dateRange: {
          earliest: sortedEntries[0].timestamp,
          latest: sortedEntries[sortedEntries.length - 1].timestamp,
        },
      };
    } catch (error) {
      log.service.error('UsageService', 'Failed to get usage stats', error as Error);
      throw new Error(`Failed to get usage stats: ${error}`);
    }
  }

  /**
   * Auto-detect Claude CLI projects directory
   */
  private getClaudeProjectsPath(): string {
    return path.join(os.homedir(), '.claude', 'projects');
  }

  /**
   * Discover all Claude CLI JSONL files
   */
  async discoverClaudeFiles(): Promise<string[]> {
    try {
      const projectsPath = this.getClaudeProjectsPath();
      
      // Check if Claude CLI directory exists
      try {
        await fs.access(projectsPath);
      } catch {
        log.info(`Claude CLI projects directory not found: ${projectsPath}`, 'UsageService');
        return [];
      }

      const files: string[] = [];
      
      // Recursively find all .jsonl files
      const findJsonlFiles = async (dir: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              await findJsonlFiles(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
              files.push(fullPath);
            }
          }
        } catch (_error) {
          log.warn(`Failed to read directory ${dir}`, 'UsageService');
        }
      };

      await findJsonlFiles(projectsPath);
      
      log.info(`Discovered ${files.length} Claude CLI JSONL files`, 'UsageService');
      return files;
    } catch (error) {
      log.service.error('UsageService', 'Failed to discover Claude files', error as Error);
      return [];
    }
  }

  /**
   * Load all usage data from Claude CLI files
   */
  async loadFromClaudeCLI(): Promise<UsageEntry[]> {
    try {
      const jsonlFiles = await this.discoverClaudeFiles();
      const allEntries: UsageEntry[] = [];
      
      log.info(`Loading usage data from ${jsonlFiles.length} Claude CLI files...`, 'UsageService');
      
      for (const filePath of jsonlFiles) {
        try {
          const entries = await this.parseJSONLFile(filePath);
          allEntries.push(...entries);
          log.debug(`Loaded ${entries.length} entries from ${path.basename(filePath)}`, 'UsageService');
        } catch (_error) {
          log.warn(`Failed to load ${filePath}`, 'UsageService');
        }
      }

      // Deduplicate entries by UUID (Claude CLI provides unique UUIDs)
      const uniqueEntries = new Map<string, UsageEntry>();
      for (const entry of allEntries) {
        uniqueEntries.set(entry.id, entry);
      }

      const finalEntries = Array.from(uniqueEntries.values());
      
      // Update cache
      this.cache.clear();
      finalEntries.forEach(entry => this.cache.set(entry.id, entry));
      
      log.info(`Successfully loaded ${finalEntries.length} unique usage entries from Claude CLI`, 'UsageService');
      return finalEntries;
    } catch (error) {
      log.service.error('UsageService', 'Failed to load from Claude CLI', error as Error);
      throw new Error(`Failed to load from Claude CLI: ${error}`);
    }
  }

  /**
   * Initialize service and load Claude CLI data
   */
  async initialize(userDataPath?: string): Promise<void> {
    // Update data directory if userDataPath is provided
    if (userDataPath) {
      this.dataDir = userDataPath;
      this.usageFile = path.join(userDataPath, 'usage.jsonl');
    }
    try {
      // First try to load from Claude CLI
      log.service.start('UsageService');
      
      // Build session-to-file mapping for better project extraction
      await this.buildSessionFileMapping();
      
      const claudeEntries = await this.loadFromClaudeCLI();
      
      if (claudeEntries.length > 0) {
        log.info(`Found ${claudeEntries.length} entries from Claude CLI`, 'UsageService');
      } else {
        log.info('No Claude CLI data found, using local storage', 'UsageService');
        await this.loadUsageData();
      }
      
      log.info('UsageService initialized successfully', 'UsageService');
    } catch (error) {
      log.service.error('UsageService', 'Failed to initialize UsageService', error as Error);
      // Fall back to local storage
      await this.loadUsageData();
    }
  }

  /**
   * Advanced Business Intelligence Analytics
   */

  /**
   * Calculate model efficiency metrics
   */
  async getModelEfficiency(): Promise<ModelEfficiency[]> {
    try {
      const allEntries = await this.getAllUsageEntries();
      
      if (allEntries.length === 0) {
        return [];
      }

      // Use centralized calculator for consistent model efficiency calculation
      const efficiency = calculateModelEfficiency(allEntries);

      log.debug(`Calculated efficiency for ${efficiency.length} models`, 'UsageService');
      return efficiency;
    } catch (error) {
      log.service.error('UsageService', 'Failed to calculate model efficiency', error as Error);
      throw new Error(`Failed to calculate model efficiency: ${error}`);
    }
  }

  /**
   * Generate usage trends by time period
   * @deprecated Use calculateUsageTrends() from CostCalculatorService module for consistency
   */
  async generateUsageTrends(granularity: 'daily' | 'weekly' | 'monthly'): Promise<UsageTrend[]> {
    try {
      const allEntries = await this.getAllUsageEntries();
      const trends = calculateUsageTrends(allEntries, granularity);
      
      log.debug(`Generated ${trends.length} ${granularity} trend points`, 'UsageService');
      return trends;
    } catch (error) {
      log.service.error('UsageService', 'Failed to generate usage trends', error as Error);
      throw new Error(`Failed to generate usage trends: ${error}`);
    }
  }

  /**
   * Detect usage anomalies
   */
  async detectAnomalies(): Promise<UsageAnomaly[]> {
    try {
      const allEntries = await this.getAllUsageEntries();
      
      if (allEntries.length < 10) {
        return []; // Need sufficient data for anomaly detection
      }

      const anomalies: UsageAnomaly[] = [];

      // Calculate baseline statistics
      const costs = allEntries.map(e => e.cost_usd);
      const tokens = allEntries.map(e => e.total_tokens);
      
      const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
      const avgTokens = tokens.reduce((a, b) => a + b, 0) / tokens.length;
      
      // Standard deviation calculation
      const costStdDev = Math.sqrt(costs.reduce((acc, val) => acc + Math.pow(val - avgCost, 2), 0) / costs.length);
      const tokenStdDev = Math.sqrt(tokens.reduce((acc, val) => acc + Math.pow(val - avgTokens, 2), 0) / tokens.length);

      // Detect anomalies (values beyond 2 standard deviations)
      allEntries.forEach(entry => {
        // Cost spike detection
        if (entry.cost_usd > avgCost + (2 * costStdDev)) {
          const deviation = ((entry.cost_usd - avgCost) / avgCost) * 100;
          anomalies.push({
            timestamp: entry.timestamp,
            type: 'cost_spike',
            severity: deviation > 300 ? 'high' : deviation > 150 ? 'medium' : 'low',
            description: `Unusually high cost: $${entry.cost_usd.toFixed(4)} vs avg $${avgCost.toFixed(4)}`,
            actual_value: entry.cost_usd,
            expected_value: avgCost,
            deviation_percentage: deviation
          });
        }

        // High token usage detection
        if (entry.total_tokens > avgTokens + (2 * tokenStdDev)) {
          const deviation = ((entry.total_tokens - avgTokens) / avgTokens) * 100;
          anomalies.push({
            timestamp: entry.timestamp,
            type: 'high_tokens',
            severity: deviation > 300 ? 'high' : deviation > 150 ? 'medium' : 'low',
            description: `Unusually high token usage: ${entry.total_tokens} vs avg ${Math.round(avgTokens)}`,
            actual_value: entry.total_tokens,
            expected_value: avgTokens,
            deviation_percentage: deviation
          });
        }

        // Unusual model detection (models used less than 5% of the time)
        const modelCounts = new Map<string, number>();
        allEntries.forEach(e => modelCounts.set(e.model, (modelCounts.get(e.model) ?? 0) + 1));
        const totalEntries = allEntries.length;
        const modelUsageRate = (modelCounts.get(entry.model) ?? 0) / totalEntries;
        
        if (modelUsageRate < 0.05) { // Less than 5% usage
          anomalies.push({
            timestamp: entry.timestamp,
            type: 'unusual_model',
            severity: 'low',
            description: `Rarely used model: ${entry.model} (${(modelUsageRate * 100).toFixed(1)}% of usage)`,
            actual_value: modelUsageRate * 100,
            expected_value: 20, // Expected more regular usage
            deviation_percentage: ((20 - modelUsageRate * 100) / 20) * 100
          });
        }
      });

      log.debug(`Detected ${anomalies.length} anomalies`, 'UsageService');
      return anomalies.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      log.service.error('UsageService', 'Failed to detect anomalies', error as Error);
      throw new Error(`Failed to detect anomalies: ${error}`);
    }
  }

  /**
   * Generate predictive analytics
   */
  async generatePredictions(): Promise<PredictiveAnalytics> {
    try {
      const allEntries = await this.getAllUsageEntries();
      
      if (allEntries.length < 7) {
        // Not enough data for meaningful predictions
        return {
          predicted_monthly_cost: 0,
          predicted_monthly_tokens: 0,
          cost_trend: 'stable',
          confidence_level: 0,
          next_week_forecast: { cost: 0, tokens: 0 },
          budget_risk: { level: 'low', projected_overage: 0 }
        };
      }

      // FIXED: Only use recent data (last 30 days) for predictions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentEntries = allEntries.filter(entry => 
        new Date(entry.timestamp) >= thirtyDaysAgo
      );
      
      // If not enough recent data, fall back to last 30 entries but warn
      const entriesForAnalysis = recentEntries.length >= 7 ? recentEntries : allEntries.slice(0, 30);
      
      log.debug(`Using ${entriesForAnalysis.length} entries from last 30 days for predictions (filtered from ${allEntries.length} total)`, 'UsageService');
      
      // Use centralized predictive analytics calculation
      const predictionResults = calculatePredictiveAnalytics(entriesForAnalysis);

      const predictions: PredictiveAnalytics = {
        predicted_monthly_cost: predictionResults.predictedMonthlyCost,
        predicted_monthly_tokens: predictionResults.predictedMonthlyTokens,
        cost_trend: predictionResults.costTrend,
        confidence_level: predictionResults.confidenceLevel,
        next_week_forecast: {
          cost: predictionResults.nextWeekCost,
          tokens: predictionResults.nextWeekTokens
        },
        budget_risk: {
          level: predictionResults.budgetRisk,
          projected_overage: predictionResults.projectedOverage
        }
      };

      log.debug(`Generated predictions with ${predictionResults.confidenceLevel.toFixed(1)}% confidence`, 'UsageService');
      return predictions;
    } catch (error) {
      log.service.error('UsageService', 'Failed to generate predictions', error as Error);
      throw new Error(`Failed to generate predictions: ${error}`);
    }
  }

  /**
   * Get comprehensive business intelligence analytics
   */
  async getBusinessIntelligence(): Promise<BusinessIntelligence> {
    try {
      const startTime = performance.now();
      
      const [
        allEntries,
        modelEfficiency,
        dailyTrends,
        weeklyTrends,
        monthlyTrends,
        anomalies,
        predictions
      ] = await Promise.all([
        this.getAllUsageEntries(),
        this.getModelEfficiency(),
        this.generateUsageTrends('daily'),
        this.generateUsageTrends('weekly'),
        this.generateUsageTrends('monthly'),
        this.detectAnomalies(),
        this.generatePredictions()
      ]);

      if (allEntries.length === 0) {
        const emptyBI: BusinessIntelligence = {
          total_cost: 0,
          total_tokens: 0,
          total_sessions: 0,
          cost_per_token: 0,
          tokens_per_hour: 0,
          cost_burn_rate: 0,
          session_efficiency: 0,
          model_diversity: 0,
          trends: { daily: [], weekly: [], monthly: [] },
          model_efficiency: [],
          most_expensive_model: '',
          most_efficient_model: '',
          peak_usage_hours: [],
          busiest_day_of_week: '',
          usage_patterns: { morning: 0, afternoon: 0, evening: 0, night: 0 },
          predictions,
          anomalies: [],
          data_quality_score: 100,
          calculation_time_ms: performance.now() - startTime,
          data_points_analyzed: 0,
          last_updated: new Date().toISOString()
        };
        return emptyBI;
      }

      // Core metrics
      const totalCost = allEntries.reduce((sum, entry) => sum + entry.cost_usd, 0);
      const totalTokens = allEntries.reduce((sum, entry) => sum + entry.total_tokens, 0);
      const uniqueSessions = new Set(allEntries.map(entry => entry.session_id).filter(Boolean)).size;
      
      // Advanced metrics
      const costPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;
      const modelDiversity = new Set(allEntries.map(entry => entry.model)).size;
      
      // Time analysis
      const timeSpanMs = new Date(allEntries[allEntries.length - 1].timestamp).getTime() - new Date(allEntries[0].timestamp).getTime();
      const timeSpanHours = Math.max(1, timeSpanMs / (1000 * 60 * 60));
      const tokensPerHour = totalTokens / timeSpanHours;
      const costBurnRate = totalCost / timeSpanHours;
      const sessionEfficiency = uniqueSessions > 0 ? totalTokens / uniqueSessions : 0;

      // Usage patterns by time of day
      const hourCounts = new Array(24).fill(0);
      const dayOfWeekCounts = new Array(7).fill(0);
      const timePatterns = { morning: 0, afternoon: 0, evening: 0, night: 0 };

      allEntries.forEach(entry => {
        const date = new Date(entry.timestamp);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        
        hourCounts[hour]++;
        dayOfWeekCounts[dayOfWeek]++;
        
        if (hour >= 6 && hour < 12) timePatterns.morning++;
        else if (hour >= 12 && hour < 18) timePatterns.afternoon++;
        else if (hour >= 18 && hour < 24) timePatterns.evening++;
        else timePatterns.night++;
      });

      // Find peak usage hours (top 3 hours)
      const peakHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(item => item.hour);

      // Busiest day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const busiestDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
      const busiestDay = dayNames[busiestDayIndex];

      // Model analysis
      const mostExpensiveModel = modelEfficiency.length > 0 
        ? modelEfficiency.reduce((prev, curr) => prev.totalCost > curr.totalCost ? prev : curr).model 
        : '';
      const mostEfficientModel = modelEfficiency.length > 0 ? modelEfficiency[0].model : '';

      // Data quality score
      const completeEntries = allEntries.filter(e => e.model != null && e.model !== '' && e.timestamp != null && e.timestamp !== '' && e.cost_usd >= 0 && e.total_tokens > 0);
      const dataQualityScore = (completeEntries.length / allEntries.length) * 100;

      const businessIntelligence: BusinessIntelligence = {
        total_cost: totalCost,
        total_tokens: totalTokens,
        total_sessions: uniqueSessions,
        cost_per_token: costPerToken,
        tokens_per_hour: tokensPerHour,
        cost_burn_rate: costBurnRate,
        session_efficiency: sessionEfficiency,
        model_diversity: modelDiversity,
        trends: {
          daily: dailyTrends,
          weekly: weeklyTrends,
          monthly: monthlyTrends
        },
        model_efficiency: modelEfficiency,
        most_expensive_model: mostExpensiveModel,
        most_efficient_model: mostEfficientModel,
        peak_usage_hours: peakHours,
        busiest_day_of_week: busiestDay,
        usage_patterns: timePatterns,
        predictions,
        anomalies,
        data_quality_score: dataQualityScore,
        calculation_time_ms: performance.now() - startTime,
        data_points_analyzed: allEntries.length,
        last_updated: new Date().toISOString()
      };

      log.debug(`Generated business intelligence report in ${businessIntelligence.calculation_time_ms.toFixed(2)}ms`, 'UsageService');
      return businessIntelligence;
    } catch (error) {
      log.service.error('UsageService', 'Failed to generate business intelligence', error as Error);
      throw new Error(`Failed to generate business intelligence: ${error}`);
    }
  }

  /**
   * Get enhanced usage stats with business intelligence
   */
  async getAdvancedUsageStats(): Promise<AdvancedUsageStats> {
    try {
      const [basicStats, businessIntelligence] = await Promise.all([
        this.getUsageStats(),
        this.getBusinessIntelligence()
      ]);

      const advancedStats: AdvancedUsageStats = {
        ...businessIntelligence,
        // Legacy compatibility fields
        totalEntries: basicStats.totalEntries,
        totalCost: basicStats.totalCost,
        totalTokens: basicStats.totalTokens,
        uniqueModels: basicStats.uniqueModels,
        uniqueSessions: basicStats.uniqueSessions,
        dateRange: basicStats.dateRange
      };

      return advancedStats;
    } catch (error) {
      log.service.error('UsageService', 'Failed to get advanced usage stats', error as Error);
      throw new Error(`Failed to get advanced usage stats: ${error}`);
    }
  }

  /**
   * Project Analytics Methods
   */

  /**
   * Extract project name from file path or session data
   */
  private extractProjectName(entry: UsageEntry): string {
    // Try to extract from project_path first
    if (entry.project_path != null && entry.project_path !== '') {
      const pathParts = entry.project_path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      return lastPart || 'Unknown Project';
    }

    // Fall back to extracting from session_id or other fields
    if (entry.session_id != null && entry.session_id !== '') {
      // Try to match session to known project directories
      const sessionFiles = this.sessionToFileMap.get(entry.session_id);
      if (sessionFiles && sessionFiles.length > 0) {
        const filePath = sessionFiles[0];
        const pathMatch = filePath.match(/projects\/([^/]+)\//);
        if (pathMatch) {
          return this.formatProjectName(pathMatch[1]);
        }
      }
    }

    return 'Unknown Project';
  }

  /**
   * Format project name for display
   */
  private formatProjectName(rawName: string): string {
    // Remove common prefixes and clean up the name
    return rawName
      .replace(/^-Users-[^-]+-dev-/, '') // Remove user path prefix
      .replace(/^-/, '') // Remove leading dash
      .replace(/-/g, ' ') // Replace dashes with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
  }

  /**
   * Get project breakdown analytics
   */
  async getProjectBreakdown(): Promise<ProjectAnalytics[]> {
    try {
      const allEntries = await this.getAllUsageEntries();
      
      if (allEntries.length === 0) {
        return [];
      }

      // Group entries by project
      const projectGroups = new Map<string, UsageEntry[]>();
      
      allEntries.forEach(entry => {
        const projectName = this.extractProjectName(entry);
        if (!projectGroups.has(projectName)) {
          projectGroups.set(projectName, []);
        }
        const projectGroup = projectGroups.get(projectName);
        if (projectGroup) {
          projectGroup.push(entry);
        }
      });

      const projectAnalytics: ProjectAnalytics[] = [];

      for (const [projectName, entries] of projectGroups.entries()) {
        // Use centralized calculator for consistent project analytics
        const analytics = calculateProjectAnalytics(projectName, entries);
        projectAnalytics.push(analytics);
      }

      // Sort by total cost (highest first)
      projectAnalytics.sort((a, b) => b.total_cost - a.total_cost);

      log.debug(`Generated project breakdown for ${projectAnalytics.length} projects`, 'UsageService');
      return projectAnalytics;
    } catch (error) {
      log.service.error('UsageService', 'Failed to get project breakdown', error as Error);
      throw new Error(`Failed to get project breakdown: ${error}`);
    }
  }

  /**
   * Get project comparison data
   */
  async getProjectComparison(): Promise<ProjectComparison> {
    try {
      const projects = await this.getProjectBreakdown();
      
      if (projects.length === 0) {
        return {
          projects: [],
          total_projects: 0,
          most_expensive_project: '',
          most_efficient_project: '',
          cost_distribution: [],
          activity_timeline: []
        };
      }

      const totalCost = projects.reduce((sum, p) => sum + p.total_cost, 0);

      // Cost distribution
      const costDistribution = projects.map(project => ({
        project_name: project.project_name,
        cost: project.total_cost,
        percentage: totalCost > 0 ? (project.total_cost / totalCost) * 100 : 0
      }));

      // Most expensive and efficient projects
      const mostExpensive = projects.reduce((prev, curr) => 
        prev.total_cost > curr.total_cost ? prev : curr
      );
      const mostEfficient = projects.reduce((prev, curr) => {
        // Calculate cost per token for efficiency comparison (lower = more efficient)
        const prevEfficiency = prev.total_tokens > 0 ? prev.total_cost / prev.total_tokens : Infinity;
        const currEfficiency = curr.total_tokens > 0 ? curr.total_cost / curr.total_tokens : Infinity;
        return prevEfficiency < currEfficiency ? prev : curr;
      });

      // Activity timeline (last 30 days)
      const allEntries = await this.getAllUsageEntries();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const recentEntries = allEntries.filter(e => 
        new Date(e.timestamp).getTime() > thirtyDaysAgo
      );

      const timelineMap = new Map<string, { projects: Set<string>, cost: number }>();
      
      recentEntries.forEach(entry => {
        const date = entry.timestamp.split('T')[0]; // YYYY-MM-DD
        const projectName = this.extractProjectName(entry);
        
        if (!timelineMap.has(date)) {
          timelineMap.set(date, { projects: new Set(), cost: 0 });
        }
        
        const dayData = timelineMap.get(date);
        if (dayData != null) {
          dayData.projects.add(projectName);
          dayData.cost += entry.cost_usd;
        }
      });

      const activityTimeline = Array.from(timelineMap.entries())
        .map(([date, data]) => ({
          date,
          projects_active: data.projects.size,
          total_cost: data.cost
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const comparison: ProjectComparison = {
        projects,
        total_projects: projects.length,
        most_expensive_project: mostExpensive.project_name,
        most_efficient_project: mostEfficient.project_name,
        cost_distribution: costDistribution,
        activity_timeline: activityTimeline
      };

      log.debug(`Generated project comparison for ${projects.length} projects`, 'UsageService');
      return comparison;
    } catch (error) {
      log.service.error('UsageService', 'Failed to get project comparison', error as Error);
      throw new Error(`Failed to get project comparison: ${error}`);
    }
  }

  /**
   * Get sessions for a specific project
   */
  async getProjectSessions(projectName: string): Promise<ProjectSession[]> {
    try {
      const allEntries = await this.getAllUsageEntries();
      
      // Filter entries for this project
      const projectEntries = allEntries.filter(entry => 
        this.extractProjectName(entry) === projectName
      );

      if (projectEntries.length === 0) {
        return [];
      }

      // Group by session
      const sessionGroups = new Map<string, UsageEntry[]>();
      projectEntries.forEach(entry => {
        if (entry.session_id != null && entry.session_id !== '') {
          if (!sessionGroups.has(entry.session_id)) {
            sessionGroups.set(entry.session_id, []);
          }
          const sessionGroup = sessionGroups.get(entry.session_id);
          if (sessionGroup) {
            sessionGroup.push(entry);
          }
        }
      });

      const projectSessions: ProjectSession[] = [];

      for (const [sessionId, entries] of sessionGroups.entries()) {
        // Calculate session metrics
        const totalCost = entries.reduce((sum, entry) => sum + entry.cost_usd, 0);
        const totalTokens = entries.reduce((sum, entry) => sum + entry.total_tokens, 0);
        const messageCount = entries.length;
        const modelsUsed = [...new Set(entries.map(e => e.model))];

        // Time range
        const timestamps = entries.map(e => new Date(e.timestamp).getTime()).sort();
        const startTime = new Date(timestamps[0]).toISOString();
        const endTime = new Date(timestamps[timestamps.length - 1]).toISOString();

        // Efficiency (tokens per dollar)
        const efficiency = totalCost > 0 ? totalTokens / totalCost : 0;

        projectSessions.push({
          session_id: sessionId,
          project_name: projectName,
          start_time: startTime,
          end_time: endTime,
          total_cost: totalCost,
          total_tokens: totalTokens,
          message_count: messageCount,
          models_used: modelsUsed,
          efficiency
        });
      }

      // Sort by start time (most recent first)
      projectSessions.sort((a, b) => 
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );

      log.debug(`Found ${projectSessions.length} sessions for project: ${projectName}`, 'UsageService');
      return projectSessions;
    } catch (error) {
      log.service.error('UsageService', 'Failed to get project sessions', error as Error);
      throw new Error(`Failed to get project sessions: ${error}`);
    }
  }

  // Add session to file mapping for better project extraction
  private readonly sessionToFileMap = new Map<string, string[]>();

  /**
   * Enhanced initialize method to build session-to-file mapping
   */
  private async buildSessionFileMapping(): Promise<void> {
    try {
      const jsonlFiles = await this.discoverClaudeFiles();
      
      for (const filePath of jsonlFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.trim().split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const entry = JSON.parse(line) as ClaudeJSONLEntry;
                if (entry.sessionId) {
                  if (!this.sessionToFileMap.has(entry.sessionId)) {
                    this.sessionToFileMap.set(entry.sessionId, []);
                  }
                  const sessionFiles = this.sessionToFileMap.get(entry.sessionId);
                  if (sessionFiles && !sessionFiles.includes(filePath)) {
                    sessionFiles.push(filePath);
                  }
                }
              } catch (_parseError) {
                // Skip invalid JSON lines
              }
            }
          }
        } catch (_fileError) {
          log.warn(`Failed to read file for mapping: ${filePath}`, 'UsageService');
        }
      }
      
      log.debug(`Built session mapping for ${this.sessionToFileMap.size} sessions`, 'UsageService');
    } catch (error) {
      log.service.error('UsageService', 'Failed to build session file mapping', error as Error);
    }
  }
}

// Export default instance
export const usageService = new UsageService();