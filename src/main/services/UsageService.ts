import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MODEL_PRICING } from '../../shared/constants';
import { UsageEntry, SessionStats, DateRangeStats } from '../../shared/types';

interface JSONLEntry {
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
   * Parse a single JSONL line and convert to UsageEntry
   */
  private parseJSONLLine(line: string): UsageEntry | null {
    try {
      const data: JSONLEntry = JSON.parse(line.trim());
      
      if (!data.model || !data.usage || !data.timestamp) {
        console.warn('Invalid JSONL entry - missing required fields:', data);
        return null;
      }

      const pricing = MODEL_PRICING[data.model];
      if (!pricing) {
        console.warn('Unknown model pricing:', data.model);
        return null;
      }

      const inputTokens = data.usage.input_tokens || 0;
      const outputTokens = data.usage.output_tokens || 0;
      const totalTokens = data.usage.total_tokens || (inputTokens + outputTokens);

      // Calculate cost in USD
      const costUsd = (inputTokens * pricing.input) + (outputTokens * pricing.output);

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
    } catch (error) {
      console.error('Failed to parse JSONL line:', line, error);
      return null;
    }
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
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      console.warn(`Unknown model for cost calculation: ${model}`);
      return 0;
    }

    return (inputTokens * pricing.input) + (outputTokens * pricing.output);
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
}

// Export default instance
export const usageService = new UsageService();