import { MODEL_PRICING } from '../../shared/constants';
import type { 
  UsageEntry, 
  ProjectAnalytics, 
  ModelEfficiency, 
  SessionStats,
  UsageTrend
} from '../../shared/types';

/**
 * Centralized Cost Calculator Service
 * 
 * Provides consistent cost calculations, metrics, and analytics across all components.
 * All cost-related math should go through this service to ensure consistency.
 */
export class CostCalculatorService {
  /**
   * Calculate cost for given token usage with specific model
   */
  static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      console.warn(`Unknown model for cost calculation: ${model}`);
      return 0;
    }

    const inputCost = inputTokens * pricing.input;
    const outputCost = outputTokens * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Calculate efficiency score on 0-10 scale (higher is better)
   * 
   * Based on cost per token compared to baseline efficient usage:
   * - 10: Extremely efficient (very low cost per token)
   * - 7-9: Good efficiency 
   * - 4-6: Average efficiency
   * - 1-3: Poor efficiency
   * - 0: Very poor efficiency
   */
  static calculateEfficiencyScore(totalCost: number, totalTokens: number): number {
    if (totalTokens === 0 || totalCost === 0) {
      return 0;
    }

    // Cost per token
    const costPerToken = totalCost / totalTokens;
    
    // Baseline: Claude 3.5 Sonnet average cost per token
    // (Assuming 60% input, 40% output ratio)
    const baselineInputPrice = MODEL_PRICING['claude-3-5-sonnet-20241022']?.input || 0.000003;
    const baselineOutputPrice = MODEL_PRICING['claude-3-5-sonnet-20241022']?.output || 0.000015;
    const baselineCostPerToken = (baselineInputPrice * 0.6) + (baselineOutputPrice * 0.4);
    
    // Calculate efficiency ratio (lower cost per token = higher efficiency)
    const efficiencyRatio = baselineCostPerToken / costPerToken;
    
    // Map to 0-10 scale with logarithmic scaling for better distribution
    let score: number;
    if (efficiencyRatio >= 2.0) {
      score = 10; // Extremely efficient (less than half baseline cost)
    } else if (efficiencyRatio >= 1.5) {
      score = 8 + (efficiencyRatio - 1.5) * 4; // 8-10 range
    } else if (efficiencyRatio >= 1.0) {
      score = 6 + (efficiencyRatio - 1.0) * 4; // 6-8 range  
    } else if (efficiencyRatio >= 0.5) {
      score = 3 + (efficiencyRatio - 0.5) * 6; // 3-6 range
    } else if (efficiencyRatio >= 0.25) {
      score = 1 + (efficiencyRatio - 0.25) * 8; // 1-3 range
    } else {
      score = Math.max(0, efficiencyRatio * 4); // 0-1 range
    }
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Calculate cost trend from time-series data
   */
  static calculateCostTrend(
    recentCost: number, 
    previousCost: number, 
    threshold: number = 0.1
  ): 'increasing' | 'decreasing' | 'stable' {
    if (previousCost === 0) {
      return 'stable';
    }
    
    const change = (recentCost - previousCost) / previousCost;
    
    if (change > threshold) return 'increasing';
    if (change < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate project analytics with consistent methodology
   */
  static calculateProjectAnalytics(
    projectName: string, 
    entries: UsageEntry[]
  ): ProjectAnalytics {
    if (entries.length === 0) {
      return {
        project_name: projectName,
        project_path: '',
        total_cost: 0,
        total_tokens: 0,
        total_sessions: 0,
        session_count: 0,
        average_cost_per_session: 0,
        most_used_model: 'Unknown',
        first_activity: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        cost_trend: 'stable',
        efficiency_score: 0
      };
    }

    // Basic aggregations
    const totalCost = entries.reduce((sum, entry) => sum + entry.cost_usd, 0);
    const totalTokens = entries.reduce((sum, entry) => sum + entry.total_tokens, 0);
    
    // Session counting
    const uniqueSessions = new Set(
      entries
        .map(e => e.session_id)
        .filter(Boolean)
    ).size;
    
    const averageCostPerSession = uniqueSessions > 0 ? totalCost / uniqueSessions : 0;

    // Most used model
    const modelCounts = new Map<string, number>();
    entries.forEach(entry => {
      modelCounts.set(entry.model, (modelCounts.get(entry.model) || 0) + 1);
    });
    const mostUsedModel = Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    // Time range
    const timestamps = entries.map(e => new Date(e.timestamp).getTime()).sort();
    const firstActivity = new Date(timestamps[0]).toISOString();
    const lastActivity = new Date(timestamps[timestamps.length - 1]).toISOString();

    // Cost trend calculation (last 7 days vs previous 7 days)
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);

    const recentEntries = entries.filter(e => new Date(e.timestamp).getTime() > sevenDaysAgo);
    const previousEntries = entries.filter(e => {
      const time = new Date(e.timestamp).getTime();
      return time > fourteenDaysAgo && time <= sevenDaysAgo;
    });

    const recentCost = recentEntries.reduce((sum, e) => sum + e.cost_usd, 0);
    const previousCost = previousEntries.reduce((sum, e) => sum + e.cost_usd, 0);
    const costTrend = this.calculateCostTrend(recentCost, previousCost);

    // Efficiency score (0-10 scale)
    const efficiencyScore = this.calculateEfficiencyScore(totalCost, totalTokens);

    return {
      project_name: projectName,
      project_path: entries[0].project_path || '',
      total_cost: totalCost,
      total_tokens: totalTokens,
      total_sessions: uniqueSessions,
      session_count: uniqueSessions,
      average_cost_per_session: averageCostPerSession,
      most_used_model: mostUsedModel,
      first_activity: firstActivity,
      last_activity: lastActivity,
      cost_trend: costTrend,
      efficiency_score: efficiencyScore
    };
  }

  /**
   * Calculate model efficiency metrics with consistent methodology
   */
  static calculateModelEfficiency(entries: UsageEntry[]): ModelEfficiency[] {
    const modelGroups = new Map<string, UsageEntry[]>();
    
    // Group entries by model
    entries.forEach(entry => {
      if (!modelGroups.has(entry.model)) {
        modelGroups.set(entry.model, []);
      }
      modelGroups.get(entry.model)!.push(entry);
    });

    const efficiency: ModelEfficiency[] = [];

    for (const [model, modelEntries] of modelGroups.entries()) {
      const totalCost = modelEntries.reduce((sum, entry) => sum + entry.cost_usd, 0);
      const totalTokens = modelEntries.reduce((sum, entry) => sum + entry.total_tokens, 0);
      const usageCount = modelEntries.length;
      
      const costPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;
      const averageTokensPerMessage = usageCount > 0 ? totalTokens / usageCount : 0;
      
      // Efficiency score (0-10 scale where higher is better)
      const efficiencyScore = this.calculateEfficiencyScore(totalCost, totalTokens);
      
      efficiency.push({
        model,
        costPerToken,
        averageTokensPerMessage,
        totalCost,
        totalTokens,
        usageCount,
        efficiency_score: efficiencyScore
      });
    }

    // Sort by efficiency score (best first)
    return efficiency.sort((a, b) => b.efficiency_score - a.efficiency_score);
  }

  /**
   * Calculate session statistics with consistent methodology
   */
  static calculateSessionStats(sessionId: string, entries: UsageEntry[]): SessionStats {
    if (entries.length === 0) {
      return {
        session_id: sessionId,
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        total_cost: 0,
        total_tokens: 0,
        message_count: 0,
        model: 'Unknown'
      };
    }

    const timestamps = entries.map(e => new Date(e.timestamp).getTime()).sort();
    const totalCost = entries.reduce((sum, entry) => sum + entry.cost_usd, 0);
    const totalTokens = entries.reduce((sum, entry) => sum + entry.total_tokens, 0);
    
    // Get most used model in session
    const modelCounts = new Map<string, number>();
    entries.forEach(entry => {
      modelCounts.set(entry.model, (modelCounts.get(entry.model) || 0) + 1);
    });
    const model = Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    return {
      session_id: sessionId,
      start_time: new Date(timestamps[0]).toISOString(),
      end_time: new Date(timestamps[timestamps.length - 1]).toISOString(),
      total_cost: totalCost,
      total_tokens: totalTokens,
      message_count: entries.length,
      model: model
    };
  }

  /**
   * Calculate usage trends with consistent methodology
   */
  static calculateUsageTrends(
    entries: UsageEntry[], 
    granularity: 'daily' | 'weekly' | 'monthly'
  ): UsageTrend[] {
    if (entries.length === 0) {
      return [];
    }

    // Group entries by time period
    const periodGroups = new Map<string, UsageEntry[]>();
    
    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      let periodKey: string;

      switch (granularity) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          periodKey = date.toISOString().split('T')[0];
      }

      if (!periodGroups.has(periodKey)) {
        periodGroups.set(periodKey, []);
      }
      periodGroups.get(periodKey)!.push(entry);
    });

    // Calculate trends with growth rates
    const sortedPeriods = Array.from(periodGroups.keys()).sort();
    const trends: UsageTrend[] = [];

    sortedPeriods.forEach((period, index) => {
      const periodEntries = periodGroups.get(period)!;
      const cost = periodEntries.reduce((sum, entry) => sum + entry.cost_usd, 0);
      const tokens = periodEntries.reduce((sum, entry) => sum + entry.total_tokens, 0);
      const sessions = new Set(periodEntries.map(e => e.session_id).filter(Boolean)).size;

      // Calculate growth rate compared to previous period
      let growthRate = 0;
      if (index > 0) {
        const prevPeriod = trends[index - 1];
        if (prevPeriod.cost > 0) {
          growthRate = ((cost - prevPeriod.cost) / prevPeriod.cost) * 100;
        }
      }

      trends.push({
        period,
        cost,
        tokens,
        sessions,
        growth_rate: growthRate
      });
    });

    return trends;
  }

  /**
   * Validate cost calculation with detailed breakdown
   */
  static validateCostCalculation(
    model: string, 
    inputTokens: number, 
    outputTokens: number,
    expectedCost?: number
  ): {
    calculated_cost: number;
    input_cost: number;
    output_cost: number;
    pricing_used: { input: number; output: number };
    is_valid: boolean;
    validation_message: string;
  } {
    const pricing = MODEL_PRICING[model];
    
    if (!pricing) {
      return {
        calculated_cost: 0,
        input_cost: 0,
        output_cost: 0,
        pricing_used: { input: 0, output: 0 },
        is_valid: false,
        validation_message: `Unknown model: ${model}`
      };
    }

    const inputCost = inputTokens * pricing.input;
    const outputCost = outputTokens * pricing.output;
    const calculatedCost = inputCost + outputCost;
    
    let isValid = true;
    let validationMessage = 'Cost calculation valid';
    
    if (expectedCost !== undefined) {
      const difference = Math.abs(calculatedCost - expectedCost);
      const tolerance = Math.max(0.0001, expectedCost * 0.01); // 1% tolerance or $0.0001
      
      if (difference > tolerance) {
        isValid = false;
        validationMessage = `Cost mismatch: expected ${expectedCost}, calculated ${calculatedCost}`;
      }
    }

    return {
      calculated_cost: calculatedCost,
      input_cost: inputCost,
      output_cost: outputCost,
      pricing_used: { input: pricing.input, output: pricing.output },
      is_valid: isValid,
      validation_message: validationMessage
    };
  }
}

export default CostCalculatorService;