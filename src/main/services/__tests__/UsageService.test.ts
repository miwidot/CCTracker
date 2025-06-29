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
    it('parses valid Claude Code CLI JSONL line correctly', () => {
      const jsonlLine = JSON.stringify({
        uuid: 'test-uuid-123',
        sessionId: 'session-1',
        timestamp: '2024-01-01T00:00:00Z',
        cwd: '/Users/test/project',
        type: 'assistant',
        message: {
          role: 'assistant',
          model: 'claude-3-5-sonnet-20241022',
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_creation_input_tokens: 25,
            cache_read_input_tokens: 10
          },
          content: 'Test response content'
        },
        requestId: 'req-123',
        version: '1.0.0'
      });

      const result = usageService.parseJSONLLine(jsonlLine);

      expect(result).toEqual({
        id: 'test-uuid-123',
        timestamp: '2024-01-01T00:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_tokens: 25,
        cache_read_tokens: 10,
        total_tokens: 185, // 100 + 50 + 25 + 10
        cost_usd: expect.any(Number),
        session_id: 'session-1',
        project_path: '/Users/test/project',
        conversation_id: 'req-123'
      });
    });

    it('returns null for invalid JSON', () => {
      const invalidJsonl = 'invalid json';
      const result = usageService.parseJSONLLine(invalidJsonl);
      expect(result).toBeNull();
    });

    it('returns null for missing required fields', () => {
      const incompleteJsonl = JSON.stringify({
        uuid: 'test-id'
        // missing other required fields like timestamp, sessionId, etc.
      });

      const result = usageService.parseJSONLLine(incompleteJsonl);
      expect(result).toBeNull();
    });

    it('returns null for user messages (no usage data)', () => {
      const userJsonl = JSON.stringify({
        uuid: 'test-uuid-123',
        sessionId: 'session-1',
        timestamp: '2024-01-01T00:00:00Z',
        cwd: '/Users/test/project',
        type: 'user',
        message: {
          role: 'user',
          content: 'User message content'
        },
        version: '1.0.0'
      });

      const result = usageService.parseJSONLLine(userJsonl);
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
          uuid: 'test-uuid-1',
          sessionId: 'session-1',
          timestamp: '2024-01-01T00:00:00Z',
          cwd: '/Users/test/project1',
          type: 'assistant',
          message: {
            role: 'assistant',
            model: 'claude-3-5-sonnet-20241022',
            usage: { input_tokens: 100, output_tokens: 50 },
            content: 'Response 1'
          },
          requestId: 'req-1',
          version: '1.0.0'
        }),
        JSON.stringify({
          uuid: 'test-uuid-2',
          sessionId: 'session-2',
          timestamp: '2024-01-02T00:00:00Z',
          cwd: '/Users/test/project2',
          type: 'assistant',
          message: {
            role: 'assistant',
            model: 'claude-3-5-sonnet-20241022',
            usage: { input_tokens: 200, output_tokens: 100 },
            content: 'Response 2'
          },
          requestId: 'req-2',
          version: '1.0.0'
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
          uuid: 'test-uuid-1',
          sessionId: 'session-1',
          timestamp: '2024-01-01T00:00:00Z',
          cwd: '/Users/test/project1',
          type: 'assistant',
          message: {
            role: 'assistant',
            model: 'claude-3-5-sonnet-20241022',
            usage: { input_tokens: 100, output_tokens: 50 },
            content: 'Response 1'
          },
          requestId: 'req-1',
          version: '1.0.0'
        }),
        JSON.stringify({
          uuid: 'test-uuid-2',
          sessionId: 'session-2',
          timestamp: '2024-01-02T00:00:00Z',
          cwd: '/Users/test/project2',
          type: 'assistant',
          message: {
            role: 'assistant',
            model: 'claude-3-opus-20240229',
            usage: { input_tokens: 200, output_tokens: 100 },
            content: 'Response 2'
          },
          requestId: 'req-2',
          version: '1.0.0'
        })
      ].join('\n');
      
      mockFs.readFile.mockResolvedValue(mockContent);
      
      const stats = await usageService.getUsageStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalCost).toBeGreaterThan(0); // Cost will be calculated
      expect(stats.totalTokens).toBe(450); // 150 + 300 (input + output only, no cache tokens in this test)
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