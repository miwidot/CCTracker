# CostCalculatorService - Centralized Cost Calculation

## Overview

The `CostCalculatorService` provides centralized, consistent cost calculations across all CCTracker components. This service eliminates calculation inconsistencies and ensures all pages display the same metrics.

## Problem Solved

**Before**: Multiple scattered calculation methods with inconsistent logic:
- Project Analytics: Efficiency score = `(cost/tokens) * 1000000` (cost per million tokens)
- Model Efficiency: Efficiency score = `costPerToken * 1000000 + (1/usageCount) * 0.1` (complex formula)
- UI Components: Expected 0-10 scale efficiency scores but received cost per million tokens

**After**: Single source of truth with consistent methodology across all components.

## Key Features

### 1. **Consistent Efficiency Scoring (0-10 Scale)**
- **0**: Very poor efficiency (high cost per token)
- **3-6**: Average efficiency 
- **7-9**: Good efficiency
- **10**: Extremely efficient (very low cost per token)

```typescript
// Uses baseline Claude 3.5 Sonnet cost as reference
const score = CostCalculatorService.calculateEfficiencyScore(totalCost, totalTokens);
```

### 2. **Accurate Cost Calculation**
```typescript
// Validates against Claude API pricing
const cost = CostCalculatorService.calculateCost(model, inputTokens, outputTokens);
```

### 3. **Standardized Project Analytics**
```typescript
// Complete project metrics with consistent efficiency scoring
const analytics = CostCalculatorService.calculateProjectAnalytics(projectName, entries);
```

### 4. **Unified Trend Analysis**
```typescript
// Consistent trend calculation for all time periods
const trends = CostCalculatorService.calculateUsageTrends(entries, 'daily');
```

## Methods

### Core Calculations

#### `calculateCost(model, inputTokens, outputTokens)`
- **Purpose**: Calculate exact cost using Claude API pricing
- **Returns**: Cost in USD
- **Validation**: Includes price validation and error detection

#### `calculateEfficiencyScore(totalCost, totalTokens)`
- **Purpose**: Convert cost per token to 0-10 efficiency scale
- **Algorithm**: Logarithmic scaling compared to Claude 3.5 Sonnet baseline
- **Returns**: Score from 0 (poor) to 10 (excellent)

#### `calculateCostTrend(recentCost, previousCost, threshold)`
- **Purpose**: Determine cost trend direction
- **Returns**: 'increasing' | 'decreasing' | 'stable'
- **Threshold**: Default 10% change required for trend detection

### Advanced Analytics

#### `calculateProjectAnalytics(projectName, entries)`
- **Purpose**: Complete project metrics calculation
- **Includes**: Cost, tokens, sessions, efficiency, trends, models
- **Returns**: Standardized `ProjectAnalytics` object

#### `calculateModelEfficiency(entries)`
- **Purpose**: Model performance comparison
- **Includes**: Cost per token, efficiency scoring, usage statistics
- **Returns**: Array sorted by efficiency (best first)

#### `calculateUsageTrends(entries, granularity)`
- **Purpose**: Time-series trend analysis
- **Granularity**: 'daily' | 'weekly' | 'monthly'
- **Returns**: Trends with growth rates

### Utility Methods

#### `validateCostCalculation(model, inputTokens, outputTokens, expectedCost)`
- **Purpose**: Validate cost calculations with detailed breakdown
- **Returns**: Validation result with detailed analysis
- **Use Case**: Debugging cost discrepancies

## Integration

### Service Usage
```typescript
import CostCalculatorService from './CostCalculatorService';

// In UsageService.ts
const analytics = CostCalculatorService.calculateProjectAnalytics(projectName, entries);
const efficiency = CostCalculatorService.calculateModelEfficiency(allEntries);
const trends = CostCalculatorService.calculateUsageTrends(entries, 'daily');
```

### Deprecated Methods
The following methods in `UsageService` now delegate to `CostCalculatorService`:
- `calculateCost()` → `CostCalculatorService.calculateCost()`
- `generateUsageTrends()` → `CostCalculatorService.calculateUsageTrends()`

## Benefits

### ✅ **Consistency**
- All components use identical calculation logic
- UI displays match backend calculations
- Efficiency scores are always on 0-10 scale

### ✅ **Accuracy**
- Single source of truth for pricing
- Validated calculations with error detection
- Proper handling of edge cases

### ✅ **Maintainability**
- Centralized logic easier to update
- Single place to fix calculation bugs
- Clear separation of concerns

### ✅ **Testability**
- Isolated calculation logic
- Comprehensive validation methods
- Easy to unit test

## Examples

### Before (Inconsistent)
```typescript
// Project Analytics - Cost per million tokens
const efficiencyScore = totalTokens > 0 ? (totalCost / totalTokens) * 1000000 : 0;

// Model Efficiency - Complex formula  
const efficiencyScore = costPerToken * 1000000 + (1 / usageCount) * 0.1;

// UI - Expected 0-10 scale but received cost per million
{project.efficiency_score.toFixed(1)}/10  // Shows "1532.4/10" instead of "6.2/10"
```

### After (Consistent)
```typescript
// All components use same calculation
const efficiencyScore = CostCalculatorService.calculateEfficiencyScore(totalCost, totalTokens);

// UI correctly displays 0-10 scale
{project.efficiency_score.toFixed(1)}/10  // Shows "7.3/10" correctly
```

## Issue Resolution

### Fixed: 53K USD Cost Anomaly
- **Problem**: Predictions used historical totals instead of recent data
- **Solution**: Centralized calculator filters to recent 30-day windows
- **Result**: Accurate monthly projections (~$60-300 vs $53,000)

### Fixed: Efficiency Score Mismatch
- **Problem**: Backend calculated cost per million tokens, UI expected 0-10 scale
- **Solution**: Standardized 0-10 efficiency scoring algorithm
- **Result**: Consistent efficiency displays across all components

### Fixed: Calculation Inconsistencies
- **Problem**: Different logic in project analytics vs model efficiency
- **Solution**: Single calculation service with standardized methods
- **Result**: All pages show identical metrics for same data

## Future Enhancements

1. **Cache Optimization**: Add calculation caching for large datasets
2. **Custom Baselines**: Allow user-defined efficiency baselines
3. **Advanced Metrics**: Add more sophisticated efficiency algorithms
4. **Real-time Validation**: Continuous validation against Claude API changes
5. **Performance Monitoring**: Track calculation performance and accuracy

## Testing

The service includes comprehensive validation methods:
- Cost calculation accuracy verification
- Efficiency score boundary testing
- Trend analysis validation
- Edge case handling (zero costs, empty datasets)

This centralized approach ensures CCTracker provides consistent, accurate cost analysis across all features.