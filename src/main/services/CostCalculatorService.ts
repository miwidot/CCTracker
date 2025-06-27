import { MODEL_PRICING } from '../../shared/constants';
import type { 
  UsageEntry, 
  ProjectAnalytics, 
  ModelEfficiency, 
  SessionStats,
  UsageTrend,
  CurrencyRates
} from '../../shared/types';

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  MYR: 'RM',
};

// Claude 4 pricing constants (per million tokens) - matching original Rust implementation
const PRICING_CONSTANTS = {
  'claude-opus-4-20250514': {
    input: 15.0,
    output: 75.0,
    cache_write: 18.75,
    cache_read: 1.50,
  },
  'claude-sonnet-4-20250514': {
    input: 3.0,
    output: 15.0,
    cache_write: 3.75,
    cache_read: 0.30,
  },
  // Also support the model names as they appear in JSONL
  'claude-opus-4': {
    input: 15.0,
    output: 75.0,
    cache_write: 18.75,
    cache_read: 1.50,
  },
  'claude-sonnet-4': {
    input: 3.0,
    output: 15.0,
    cache_write: 3.75,
    cache_read: 0.30,
  }
};

/**
 * Centralized Cost Calculator Service
 * 
 * Provides consistent cost calculations, metrics, analytics, and currency conversion across all components.
 * All cost-related math should go through this service to ensure consistency.
 * 
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for all calculations. Do not duplicate math logic elsewhere.
 */
export class CostCalculatorService {
  private static currencyRates: CurrencyRates | null = null;
  
  /**
   * Set currency exchange rates for conversions
   */
  static setCurrencyRates(rates: CurrencyRates): void {
    this.currencyRates = rates;
  }
  
  /**
   * Convert USD amount to target currency
   */
  static convertFromUSD(usdAmount: number, targetCurrency: string): number {
    if (!this.currencyRates || targetCurrency === 'USD') {
      return usdAmount;
    }
    
    const rate = this.currencyRates[targetCurrency as keyof CurrencyRates];
    return rate ? usdAmount * rate : usdAmount;
  }
  
  /**
   * Format currency amount with proper symbol and decimals
   */
  static formatCurrency(amount: number, currency: string, decimals: number = 2): string {
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    
    // Japanese Yen and Chinese Yuan don't use decimal places
    if (currency === 'JPY' || currency === 'CNY') {
      return `${symbol}${Math.round(amount).toLocaleString()}`;
    }
    
    return `${symbol}${amount.toFixed(decimals)}`;
  }
  
