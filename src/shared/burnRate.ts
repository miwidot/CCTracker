export interface BurnRate {
  tokensPerMinute: number;
  tokensPerMinuteForIndicator: number;
  costPerHour: number;
}

export interface SessionBlock {
  id: string;
  project: string;
  startTime: Date;
  endTime: Date;
  entries: Array<{
    timestamp: Date;
    requestId: string;
  }>;
  tokenCounts: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
  costUSD: number;
  isActive: boolean;
  isGap?: boolean;
}

export interface ProjectedUsage {
  totalTokens: number;
  totalCost: number;
  remainingMinutes: number;
}

export const BURN_RATE_THRESHOLDS = {
  HIGH: 1000,      // > 1000 tokens/minute = HIGH (red)
  MODERATE: 500,   // 500-1000 tokens/minute = MODERATE (yellow)
} as const;

export function getTotalTokens(tokenCounts: SessionBlock['tokenCounts']): number {
  return (
    tokenCounts.inputTokens +
    tokenCounts.outputTokens +
    tokenCounts.cacheCreationTokens +
    tokenCounts.cacheReadTokens
  );
}

export function calculateBurnRate(block: SessionBlock): BurnRate | null {
  // Skip empty blocks or gap blocks
  if (block.entries.length === 0 || (block.isGap ?? false)) {
    return null;
  }
  
  // Get first and last entry timestamps
  const firstEntry = block.entries[0].timestamp;
  const lastEntry = block.entries[block.entries.length - 1].timestamp;
  
  // Calculate duration in minutes
  const durationMinutes = (lastEntry.getTime() - firstEntry.getTime()) / (1000 * 60);
  
  if (durationMinutes <= 0) {
    return null;
  }
  
  // Calculate total tokens per minute (includes all token types)
  const totalTokens = getTotalTokens(block.tokenCounts);
  const tokensPerMinute = totalTokens / durationMinutes;
  
  // For burn rate indicator, use only input and output tokens
  // (excludes cache tokens to maintain consistent thresholds)
  const nonCacheTokens = block.tokenCounts.inputTokens + block.tokenCounts.outputTokens;
  const tokensPerMinuteForIndicator = nonCacheTokens / durationMinutes;
  
  // Calculate cost per hour
  const costPerHour = (block.costUSD / durationMinutes) * 60;
  
  return {
    tokensPerMinute,
    tokensPerMinuteForIndicator,
    costPerHour,
  };
}

export function getBurnRateStatus(burnRate: BurnRate): 'high' | 'moderate' | 'normal' {
  if (burnRate.tokensPerMinuteForIndicator > BURN_RATE_THRESHOLDS.HIGH) {
    return 'high';
  }
  if (burnRate.tokensPerMinuteForIndicator > BURN_RATE_THRESHOLDS.MODERATE) {
    return 'moderate';
  }
  return 'normal';
}

export function projectBlockUsage(block: SessionBlock): ProjectedUsage | null {
  const burnRate = calculateBurnRate(block);
  if (!burnRate || !block.isActive) {
    return null;
  }
  
  const now = new Date();
  const remainingMinutes = (block.endTime.getTime() - now.getTime()) / (1000 * 60);
  
  if (remainingMinutes <= 0) {
    return null;
  }
  
  const currentTokens = getTotalTokens(block.tokenCounts);
  const projectedAdditionalTokens = burnRate.tokensPerMinute * remainingMinutes;
  const projectedAdditionalCost = (burnRate.costPerHour / 60) * remainingMinutes;
  
  return {
    totalTokens: currentTokens + projectedAdditionalTokens,
    totalCost: block.costUSD + projectedAdditionalCost,
    remainingMinutes
  };
}