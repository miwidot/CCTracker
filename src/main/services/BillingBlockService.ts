/**
 * Service for managing billing blocks and granular token tracking
 */

import type { UsageEntry } from '@shared/types';
import type { BillingBlock, BillingBlockSummary, ProjectTokenStats, TokenBreakdown } from '@shared/types/billing';
import {
  BILLING_BLOCK_MS,
  getBillingBlockStart,
  getBillingBlockEnd,
  getCurrentBillingBlock,
  getRemainingTimeMinutes,
  generateBillingBlockId,
  extractTokenBreakdown,
  calculateBurnRateStatus,
  calculateCacheEfficiency,
  isInBillingBlock
} from '@shared/utils/billingBlocks';
import { log } from '@shared/utils/logger';

export class BillingBlockService {
  private billingBlocks = new Map<string, BillingBlock>();
  private projectStats = new Map<string, ProjectTokenStats>();

  /**
   * Process usage entries and organize them into billing blocks
   */
  processBillingBlocks(entries: UsageEntry[]): BillingBlockSummary {
    this.billingBlocks.clear();
    this.projectStats.clear();

    // Sort entries by timestamp
    const sortedEntries = entries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group entries by billing blocks
    let isFirstEntry = true;
    let lastEntryTime: Date | null = null;
    
    for (const entry of sortedEntries) {
      const entryTime = new Date(entry.timestamp);
      
      // Check for gap blocks (more than 5 hours between entries)
      if (lastEntryTime && (entryTime.getTime() - lastEntryTime.getTime()) > BILLING_BLOCK_MS) {
        // Handle gap detection if needed in future
        log.debug(`Gap detected: ${(entryTime.getTime() - lastEntryTime.getTime()) / (1000 * 60 * 60)} hours`, 'BillingBlockService');
      }
      
      this.addEntryToBillingBlock(entry, isFirstEntry);
      this.updateProjectStats(entry);
      
      lastEntryTime = entryTime;
      isFirstEntry = false;
    }

    return this.generateBillingBlockSummary();
  }

  /**
   * Add a usage entry to the appropriate billing block
   */
  private addEntryToBillingBlock(entry: UsageEntry, isFirstEntry: boolean = false): void {
    const timestamp = new Date(entry.timestamp);
    const blockStart = getBillingBlockStart(timestamp, isFirstEntry);
    const blockId = generateBillingBlockId(blockStart);

    let billingBlock = this.billingBlocks.get(blockId);
    
    if (!billingBlock) {
      billingBlock = this.createBillingBlock(blockStart);
      this.billingBlocks.set(blockId, billingBlock);
    }

    // Add entry to block
    billingBlock.usageEntries.push(entry.id || entry.timestamp);
    
    // Update block totals
    const tokenBreakdown = extractTokenBreakdown(entry);
    const totalCost = this.calculateTokenBreakdownCost(tokenBreakdown);
    
    billingBlock.totalCost += totalCost;
    billingBlock.totalTokens.input += tokenBreakdown.input.count;
    billingBlock.totalTokens.output += tokenBreakdown.output.count;
    billingBlock.totalTokens.cacheCreation += tokenBreakdown.cacheCreation.count;
    billingBlock.totalTokens.cacheRead += tokenBreakdown.cacheRead.count;

    // Update burn rate and projections
    this.updateBillingBlockMetrics(billingBlock);
  }

  /**
   * Create a new billing block
   */
  private createBillingBlock(blockStart: Date): BillingBlock {
    const blockEnd = getBillingBlockEnd(blockStart);
    const now = new Date();
    const isActive = now >= blockStart && now < blockEnd;

    return {
      id: generateBillingBlockId(blockStart),
      startTime: blockStart,
      endTime: blockEnd,
      isActive,
      totalCost: 0,
      totalTokens: {
        input: 0,
        output: 0,
        cacheCreation: 0,
        cacheRead: 0
      },
      burnRate: {
        tokensPerMinute: 0,
        costPerMinute: 0
      },
      projectedCost: 0,
      remainingTimeMinutes: isActive ? getRemainingTimeMinutes(blockEnd) : 0,
      usageEntries: []
    };
  }

  /**
   * Update billing block metrics (burn rate, projections)
   */
  private updateBillingBlockMetrics(block: BillingBlock): void {
    const now = new Date();
    const elapsedMs = Math.max(0, now.getTime() - block.startTime.getTime());
    const elapsedMinutes = elapsedMs / (1000 * 60);
    
    if (elapsedMinutes > 0) {
      const totalTokens = block.totalTokens.input + block.totalTokens.output + 
                         block.totalTokens.cacheCreation + block.totalTokens.cacheRead;
      
      block.burnRate.tokensPerMinute = totalTokens / elapsedMinutes;
      block.burnRate.costPerMinute = block.totalCost / elapsedMinutes;
      
      if (block.isActive) {
        const remainingMinutes = getRemainingTimeMinutes(block.endTime);
        block.projectedCost = block.totalCost + (block.burnRate.costPerMinute * remainingMinutes);
        block.remainingTimeMinutes = remainingMinutes;
      } else {
        block.projectedCost = block.totalCost;
        block.remainingTimeMinutes = 0;
      }
    }
  }

