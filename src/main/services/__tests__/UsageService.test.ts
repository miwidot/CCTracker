import { UsageService } from '../UsageService';
// import { MODEL_PRICING } from '@shared/constants';
import { calculateCost } from '../CostCalculatorService';
import * as fs from 'fs/promises';
// import * as path from 'path';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('UsageService', () => {
  let usageService: UsageService;
  
  beforeEach(() => {
    usageService = new UsageService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any resources, clear caches, etc.
    jest.clearAllMocks();
  });

  describe('calculateCost (via imported function)', () => {
    it('calculates cost correctly for known model', () => {
      const model = 'claude-3-5-sonnet-20241022';
      const inputTokens = 1000;
      const outputTokens = 500;
      
      const cost = calculateCost(model, inputTokens, outputTokens);
      
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('returns zero for unknown model', () => {
      const model = 'unknown-model';
      const inputTokens = 1000;
      const outputTokens = 500;
      
      const cost = calculateCost(model, inputTokens, outputTokens);
      
      // Unknown models should return 0 as expected behavior
      expect(cost).toBe(0);
      expect(typeof cost).toBe('number');
    });

    it('handles zero tokens', () => {
      const model = 'claude-3-5-sonnet-20241022';
      const cost = calculateCost(model, 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('parseJsonlLine', () => {
    it('parses valid legacy JSONL line correctly', () => {
      const jsonlLine = JSON.stringify({
        timestamp: '2024-01-01T00:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150
        },
        session_id: 'session-1'
      });

      const result = usageService.parseJSONLLine(jsonlLine);

      expect(result).toEqual({
        id: expect.any(String),
        timestamp: '2024-01-01T00:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: expect.any(Number),
        session_id: 'session-1',
        project_path: undefined,
        conversation_id: undefined
      });
    });

    it('returns null for invalid JSON', () => {
      const invalidJsonl = 'invalid json';
      const result = usageService.parseJSONLLine(invalidJsonl);
      expect(result).toBeNull();
    });

    it('returns null for missing required fields', () => {
      const incompleteJsonl = JSON.stringify({
        id: 'test-id'
        // missing other required fields
      });

      const result = usageService.parseJSONLLine(incompleteJsonl);
      expect(result).toBeNull();
    });
  });

  describe('getAllUsageEntries', () => {
    it('returns empty array when no usage data exists', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      
      const entries = await usageService.getAllUsageEntries();
      
      expect(entries).toEqual([]);
    });

    it('returns sorted entries by timestamp descending', async () => {
      const mockContent = [
        JSON.stringify({
          timestamp: '2024-01-01T00:00:00Z',
          model: 'claude-3-5-sonnet-20241022',
          usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
          session_id: 'session-1'
        }),
        JSON.stringify({
          timestamp: '2024-01-02T00:00:00Z',
          model: 'claude-3-5-sonnet-20241022',
          usage: { input_tokens: 200, output_tokens: 100, total_tokens: 300 },
          session_id: 'session-2'
        })
      ].join('\n');
      
      mockFs.readFile.mockResolvedValue(mockContent);
      
      const entries = await usageService.getAllUsageEntries();
      
      expect(entries).toHaveLength(2);
      expect(entries[0].timestamp).toBe('2024-01-02T00:00:00Z'); // Most recent first
      expect(entries[1].timestamp).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('getUsageStats', () => {
    it('returns zero stats when no entries exist', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      
      const stats = await usageService.getUsageStats();
      
      expect(stats).toEqual({
        totalEntries: 0,
        totalCost: 0,
        totalTokens: 0,
        uniqueModels: [],
        uniqueSessions: 0,
        dateRange: { earliest: null, latest: null }
      });
    });

    it('calculates correct stats from entries', async () => {
      const mockContent = [
        JSON.stringify({
          timestamp: '2024-01-01T00:00:00Z',
          model: 'claude-3-5-sonnet-20241022',
          usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
          session_id: 'session-1'
        }),
        JSON.stringify({
          timestamp: '2024-01-02T00:00:00Z',
          model: 'claude-3-opus-20240229',
          usage: { input_tokens: 200, output_tokens: 100, total_tokens: 300 },
          session_id: 'session-2'
        })
      ].join('\n');
      
      mockFs.readFile.mockResolvedValue(mockContent);
      
      const stats = await usageService.getUsageStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalCost).toBeGreaterThan(0); // Cost will be calculated
      expect(stats.totalTokens).toBe(450);
      expect(stats.uniqueModels).toHaveLength(2);
      expect(stats.uniqueSessions).toBe(2);
      expect(stats.dateRange.earliest).toBe('2024-01-01T00:00:00Z');
      expect(stats.dateRange.latest).toBe('2024-01-02T00:00:00Z');
    });
  });

  describe('addUsageEntry', () => {
    it('adds entry to cache and appends to file', async () => {
      const entry = {
        id: 'test-id',
        timestamp: '2024-01-01T00:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.001,
        session_id: 'session-1',
        project_path: '/test/path',
        conversation_id: 'conv-1'
      };
      
      mockFs.appendFile.mockResolvedValue(undefined);
      
      await usageService.addUsageEntry(entry);
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('usage.jsonl'),
        expect.stringContaining('test-id'),
        'utf-8'
      );
    });

    it('throws error when file write fails', async () => {
      const entry = {
        id: 'test-id',
        timestamp: '2024-01-01T00:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.001,
        session_id: 'session-1'
      };
      
      mockFs.appendFile.mockRejectedValue(new Error('Write failed'));
      
      await expect(usageService.addUsageEntry(entry)).rejects.toThrow(
        'Failed to add usage entry: Error: Write failed'
      );
    });
  });
});