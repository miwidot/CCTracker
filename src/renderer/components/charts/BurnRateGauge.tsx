import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from '../../hooks/useTranslation';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useCurrency } from '../../hooks/useCurrency';

interface BurnRateGaugeProps {
  currentBurnRate: number; // Current hourly burn rate
  budgetLimit?: number; // Monthly budget limit (optional)
  isLoading?: boolean;
}

export const BurnRateGauge: React.FC<BurnRateGaugeProps> = ({
  currentBurnRate,
  budgetLimit,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--text-accent)]" />
      </div>
    );
  }

  // Calculate monthly projection from hourly rate
  const monthlyProjection = currentBurnRate * 24 * 30; // 30 days
  
  // Determine gauge zones and current status
  const getGaugeData = () => {
    if (!budgetLimit || budgetLimit === 0) {
      // No budget limit - show simple burn rate visualization
      return {
        data: [
          { name: 'Current', value: 70, color: chartTheme.primary },
          { name: 'Remaining', value: 30, color: chartTheme.getDataColor(9) }
        ],
        status: 'normal' as const,
        percentage: 70
      };
    }

    const percentage = Math.min((monthlyProjection / budgetLimit) * 100, 100);
    
    let status: 'safe' | 'warning' | 'danger' = 'safe';
    let color = chartTheme.success;
    
    if (percentage >= 90) {
      status = 'danger';
      color = chartTheme.error;
    } else if (percentage >= 75) {
      status = 'warning';
      color = chartTheme.warning;
    }

    return {
      data: [
        { name: 'Used', value: percentage, color },
        { name: 'Available', value: Math.max(100 - percentage, 0), color: chartTheme.getDataColor(9) }
      ],
      status,
      percentage
    };
  };

  const gaugeData = getGaugeData();

  const getStatusText = () => {
    switch (gaugeData.status) {
      case 'danger':
        return t('businessIntelligence.burnRate.danger');
      case 'warning':
        return t('businessIntelligence.burnRate.warning');
      default:
        return t('businessIntelligence.burnRate.safe');
    }
  };

  const getStatusColor = () => {
    switch (gaugeData.status) {
      case 'danger':
        return 'text-[var(--color-error)]';
      case 'warning':
        return 'text-[var(--color-warning)]';
      default:
        return 'text-[var(--color-success)]';
    }
  };

  return (
    <div className="relative">
      {/* Gauge Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={gaugeData.data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {gaugeData.data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: chartTheme.tooltipBackground,
              border: `1px solid ${chartTheme.tooltipBorder}`,
              borderRadius: '8px',
              color: chartTheme.text,
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, t('businessIntelligence.burnRate.usage')]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Information */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-center mt-8">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(currentBurnRate)}/h
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-1">
            {t('businessIntelligence.burnRate.current')}
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 text-center">
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        {budgetLimit && budgetLimit > 0 && (
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {t('businessIntelligence.burnRate.projection')}: {formatCurrency(monthlyProjection)}/month
            <br />
            {t('businessIntelligence.burnRate.budget')}: {formatCurrency(budgetLimit)}/month
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mt-4 text-center">
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {formatCurrency(currentBurnRate * 24)}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('businessIntelligence.burnRate.daily')}
          </div>
        </div>
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {formatCurrency(currentBurnRate * 24 * 7)}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t('businessIntelligence.burnRate.weekly')}
          </div>
        </div>
      </div>
    </div>
  );
};