  /**
   * Update project-level token statistics
   */
  private updateProjectStats(entry: UsageEntry): void {
    const projectId = entry.project_path || entry.id || 'unknown';
    const projectName = entry.project_path ? entry.project_path.split('/').pop() || 'Unknown Project' : 'Unknown Project';
    
    let stats = this.projectStats.get(projectId);
    if (!stats) {
      stats = {
        projectId,
        projectName,
        tokens: {
          input: { count: 0, cost: 0 },
          output: { count: 0, cost: 0 },
          cacheCreation: { count: 0, cost: 0 },
          cacheRead: { count: 0, cost: 0 }
        },
        cacheEfficiency: 0,
        contributionToCurrentBlock: 0
      };
      this.projectStats.set(projectId, stats);
    }

    const tokenBreakdown = extractTokenBreakdown(entry);
    
    // Accumulate token counts and costs
    stats.tokens.input.count += tokenBreakdown.input.count;
    stats.tokens.input.cost += tokenBreakdown.input.cost;
    stats.tokens.output.count += tokenBreakdown.output.count;
    stats.tokens.output.cost += tokenBreakdown.output.cost;
    stats.tokens.cacheCreation.count += tokenBreakdown.cacheCreation.count;
    stats.tokens.cacheCreation.cost += tokenBreakdown.cacheCreation.cost;
    stats.tokens.cacheRead.count += tokenBreakdown.cacheRead.count;
    stats.tokens.cacheRead.cost += tokenBreakdown.cacheRead.cost;

    // Update cache efficiency
    stats.cacheEfficiency = calculateCacheEfficiency(
      stats.tokens.cacheRead.count,
      stats.tokens.cacheCreation.count
    );
  }

  /**
   * Calculate total cost from token breakdown
   */
  private calculateTokenBreakdownCost(tokenBreakdown: TokenBreakdown): number {
    return tokenBreakdown.input.cost + 
           tokenBreakdown.output.cost + 
           tokenBreakdown.cacheCreation.cost + 
           tokenBreakdown.cacheRead.cost;
  }

  /**
   * Generate billing block summary
   */
  private generateBillingBlockSummary(): BillingBlockSummary {
    const blocks = Array.from(this.billingBlocks.values());
    const currentBlock = blocks.find(b => b.isActive) || null;
    const recentBlocks = blocks
      .filter(b => !b.isActive)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 10); // Last 10 blocks

    const totalCost = blocks.reduce((sum, block) => sum + block.totalCost, 0);
    const averageBlockCost = blocks.length > 0 ? totalCost / blocks.length : 0;
    
    const peakBurnRate = Math.max(
      ...blocks.map(b => b.burnRate.tokensPerMinute),
      0
    );

    // Update current block contribution percentages
    if (currentBlock) {
      this.updateCurrentBlockContributions(currentBlock);
    }

    log.info(`Processed ${blocks.length} billing blocks, current block: ${currentBlock?.isActive ? 'active' : 'none'}`, 'BillingBlockService');

    return {
      currentBlock,
      recentBlocks,
      totalBlocks: blocks.length,
      averageBlockCost,
      peakBurnRate
    };
  }

  /**
   * Update project contribution percentages for current block
   */
  private updateCurrentBlockContributions(currentBlock: BillingBlock): void {
    const currentBlockEntries = currentBlock.usageEntries;
    const projectContributions = new Map<string, number>();
    
    // Calculate each project's cost contribution to current block
    for (const [projectId, stats] of this.projectStats) {
      // This is a simplified calculation - in real implementation,
      // we'd need to filter entries by current block timeframe
      const projectTotalCost = stats.tokens.input.cost + 
                              stats.tokens.output.cost + 
                              stats.tokens.cacheCreation.cost + 
                              stats.tokens.cacheRead.cost;
      
      const contribution = currentBlock.totalCost > 0 ? 
        (projectTotalCost / currentBlock.totalCost) * 100 : 0;
      
      stats.contributionToCurrentBlock = Math.round(contribution);
    }
  }

  /**
   * Get current billing block status
   */
  getCurrentBlockStatus() {
    const current = getCurrentBillingBlock();
    const existingBlock = Array.from(this.billingBlocks.values())
      .find(b => b.isActive && 
        b.startTime.getTime() === current.start.getTime());

    if (!existingBlock) {
      return {
        isActive: current.isActive,
        startTime: current.start,
        endTime: current.end,
        remainingMinutes: getRemainingTimeMinutes(current.end),
        burnRateStatus: {
          level: 'LOW' as const,
          tokensPerMinute: 0,
          costPerMinute: 0,
          projectedBlockCost: 0
        }
      };
    }

    const elapsedMs = Date.now() - existingBlock.startTime.getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);
    const totalTokens = existingBlock.totalTokens.input + existingBlock.totalTokens.output + 
                       existingBlock.totalTokens.cacheCreation + existingBlock.totalTokens.cacheRead;
    const nonCacheTokens = existingBlock.totalTokens.input + existingBlock.totalTokens.output;

    const burnRateStatus = calculateBurnRateStatus(
      totalTokens,
      nonCacheTokens,
      existingBlock.totalCost,
      elapsedMinutes,
      existingBlock.remainingTimeMinutes
    );

    return {
      isActive: existingBlock.isActive,
      startTime: existingBlock.startTime,
      endTime: existingBlock.endTime,
      remainingMinutes: existingBlock.remainingTimeMinutes,
      totalCost: existingBlock.totalCost,
      projectedCost: existingBlock.projectedCost,
      burnRateStatus,
      totalTokens: existingBlock.totalTokens
    };
  }

  /**
   * Get project token statistics
   */
  getProjectTokenStats(): ProjectTokenStats[] {
    return Array.from(this.projectStats.values());
  }
}

export const billingBlockService = new BillingBlockService();