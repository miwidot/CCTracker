import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from '../../hooks/useTranslation';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useCurrency } from '../../hooks/useCurrency';

interface PeriodData {
  period: string;
  currentCost: number;
  previousCost: number;
  currentTokens: number;
  previousTokens: number;
  currentSessions: number;
  previousSessions: number;
}

interface PeriodComparisonChartProps {
  data: PeriodData[];
  comparisonType: 'weekly' | 'monthly';
  isLoading?: boolean;
}

export const PeriodComparisonChart: React.FC<PeriodComparisonChartProps> = ({
  data,
  comparisonType,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--text-accent)]" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-[var(--text-secondary)]">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">
            {t('businessIntelligence.periodComparison.noData')}
          </div>
          <div className="text-sm">
            {t('businessIntelligence.periodComparison.noDataDesc')}
          </div>
        </div>
      </div>
    );
  }

  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('Cost')) {
      return [formatCurrency(value), name];
    }
    if (name.includes('Tokens')) {
      return [`${value.toLocaleString()}`, name];
    }
    return [value.toString(), name];
  };

  const getLabelKey = () => {
    return comparisonType === 'weekly' 
      ? 'businessIntelligence.periodComparison.week'
      : 'businessIntelligence.periodComparison.month';
  };

  const getCurrentLabel = () => {
    return comparisonType === 'weekly'
      ? t('businessIntelligence.periodComparison.thisWeek')
      : t('businessIntelligence.periodComparison.thisMonth');
  };

  const getPreviousLabel = () => {
    return comparisonType === 'weekly'
      ? t('businessIntelligence.periodComparison.lastWeek')
      : t('businessIntelligence.periodComparison.lastMonth');
  };

  // Calculate percentage changes for summary
  const calculateTotalChange = () => {
    const totalCurrent = data.reduce((sum, item) => sum + item.currentCost, 0);
    const totalPrevious = data.reduce((sum, item) => sum + item.previousCost, 0);
    
    if (totalPrevious === 0) return { change: 0, trend: 'stable' as const };
    
    const change = ((totalCurrent - totalPrevious) / totalPrevious) * 100;
    const trend = change > 5 ? 'increase' : change < -5 ? 'decrease' : 'stable';
    
    return { change, trend };
  };

  const totalChange = calculateTotalChange();

  return (
    <div>
      {/* Summary Header */}
      <div className="mb-4 p-4 bg-[var(--bg-tertiary)] rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">
              {t(getLabelKey())} {t('businessIntelligence.periodComparison.comparison')}
            </h4>
            <p className="text-sm text-[var(--text-secondary)]">
              {getCurrentLabel()} vs {getPreviousLabel()}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${
              totalChange.trend === 'increase' ? 'text-[var(--color-error)]' :
              totalChange.trend === 'decrease' ? 'text-[var(--color-success)]' :
              'text-[var(--text-primary)]'
            }`}>
              {totalChange.trend === 'increase' ? '↗' : totalChange.trend === 'decrease' ? '↘' : '→'} 
              {Math.abs(totalChange.change).toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {totalChange.trend === 'increase' 
                ? t('businessIntelligence.periodComparison.increased')
                : totalChange.trend === 'decrease'
                ? t('businessIntelligence.periodComparison.decreased')
                : t('businessIntelligence.periodComparison.stable')}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis 
            dataKey="period" 
            stroke={chartTheme.axis}
            fontSize={12}
          />
          <YAxis 
            stroke={chartTheme.axis}
            fontSize={12}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: chartTheme.tooltipBackground,
              border: `1px solid ${chartTheme.tooltipBorder}`,
              borderRadius: '8px',
              color: chartTheme.text,
            }}
            formatter={formatTooltipValue}
          />
          <Legend />
          <Bar 
            dataKey="currentCost" 
            name={getCurrentLabel()}
            fill={chartTheme.primary} 
            radius={[4, 4, 0, 0]} 
          />
          <Bar 
            dataKey="previousCost" 
            name={getPreviousLabel()}
            fill={chartTheme.getDataColor(5)} 
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {formatCurrency(data.reduce((sum, item) => sum + item.currentCost, 0))}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {getCurrentLabel()}
          </div>
        </div>
        <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {formatCurrency(data.reduce((sum, item) => sum + item.previousCost, 0))}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {getPreviousLabel()}
          </div>
        </div>
        <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className={`text-lg font-bold ${
            totalChange.change > 0 ? 'text-[var(--color-error)]' :
            totalChange.change < 0 ? 'text-[var(--color-success)]' :
            'text-[var(--text-primary)]'
          }`}>
            {totalChange.change > 0 ? '+' : ''}{totalChange.change.toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('businessIntelligence.periodComparison.change')}
          </div>
        </div>
      </div>
    </div>
  );
};