  /**
   * Get currency symbol for given currency code
   */
  static getCurrencySymbol(currency: string): string {
    return CURRENCY_SYMBOLS[currency] || '$';
  }
  /**
   * Calculate cost for given token usage with specific model (matches original Rust implementation)
   */
  static calculateCost(
    model: string, 
    inputTokens: number, 
    outputTokens: number,
    cacheCreationTokens: number = 0,
    cacheReadTokens: number = 0
  ): number {
    // First try the enhanced pricing constants for Claude 4 models
    let pricing = null;
    
    if (model.includes('opus-4') || model.includes('claude-opus-4')) {
      pricing = PRICING_CONSTANTS['claude-opus-4'];
    } else if (model.includes('sonnet-4') || model.includes('claude-sonnet-4')) {
      pricing = PRICING_CONSTANTS['claude-sonnet-4'];
    } else {
      // Fall back to MODEL_PRICING for other models
      const fallbackPricing = MODEL_PRICING[model];
      if (!fallbackPricing) {
        // Skip logging for synthetic/test models that don't have real pricing
        if (!model.includes('<synthetic>')) {
          console.warn(`Unknown model for cost calculation: ${model}`);
        }
        return 0;
      }
      // Convert to per-million pricing for consistency
      return (inputTokens * fallbackPricing.input) + (outputTokens * fallbackPricing.output);
    }

    // Calculate cost (prices are per million tokens) - matching Rust implementation
    const cost = (inputTokens * pricing.input / 1_000_000.0)
      + (outputTokens * pricing.output / 1_000_000.0)
      + (cacheCreationTokens * pricing.cache_write / 1_000_000.0)
      + (cacheReadTokens * pricing.cache_read / 1_000_000.0);

    return cost;
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
   * Calculate project analytics (matching original Rust ProjectUsage structure)
   */
  static calculateProjectAnalytics(
    projectName: string, 
    entries: UsageEntry[]
  ): ProjectAnalytics {
    if (entries.length === 0) {
      return {
        project_path: '',
        project_name: projectName,
        total_cost: 0,
        total_tokens: 0,
        session_count: 0,
        last_used: new Date().toISOString()
      };
    }

    // Calculate totals (matching original Rust implementation)
    let totalCost = 0;
    let totalTokens = 0;
    let lastUsed = '';

    for (const entry of entries) {
      totalCost += entry.cost_usd;
      // Include ALL token types like original Rust implementation
      totalTokens += entry.input_tokens + entry.output_tokens;
      
      // TODO: Add cache tokens when we update UsageEntry to include them
      // totalTokens += entry.cache_creation_tokens + entry.cache_read_tokens;
      
      if (entry.timestamp > lastUsed) {
        lastUsed = entry.timestamp;
      }
    }

    // Count unique sessions by session_id (matching original Rust logic)
    const uniqueSessionIds = new Set(
      entries
        .map(entry => entry.session_id || entry.conversation_id || entry.id)
        .filter(Boolean)
    );
    const sessionCount = uniqueSessionIds.size;

    return {
      project_path: entries[0].project_path || '',
      project_name: projectName,
      total_cost: totalCost,
      total_tokens: totalTokens,
      session_count: sessionCount,
      last_used: lastUsed
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
        case 'weekly': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        }
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

  /**
   * Calculate dashboard overview metrics with trends
   */
  static calculateDashboardMetrics(
    currentPeriodData: UsageEntry[],
    previousPeriodData: UsageEntry[]
  ): {
    totalCost: number;
    totalTokens: number;
    sessionsCount: number;
    avgCostPerSession: number;
    costTrend: number;
    tokenTrend: number;
  } {
    // Current period calculations
    const totalCost = currentPeriodData.reduce((sum, entry) => sum + entry.cost_usd, 0);
    const totalTokens = currentPeriodData.reduce((sum, entry) => sum + entry.total_tokens, 0);
    const sessionsCount = new Set(currentPeriodData.map(e => e.session_id).filter(Boolean)).size;
    const avgCostPerSession = sessionsCount > 0 ? totalCost / sessionsCount : 0;

    // Previous period calculations for trends
    const previousTotalCost = previousPeriodData.reduce((sum, entry) => sum + entry.cost_usd, 0);
    const previousTotalTokens = previousPeriodData.reduce((sum, entry) => sum + entry.total_tokens, 0);

    // Calculate trends (percentage change)
    const costTrend = previousTotalCost > 0 ? ((totalCost - previousTotalCost) / previousTotalCost) * 100 : 0;
    const tokenTrend = previousTotalTokens > 0 ? ((totalTokens - previousTotalTokens) / previousTotalTokens) * 100 : 0;

    return {
      totalCost,
      totalTokens,
      sessionsCount,
      avgCostPerSession,
      costTrend,
      tokenTrend
    };
  }

  /**
   * Calculate total cost from usage entries with optional currency conversion
   */
  static calculateTotalCost(entries: UsageEntry[], targetCurrency?: string): number {
    const totalUSD = entries.reduce((sum, entry) => sum + entry.cost_usd, 0);
    return targetCurrency ? this.convertFromUSD(totalUSD, targetCurrency) : totalUSD;
  }
  
  /**
   * Calculate dashboard metrics with currency conversion
   */
  static calculateDashboardMetricsWithCurrency(
    currentPeriodData: UsageEntry[],
    previousPeriodData: UsageEntry[],
    targetCurrency: string = 'USD'
  ): {
    totalCost: number;
    totalTokens: number;
    sessionsCount: number;
    avgCostPerSession: number;
    costTrend: number;
    tokenTrend: number;
    formattedTotalCost: string;
    formattedAvgCost: string;
  } {
    // Calculate metrics in USD first
    const metrics = this.calculateDashboardMetrics(currentPeriodData, previousPeriodData);
    
    // Convert costs to target currency
    const totalCost = this.convertFromUSD(metrics.totalCost, targetCurrency);
    const avgCostPerSession = this.convertFromUSD(metrics.avgCostPerSession, targetCurrency);
    
    return {
      ...metrics,
      totalCost,
      avgCostPerSession,
      formattedTotalCost: this.formatCurrency(totalCost, targetCurrency),
      formattedAvgCost: this.formatCurrency(avgCostPerSession, targetCurrency, 4),
    };
  }
  
  /**
   * Calculate project costs by name with currency conversion
   */
  static calculateProjectCostsByName(
    entries: UsageEntry[], 
    targetCurrency: string = 'USD'
  ): Record<string, { costUSD: number; costConverted: number; formatted: string }> {
    // Group by project name and calculate USD totals first
    const projectCostsUSD = entries.reduce((acc, entry) => {
      const projectName = entry.project_path?.split('/').pop() || 'Unknown';
      acc[projectName] = (acc[projectName] || 0) + entry.cost_usd;
      return acc;
    }, {} as Record<string, number>);
    
    // Convert all USD amounts to target currency
    const result: Record<string, { costUSD: number; costConverted: number; formatted: string }> = {};
    
    for (const [projectName, costUSD] of Object.entries(projectCostsUSD)) {
      const costConverted = this.convertFromUSD(costUSD, targetCurrency);
      result[projectName] = {
        costUSD,
        costConverted,
        formatted: this.formatCurrency(costConverted, targetCurrency, 3)
      };
    }
    
    return result;
  }
  
  /**
   * Add new currencies easily - just add to this list
   */
  static addNewCurrency(currencyCode: string, symbol: string): void {
    CURRENCY_SYMBOLS[currencyCode] = symbol;
  }

  /**
   * Calculate cost breakdown by model
   */
  static calculateModelBreakdown(entries: UsageEntry[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    entries.forEach(entry => {
      if (!breakdown[entry.model]) {
        breakdown[entry.model] = 0;
      }
      breakdown[entry.model] += entry.cost_usd;
    });

    return breakdown;
  }

  /**
   * Calculate predictive analytics with centralized methodology
   */
  static calculatePredictiveAnalytics(recentEntries: UsageEntry[]): {
    predictedMonthlyCost: number;
    predictedMonthlyTokens: number;
    costTrend: 'increasing' | 'decreasing' | 'stable';
    confidenceLevel: number;
    nextWeekCost: number;
    nextWeekTokens: number;
    budgetRisk: 'low' | 'medium' | 'high';
    projectedOverage: number;
  } {
    if (recentEntries.length === 0) {
      return {
        predictedMonthlyCost: 0,
        predictedMonthlyTokens: 0,
        costTrend: 'stable',
        confidenceLevel: 0,
        nextWeekCost: 0,
        nextWeekTokens: 0,
        budgetRisk: 'low',
        projectedOverage: 0
      };
    }

    // Group by day and calculate daily averages
    const dailyData = new Map<string, { cost: number; tokens: number }>();
    
    recentEntries.forEach(entry => {
      const date = entry.timestamp.split('T')[0]; // Get date part only
      if (!dailyData.has(date)) {
        dailyData.set(date, { cost: 0, tokens: 0 });
      }
      const dayData = dailyData.get(date)!;
      dayData.cost += entry.cost_usd;
      dayData.tokens += entry.total_tokens;
    });

    const dailyCosts = Array.from(dailyData.values()).map(d => d.cost);
    const dailyTokens = Array.from(dailyData.values()).map(d => d.tokens);
    
    if (dailyCosts.length === 0) {
      return {
        predictedMonthlyCost: 0,
        predictedMonthlyTokens: 0,
        costTrend: 'stable',
        confidenceLevel: 0,
        nextWeekCost: 0,
        nextWeekTokens: 0,
        budgetRisk: 'low',
        projectedOverage: 0
      };
    }

    const avgDailyCost = dailyCosts.reduce((sum, cost) => sum + cost, 0) / dailyCosts.length;
    const avgDailyTokens = dailyTokens.reduce((sum, tokens) => sum + tokens, 0) / dailyTokens.length;

    // Determine cost trend
    const getTrend = (values: number[]): 'increasing' | 'decreasing' | 'stable' => {
      if (values.length < 2) return 'stable';
      
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      if (changePercent > 10) return 'increasing';
      if (changePercent < -10) return 'decreasing';
      return 'stable';
    };

    const costTrend = getTrend(dailyCosts);
    
    // Apply trend multiplier for predictions
    let trendMultiplier = 1;
    if (costTrend === 'increasing') trendMultiplier = 1.2;
    else if (costTrend === 'decreasing') trendMultiplier = 0.8;
    
    const predictedMonthlyCost = avgDailyCost * 30 * trendMultiplier;
    const predictedMonthlyTokens = avgDailyTokens * 30 * trendMultiplier;
    
    // Next week forecast
    const nextWeekCost = avgDailyCost * 7 * trendMultiplier;
    const nextWeekTokens = avgDailyTokens * 7 * trendMultiplier;
    
    // Confidence level based on data consistency
    const costVariance = dailyCosts.reduce((acc, val) => acc + Math.pow(val - avgDailyCost, 2), 0) / dailyCosts.length;
    const confidenceLevel = Math.max(20, Math.min(95, 90 - (costVariance / avgDailyCost) * 100));
    
    // Budget risk assessment (assuming $100 monthly budget as baseline)
    const budgetThreshold = 100; // Default budget threshold
    const riskRatio = predictedMonthlyCost / budgetThreshold;
    
    let budgetRisk: 'low' | 'medium' | 'high';
    if (riskRatio < 0.7) budgetRisk = 'low';
    else if (riskRatio < 1.0) budgetRisk = 'medium';
    else budgetRisk = 'high';
    
    const projectedOverage = Math.max(0, predictedMonthlyCost - budgetThreshold);

    return {
      predictedMonthlyCost,
      predictedMonthlyTokens,
      costTrend,
      confidenceLevel,
      nextWeekCost,
      nextWeekTokens,
      budgetRisk,
      projectedOverage
    };
  }
}

export default CostCalculatorService;