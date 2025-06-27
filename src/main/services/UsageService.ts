import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MODEL_PRICING } from '../../shared/constants';
import CostCalculatorService from './CostCalculatorService';
import { 
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
} from '../../shared/types';

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
    content: any; // Content varies by message type
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
  private cache: Map<string, UsageEntry> = new Map();
  private sessionCache: Map<string, SessionStats> = new Map();

  constructor(dataDir: string = path.join(process.cwd(), 'data')) {
    this.dataDir = dataDir;
    this.usageFile = path.join(dataDir, 'usage.jsonl');
    this.ensureDataDirectory();
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
      throw new Error(`Failed to create data directory: ${error}`);
    }
  }

  /**
   * Parse a single JSONL line and convert to UsageEntry (supports both Claude CLI and legacy formats)
   */
  private parseJSONLLine(line: string): UsageEntry | null {
    try {
      const data = JSON.parse(line.trim());
      
      // Check if it's Claude CLI format
      if (data.uuid && data.sessionId && data.message) {
        return this.parseClaudeJSONLEntry(data as ClaudeJSONLEntry);
      }
      
      // Fall back to legacy format
      return this.parseLegacyJSONLEntry(data as LegacyJSONLEntry);
    } catch (error) {
      console.error('Failed to parse JSONL line:', line, error);
      return null;
    }
  }

  /**
   * Parse Claude CLI format JSONL entry
   */
  private parseClaudeJSONLEntry(data: ClaudeJSONLEntry): UsageEntry | null {
    // Only process assistant messages with usage data
    if (data.type !== 'assistant' || !data.message.usage || !data.message.model) {
      return null;
    }

    const usage = data.message.usage;
    const model = data.message.model;

    const inputTokens = usage.input_tokens || 0;
    const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
    const cacheReadTokens = usage.cache_read_input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    
    // Total input tokens include cache tokens
    const totalInputTokens = inputTokens + cacheCreationTokens + cacheReadTokens;
    const totalTokens = totalInputTokens + outputTokens;

    // Calculate cost using our pricing model
    const costUsd = this.calculateCost(model, totalInputTokens, outputTokens);

    const entry: UsageEntry = {
      id: data.uuid, // Use Claude's UUID instead of generating new one
      timestamp: data.timestamp,
      model: model,
      input_tokens: totalInputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      session_id: data.sessionId,
      project_path: data.cwd,
      conversation_id: data.requestId,
    };

    return entry;
  }

  /**
   * Parse legacy format JSONL entry (backwards compatibility)
   */
  private parseLegacyJSONLEntry(data: LegacyJSONLEntry): UsageEntry | null {
    if (!data.model || !data.usage || !data.timestamp) {
      console.warn('Invalid legacy JSONL entry - missing required fields:', data);
      return null;
    }

    const inputTokens = data.usage.input_tokens || 0;
    const outputTokens = data.usage.output_tokens || 0;
    const totalTokens = data.usage.total_tokens || (inputTokens + outputTokens);

    const costUsd = this.calculateCost(data.model, inputTokens, outputTokens);

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

      console.log(`Parsed ${entries.length} usage entries from ${filePath}`);
      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`File not found: ${filePath}`);
        return [];
      }
      console.error('Failed to parse JSONL file:', error);
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
      const jsonlLine = JSON.stringify({
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
      }) + '\n';

      await fs.appendFile(this.usageFile, jsonlLine, 'utf-8');
      console.log('Added usage entry:', entry.id);
    } catch (error) {
      console.error('Failed to add usage entry:', error);
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
      console.error('Failed to get usage entries:', error);
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
        if (!entry.session_id) return;

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

        const session = sessionMap.get(entry.session_id)!;
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
      console.error('Failed to get usage by date range:', error);
      throw new Error(`Failed to get usage by date range: ${error}`);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<SessionStats | null> {
    try {
      if (this.sessionCache.has(sessionId)) {
        return this.sessionCache.get(sessionId)!;
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
      console.error('Failed to get session stats:', error);
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
      console.log(`Loaded ${entries.length} usage entries from storage`);
    } catch (error) {
      console.error('Failed to load usage data:', error);
      // Don't throw - allow service to continue with empty cache
    }
  }

  /**
   * Calculate cost for given token usage
   * @deprecated Use CostCalculatorService.calculateCost() for consistency
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    return CostCalculatorService.calculateCost(model, inputTokens, outputTokens);
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
      console.error('Failed to process Claude output:', error);
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
        const jsonlContent = recentEntries.map(entry => JSON.stringify({
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
        })).join('\n') + '\n';

        await fs.writeFile(this.usageFile, jsonlContent, 'utf-8');
        
        // Reload cache
        recentEntries.forEach(entry => this.cache.set(entry.id, entry));
        
        console.log(`Cleaned up ${allEntries.length - recentEntries.length} old entries, kept ${recentEntries.length}`);
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
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
      console.error('Failed to get usage stats:', error);
      throw new Error(`Failed to get usage stats: ${error}`);
    }
  }

  /**
   * Auto-detect Claude CLI projects directory
   */
  private getClaudeProjectsPath(): string {
    const os = require('os');
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
        console.log('Claude CLI projects directory not found:', projectsPath);
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
        } catch (error) {
          console.warn(`Failed to read directory ${dir}:`, error);
        }
      };

      await findJsonlFiles(projectsPath);
      
      console.log(`Discovered ${files.length} Claude CLI JSONL files`);
      return files;
    } catch (error) {
      console.error('Failed to discover Claude files:', error);
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
      
      console.log(`Loading usage data from ${jsonlFiles.length} Claude CLI files...`);
      
      for (const filePath of jsonlFiles) {
        try {
          const entries = await this.parseJSONLFile(filePath);
          allEntries.push(...entries);
          console.log(`Loaded ${entries.length} entries from ${path.basename(filePath)}`);
        } catch (error) {
          console.warn(`Failed to load ${filePath}:`, error);
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
      
      console.log(`Successfully loaded ${finalEntries.length} unique usage entries from Claude CLI`);
      return finalEntries;
    } catch (error) {
      console.error('Failed to load from Claude CLI:', error);
      throw new Error(`Failed to load from Claude CLI: ${error}`);
    }
  }

  /**
   * Initialize service and load Claude CLI data
   */
  async initialize(): Promise<void> {
    try {
      // First try to load from Claude CLI
      console.log('Initializing UsageService with Claude CLI integration...');
      
      // Build session-to-file mapping for better project extraction
      await this.buildSessionFileMapping();
      
      const claudeEntries = await this.loadFromClaudeCLI();
      
      if (claudeEntries.length > 0) {
        console.log(`Found ${claudeEntries.length} entries from Claude CLI`);
      } else {
        console.log('No Claude CLI data found, using local storage');
        await this.loadUsageData();
      }
      
      console.log('UsageService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize UsageService:', error);
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
      const efficiency = CostCalculatorService.calculateModelEfficiency(allEntries);

      console.log(`Calculated efficiency for ${efficiency.length} models`);
      return efficiency;
    } catch (error) {
      console.error('Failed to calculate model efficiency:', error);
      throw new Error(`Failed to calculate model efficiency: ${error}`);
    }
  }

  /**
   * Generate usage trends by time period
   * @deprecated Use CostCalculatorService.calculateUsageTrends() for consistency
   */
  async generateUsageTrends(granularity: 'daily' | 'weekly' | 'monthly'): Promise<UsageTrend[]> {
    try {
      const allEntries = await this.getAllUsageEntries();
      const trends = CostCalculatorService.calculateUsageTrends(allEntries, granularity);
      
      console.log(`Generated ${trends.length} ${granularity} trend points`);
      return trends;
    } catch (error) {
      console.error('Failed to generate usage trends:', error);
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
        allEntries.forEach(e => modelCounts.set(e.model, (modelCounts.get(e.model) || 0) + 1));
        const totalEntries = allEntries.length;
        const modelUsageRate = (modelCounts.get(entry.model) || 0) / totalEntries;
        
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

      console.log(`Detected ${anomalies.length} anomalies`);
      return anomalies.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
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
      
      console.log(`Using ${entriesForAnalysis.length} entries from last 30 days for predictions (filtered from ${allEntries.length} total)`);
      
      // Generate trends only from recent data using centralized calculator
      const dailyTrends = CostCalculatorService.calculateUsageTrends(entriesForAnalysis, 'daily');
      
      // Calculate daily averages
      const dailyCosts = dailyTrends.map((t: UsageTrend) => t.cost);
      const dailyTokens = dailyTrends.map((t: UsageTrend) => t.tokens);
      
      const avgDailyCost = dailyCosts.reduce((a: number, b: number) => a + b, 0) / dailyCosts.length;
      const avgDailyTokens = dailyTokens.reduce((a: number, b: number) => a + b, 0) / dailyTokens.length;

      // Simple linear regression for trend detection
      const getTrend = (values: number[]): 'increasing' | 'decreasing' | 'stable' => {
        if (values.length < 3) return 'stable';
        
        const recent = values.slice(-7); // Last week
        const older = values.slice(-14, -7); // Previous week
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        const change = (recentAvg - olderAvg) / olderAvg;
        
        if (change > 0.1) return 'increasing';
        if (change < -0.1) return 'decreasing';
        return 'stable';
      };

      const costTrend = getTrend(dailyCosts);
      
      // Predict monthly cost (30 days * daily average, with trend adjustment)
      let trendMultiplier = 1;
      if (costTrend === 'increasing') trendMultiplier = 1.2;
      else if (costTrend === 'decreasing') trendMultiplier = 0.8;
      
      const predictedMonthlyCost = avgDailyCost * 30 * trendMultiplier;
      const predictedMonthlyTokens = avgDailyTokens * 30 * trendMultiplier;
      
      // Next week forecast
      const nextWeekCost = avgDailyCost * 7 * trendMultiplier;
      const nextWeekTokens = avgDailyTokens * 7 * trendMultiplier;
      
      // Confidence level based on data consistency
      const costVariance = dailyCosts.reduce((acc: number, val: number) => acc + Math.pow(val - avgDailyCost, 2), 0) / dailyCosts.length;
      const confidenceLevel = Math.max(20, Math.min(95, 90 - (costVariance / avgDailyCost) * 100));
      
      // Budget risk assessment (assuming $100 monthly budget)
      const assumedBudget = 100;
      const projectedOverage = Math.max(0, predictedMonthlyCost - assumedBudget);
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      
      if (projectedOverage > assumedBudget * 0.5) riskLevel = 'high';
      else if (projectedOverage > assumedBudget * 0.2) riskLevel = 'medium';

      const predictions: PredictiveAnalytics = {
        predicted_monthly_cost: predictedMonthlyCost,
        predicted_monthly_tokens: predictedMonthlyTokens,
        cost_trend: costTrend,
        confidence_level: confidenceLevel,
        next_week_forecast: {
          cost: nextWeekCost,
          tokens: nextWeekTokens
        },
        budget_risk: {
          level: riskLevel,
          projected_overage: projectedOverage
        }
      };

      console.log(`Generated predictions with ${confidenceLevel.toFixed(1)}% confidence`);
      return predictions;
    } catch (error) {
      console.error('Failed to generate predictions:', error);
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
      const timeSpanMs = new Date(allEntries[0].timestamp).getTime() - new Date(allEntries[allEntries.length - 1].timestamp).getTime();
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
      const completeEntries = allEntries.filter(e => e.model && e.timestamp && e.cost_usd >= 0 && e.total_tokens > 0);
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

      console.log(`Generated business intelligence report in ${businessIntelligence.calculation_time_ms.toFixed(2)}ms`);
      return businessIntelligence;
    } catch (error) {
      console.error('Failed to generate business intelligence:', error);
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
      console.error('Failed to get advanced usage stats:', error);
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
    if (entry.project_path) {
      const pathParts = entry.project_path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      return lastPart || 'Unknown Project';
    }

    // Fall back to extracting from session_id or other fields
    if (entry.session_id) {
      // Try to match session to known project directories
      const sessionFiles = this.sessionToFileMap.get(entry.session_id);
      if (sessionFiles && sessionFiles.length > 0) {
        const filePath = sessionFiles[0];
        const pathMatch = filePath.match(/projects\/([^\/]+)\//);
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
        projectGroups.get(projectName)!.push(entry);
      });

      const projectAnalytics: ProjectAnalytics[] = [];

      for (const [projectName, entries] of projectGroups.entries()) {
        // Use centralized calculator for consistent project analytics
        const analytics = CostCalculatorService.calculateProjectAnalytics(projectName, entries);
        projectAnalytics.push(analytics);
      }

      // Sort by total cost (highest first)
      projectAnalytics.sort((a, b) => b.total_cost - a.total_cost);

      console.log(`Generated project breakdown for ${projectAnalytics.length} projects`);
      return projectAnalytics;
    } catch (error) {
      console.error('Failed to get project breakdown:', error);
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
      const mostEfficient = projects.reduce((prev, curr) => 
        prev.efficiency_score < curr.efficiency_score ? prev : curr
      );

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
        
        const dayData = timelineMap.get(date)!;
        dayData.projects.add(projectName);
        dayData.cost += entry.cost_usd;
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

      console.log(`Generated project comparison for ${projects.length} projects`);
      return comparison;
    } catch (error) {
      console.error('Failed to get project comparison:', error);
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
        if (entry.session_id) {
          if (!sessionGroups.has(entry.session_id)) {
            sessionGroups.set(entry.session_id, []);
          }
          sessionGroups.get(entry.session_id)!.push(entry);
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
          efficiency: efficiency
        });
      }

      // Sort by start time (most recent first)
      projectSessions.sort((a, b) => 
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );

      console.log(`Found ${projectSessions.length} sessions for project: ${projectName}`);
      return projectSessions;
    } catch (error) {
      console.error('Failed to get project sessions:', error);
      throw new Error(`Failed to get project sessions: ${error}`);
    }
  }

  // Add session to file mapping for better project extraction
  private sessionToFileMap = new Map<string, string[]>();

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
                  if (!this.sessionToFileMap.get(entry.sessionId)!.includes(filePath)) {
                    this.sessionToFileMap.get(entry.sessionId)!.push(filePath);
                  }
                }
              } catch (parseError) {
                // Skip invalid JSON lines
              }
            }
          }
        } catch (fileError) {
          console.warn(`Failed to read file for mapping: ${filePath}`);
        }
      }
      
      console.log(`Built session mapping for ${this.sessionToFileMap.size} sessions`);
    } catch (error) {
      console.error('Failed to build session file mapping:', error);
    }
  }
}

// Export default instance
export const usageService = new UsageService();