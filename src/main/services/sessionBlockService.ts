import type { ParsedUsageEntry } from '../../shared/types';
import type { SessionBlock } from '../../shared/burnRate';
import { MODEL_PRICING } from '../../shared/constants';
import { v4 as uuidv4 } from 'uuid';

export class SessionBlockService {
  private readonly blocks: Map<string, SessionBlock> = new Map();
  private readonly sessionGapThreshold: number;
  private readonly sessionBlockDuration: number;

  constructor(
    sessionGapThreshold: number = 5 * 60 * 60 * 1000, // 5 hours in ms
    sessionBlockDuration: number = 5 * 60 * 60 * 1000 // 5 hours in ms
  ) {
    this.sessionGapThreshold = sessionGapThreshold;
    this.sessionBlockDuration = sessionBlockDuration;
  }

  public processEntry(entry: ParsedUsageEntry): void {
    const activeBlock = this.findOrCreateActiveBlock(entry.project, entry.timestamp);
    this.addEntryToBlock(activeBlock, entry);
  }

  private findOrCreateActiveBlock(project: string, timestamp: Date): SessionBlock {
    // Find existing active block for this project
    for (const block of this.blocks.values()) {
      if (
        block.project === project &&
        block.isActive &&
        timestamp >= block.startTime &&
        timestamp <= block.endTime
      ) {
        return block;
      }
    }

    // Create new block if none found
    const newBlock: SessionBlock = {
      id: uuidv4(),
      project,
      startTime: timestamp,
      endTime: new Date(timestamp.getTime() + this.sessionBlockDuration),
      entries: [],
      tokenCounts: {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
      costUSD: 0,
      isActive: true,
    };

    this.blocks.set(newBlock.id, newBlock);
    return newBlock;
  }

  private addEntryToBlock(block: SessionBlock, entry: ParsedUsageEntry): void {
    // Add entry reference
    block.entries.push({
      timestamp: entry.timestamp,
      requestId: entry.requestId,
    });

    // Update token counts
    block.tokenCounts.inputTokens += entry.inputTokens;
    block.tokenCounts.outputTokens += entry.outputTokens;
    block.tokenCounts.cacheCreationTokens += entry.cacheCreationTokens || 0;
    block.tokenCounts.cacheReadTokens += entry.cacheReadTokens || 0;

    // Calculate cost for this entry
    const pricing = MODEL_PRICING[entry.model];
    if (pricing) {
      const cost = 
        (entry.inputTokens * pricing.input) +
        (entry.outputTokens * pricing.output) +
        ((entry.cacheCreationTokens || 0) * (pricing.cache_write || 0)) +
        ((entry.cacheReadTokens || 0) * (pricing.cache_read || 0));
      
      block.costUSD += cost;
    }

    // Sort entries by timestamp
    block.entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  public updateActiveBlocks(): void {
    const now = new Date();
    
    for (const block of this.blocks.values()) {
      if (block.isActive && now > block.endTime) {
        block.isActive = false;
      }
    }
  }

  public getActiveBlocks(): SessionBlock[] {
    this.updateActiveBlocks();
    return Array.from(this.blocks.values()).filter(block => block.isActive);
  }

  public getAllBlocks(): SessionBlock[] {
    return Array.from(this.blocks.values());
  }

  public getBlocksByProject(project: string): SessionBlock[] {
    return Array.from(this.blocks.values()).filter(block => block.project === project);
  }

  public clear(): void {
    this.blocks.clear();
  }

  public detectGaps(project: string): SessionBlock[] {
    const projectBlocks = this.getBlocksByProject(project)
      .filter(b => !b.isGap)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const gaps: SessionBlock[] = [];

    for (let i = 0; i < projectBlocks.length - 1; i++) {
      const currentBlock = projectBlocks[i];
      const nextBlock = projectBlocks[i + 1];
      
      const gapStart = currentBlock.endTime;
      const gapEnd = nextBlock.startTime;
      const gapDuration = gapEnd.getTime() - gapStart.getTime();

      if (gapDuration > this.sessionGapThreshold) {
        gaps.push({
          id: `gap-${uuidv4()}`,
          project,
          startTime: gapStart,
          endTime: gapEnd,
          entries: [],
          tokenCounts: {
            inputTokens: 0,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
          },
          costUSD: 0,
          isActive: false,
          isGap: true,
        });
      }
    }

    return gaps;
  }
}