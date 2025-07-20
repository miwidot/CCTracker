import React from 'react';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../../hooks/useChartTheme';

interface ParetoChartProps {
  data: Array<{
    name: string;
    cost: number;
    percentage?: number;
    cumulative?: number;
  }>;
  currencySymbol: string;
  isLoading?: boolean;
}

export const ParetoChart: React.FC<ParetoChartProps> = ({ data, currencySymbol, isLoading }) => {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();

  // Calculate cumulative percentages
  const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
  const processedData: Array<typeof data[0] & { percentage: number; cumulative: number }> = [];
  
  data.forEach((item, index) => {
    const percentage = (item.cost / totalCost) * 100;
    const previousCumulative = index > 0 ? processedData[index - 1].cumulative : 0;
    processedData.push({
      ...item,
      percentage,
      cumulative: previousCumulative + percentage,
    });
  });

  if (isLoading) {
    return (
      <div className="h-64 bg-[var(--bg-skeleton)] rounded animate-pulse" />
    );
  }

  if (processedData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
        {t('charts.noData')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis 
          dataKey="name" 
          stroke={chartTheme.axis}
          fontSize={12}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          yAxisId="left"
          stroke={chartTheme.axis}
          fontSize={12}
          tickFormatter={(value) => `${currencySymbol}${value.toFixed(0)}`}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          stroke={chartTheme.axis}
          fontSize={12}
          tickFormatter={(value) => `${value.toFixed(0)}%`}
          domain={[0, 100]}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload?.length) {
              const data = payload[0].payload;
              return (
                <div style={{
                  backgroundColor: chartTheme.tooltipBackground,
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  borderRadius: '8px',
                  padding: '12px',
                  color: chartTheme.text,
                }}>
                  <p className="font-medium mb-2">{label}</p>
                  <p className="text-sm">
                    {t('charts.cost')}: <span className="font-medium">{currencySymbol}{data.cost.toFixed(2)}</span>
                  </p>
                  <p className="text-sm">
                    {t('charts.percentage')}: <span className="font-medium">{data.percentage.toFixed(1)}%</span>
                  </p>
                  <p className="text-sm">
                    {t('charts.cumulative')}: <span className="font-medium">{data.cumulative.toFixed(1)}%</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar yAxisId="left" dataKey="cost" fill={chartTheme.primary} />
        <Line 
          yAxisId="right" 
          type="monotone" 
          dataKey="cumulative" 
          stroke={chartTheme.error}
          strokeWidth={2}
          dot={{ fill: chartTheme.error }}
        />
        <Legend />
      </ComposedChart>
    </ResponsiveContainer>
  );
};