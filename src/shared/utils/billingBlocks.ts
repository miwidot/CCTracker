/**
 * Billing Block Utilities for 5-hour Claude API billing cycles
 */

import type { UsageEntry } from '../types';
import type { BillingBlock, BurnRateLevel, BurnRateStatus, TokenBreakdown } from '../types/billing';

/**
 * Constants for billing block calculations
 */
export const BILLING_BLOCK_HOURS = 5;
export const BILLING_BLOCK_MS = BILLING_BLOCK_HOURS * 60 * 60 * 1000;

/**
 * Floor timestamp to the beginning of the hour in UTC
 * This is critical for proper billing block alignment
 */
function floorToHour(timestamp: Date): Date {
  const floored = new Date(timestamp);
  floored.setUTCMinutes(0, 0, 0);
  return floored;
}

/**
 * Get the billing block start time for a given timestamp
 * Claude's billing blocks start at UTC hours divisible by 5 (0, 5, 10, 15, 20)
 * IMPORTANT: The first entry time should be floored to the hour first
 */
export function getBillingBlockStart(timestamp: Date, isFirstEntry: boolean = false): Date {
  // If this is the first entry, floor to the hour first
  const baseTime = isFirstEntry ? floorToHour(timestamp) : timestamp;
  
  const utc = new Date(baseTime.getTime());
  const hourUTC = utc.getUTCHours();
  const blockStartHour = Math.floor(hourUTC / BILLING_BLOCK_HOURS) * BILLING_BLOCK_HOURS;
  
  const blockStart = new Date(utc);
  blockStart.setUTCHours(blockStartHour, 0, 0, 0);
  
  return blockStart;
}

/**
 * Get the billing block end time for a given start time
 */
export function getBillingBlockEnd(blockStart: Date): Date {
  return new Date(blockStart.getTime() + BILLING_BLOCK_MS);
}

/**
 * Check if a timestamp falls within a billing block
 */
export function isInBillingBlock(timestamp: Date, blockStart: Date): boolean {
  const blockEnd = getBillingBlockEnd(blockStart);
  return timestamp >= blockStart && timestamp < blockEnd;
}

/**
 * Get the current active billing block
 */
export function getCurrentBillingBlock(): { start: Date; end: Date; isActive: boolean } {
  const now = new Date();
  const start = getBillingBlockStart(now);
  const end = getBillingBlockEnd(start);
  
  return {
    start,
    end,
    isActive: now < end
  };
}

/**
 * Calculate remaining time in minutes for a billing block
 */
export function getRemainingTimeMinutes(blockEnd: Date): number {
  const now = new Date();
  const remainingMs = Math.max(0, blockEnd.getTime() - now.getTime());
  return Math.floor(remainingMs / (1000 * 60));
}

/**
 * Extract granular token data from usage entry
 */
export function extractTokenBreakdown(entry: UsageEntry): TokenBreakdown {
  // Map token types to our granular breakdown using the actual UsageEntry structure
  const inputTokens = entry.input_tokens || 0;
  const outputTokens = entry.output_tokens || 0;
  const cacheCreationTokens = entry.cache_creation_tokens || 0;
  const cacheReadTokens = entry.cache_read_tokens || 0;

  // Use model pricing to calculate costs
  const model = entry.model || 'claude-3-5-sonnet-20241022';
  const pricing = getModelPricing(model);

  return {
    input: {
      count: inputTokens,
      cost: (inputTokens / 1000000) * pricing.input
    },
    output: {
      count: outputTokens,
      cost: (outputTokens / 1000000) * pricing.output
    },
    cacheCreation: {
      count: cacheCreationTokens,
      cost: (cacheCreationTokens / 1000000) * pricing.cacheWrite
    },
    cacheRead: {
      count: cacheReadTokens,
      cost: (cacheReadTokens / 1000000) * pricing.cacheRead
    }
  };
}

/**
 * Get model pricing data (using latest 2025 pricing)
 */
function getModelPricing(model: string): { input: number; output: number; cacheWrite: number; cacheRead: number } {
  const pricingMap: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
    'claude-3-5-sonnet-20241022': {
      input: 3.00,    // $3 per 1M input tokens
      output: 15.00,  // $15 per 1M output tokens
      cacheWrite: 3.75, // $3.75 per 1M cache write tokens
      cacheRead: 0.30   // $0.30 per 1M cache read tokens
    },
    'claude-3-5-haiku-20241022': {
      input: 1.00,
      output: 5.00,
      cacheWrite: 1.25,
      cacheRead: 0.10
    },
    'claude-3-opus-20240229': {
      input: 15.00,
      output: 75.00,
      cacheWrite: 18.75,
      cacheRead: 1.50
    }
  };

  return pricingMap[model] || pricingMap['claude-3-5-sonnet-20241022'];
}

/**
 * Calculate burn rate level based on tokens per minute
 * Uses only input and output tokens (excludes cache tokens) for threshold comparison
 * Aligns with Claude's actual billing thresholds
 */
export function calculateBurnRateLevel(tokensPerMinute: number): BurnRateLevel {
  // Using thresholds that align with the other implementation
  if (tokensPerMinute < 500) return 'LOW';      // NORMAL equivalent
  if (tokensPerMinute < 1000) return 'MODERATE'; // 500-1000 tokens/min
  if (tokensPerMinute < 2000) return 'HIGH';     // 1000-2000 tokens/min
  return 'CRITICAL';                              // >2000 tokens/min
}

/**
 * Calculate burn rate status for a billing block
 * Uses separate calculation for indicator (excluding cache tokens)
 */
export function calculateBurnRateStatus(
  totalTokens: number,
  nonCacheTokens: number, // input + output tokens only
  totalCost: number,
  elapsedMinutes: number,
  remainingMinutes: number
): BurnRateStatus {
  if (elapsedMinutes === 0) {
    return {
      level: 'LOW',
      tokensPerMinute: 0,
      costPerMinute: 0,
      projectedBlockCost: 0
    };
  }

  const tokensPerMinute = totalTokens / elapsedMinutes;
  const costPerMinute = totalCost / elapsedMinutes;
  const projectedBlockCost = totalCost + (costPerMinute * remainingMinutes);
  
  // Use non-cache tokens for burn rate level calculation
  const indicatorTokensPerMinute = nonCacheTokens / elapsedMinutes;
  const level = calculateBurnRateLevel(indicatorTokensPerMinute);
  
  let warningMessage: string | undefined;
  if (level === 'HIGH') {
    warningMessage = 'High usage rate detected';
  } else if (level === 'CRITICAL') {
    warningMessage = 'Critical usage rate - consider reducing activity';
  }

  return {
    level,
    tokensPerMinute,
    costPerMinute,
    projectedBlockCost,
    warningMessage
  };
}

/**
 * Generate a unique ID for a billing block
 */
export function generateBillingBlockId(blockStart: Date): string {
  return `block_${blockStart.getTime()}`;
}

/**
 * Calculate cache efficiency percentage
 */
export function calculateCacheEfficiency(cacheRead: number, cacheCreation: number): number {
  const totalCacheOps = cacheRead + cacheCreation;
  if (totalCacheOps === 0) return 0;
  return Math.round((cacheRead / totalCacheOps) * 100);
}