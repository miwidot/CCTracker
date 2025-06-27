import { UsageService } from '../UsageService';
import { MODEL_PRICING } from '@shared/constants';
import { calculateCost } from '../CostCalculatorService';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('UsageService', () => {
  let usageService: UsageService;
  
  beforeEach(() => {
    usageService = new UsageService();
    jest.clearAllMocks();
  });

  describe('calculateCost', () => {
    it('calculates cost correctly for known model', () => {
      const model = 'claude-3-5-sonnet-20241022';
      const inputTokens = 1000;
      const outputTokens = 500;
      
      const cost = usageService.calculateCost(model, inputTokens, outputTokens);
      
      const expectedCost = calculateCost(model, inputTokens, outputTokens);
      
      expect(cost).toBe(expectedCost);
    });

    it('uses fallback pricing for unknown model', () => {
      const model = 'unknown-model';
      const inputTokens = 1000;
      const outputTokens = 500;
      
      const cost = usageService.calculateCost(model, inputTokens, outputTokens);
      
      // Should use fallback pricing from centralized calculator
      const expectedCost = calculateCost(model, inputTokens, outputTokens);
      expect(cost).toBe(expectedCost);
    });

    it('handles zero tokens', () => {
      const model = 'claude-3-5-sonnet-20241022';
      const cost = usageService.calculateCost(model, 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('parseJsonlLine', () => {
    it('parses valid JSONL line correctly', () => {
      const jsonlLine = JSON.stringify({
        id: 'test-id',
        timestamp: '2024-01-01T00:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 100,
        output_tokens: 50,
        session_id: 'session-1'
      });

      const result = (usageService as any).parseJSONLLine(jsonlLine);

      expect(result).toEqual({
        id: 'test-id',
        timestamp: '2024-01-01T00:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: expect.any(Number),
        session_id: 'session-1'
      });
    });

    it('returns null for invalid JSON', () => {
      const invalidJsonl = 'invalid json';
      const result = (usageService as any).parseJSONLLine(invalidJsonl);
      expect(result).toBeNull();
    });

    it('returns null for missing required fields', () => {
      const incompleteJsonl = JSON.stringify({
        id: 'test-id'
        // missing other required fields
      });

      const result = (usageService as any).parseJSONLLine(incompleteJsonl);
      expect(result).toBeNull();
    });
  });
});