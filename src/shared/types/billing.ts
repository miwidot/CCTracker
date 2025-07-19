/**
 * Billing Block Types for 5-hour Claude API billing cycles
 */

export interface BillingBlock {
  id: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  totalCost: number;
  totalTokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
  };
  burnRate: {
    tokensPerMinute: number;
    costPerMinute: number;
  };
  projectedCost: number;
  remainingTimeMinutes: number;
  usageEntries: string[]; // IDs of usage entries in this block
}

export interface BillingBlockSummary {
  currentBlock: BillingBlock | null;
  recentBlocks: BillingBlock[];
  totalBlocks: number;
  averageBlockCost: number;
  peakBurnRate: number;
}

export type BurnRateLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface BurnRateStatus {
  level: BurnRateLevel;
  tokensPerMinute: number;
  costPerMinute: number;
  projectedBlockCost: number;
  warningMessage?: string;
}

/**
 * Granular token breakdown with separate pricing
 */
export interface TokenBreakdown {
  input: {
    count: number;
    cost: number;
  };
  output: {
    count: number;
    cost: number;
  };
  cacheCreation: {
    count: number;
    cost: number;
  };
  cacheRead: {
    count: number;
    cost: number;
  };
}

export interface ProjectTokenStats {
  projectId: string;
  projectName: string;
  tokens: TokenBreakdown;
  cacheEfficiency: number; // percentage of cache reads vs total cache operations
  contributionToCurrentBlock: number; // percentage of current block usage
}