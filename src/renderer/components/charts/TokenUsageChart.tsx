import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../../hooks/useChartTheme';
import { format } from 'date-fns';

interface TokenUsageChartProps {
  data: Array<{
    date: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  }>;
  isLoading?: boolean;
}

export const TokenUsageChart: React.FC<TokenUsageChartProps> = ({ data, isLoading }) => {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();

  if (isLoading) {
    return (
      <div className="h-64 bg-[var(--bg-skeleton)] rounded animate-pulse" />
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
        {t('charts.noTokenData')}
      </div>
    );
  }

  const formatTokens = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis 
          dataKey="date" 
          stroke={chartTheme.axis}
          fontSize={12}
          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
        />
        <YAxis 
          stroke={chartTheme.axis}
          fontSize={12}
          tickFormatter={formatTokens}
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
                  <p className="font-medium mb-2">{format(new Date(label), 'MMM dd, yyyy')}</p>
                  <p className="text-sm">
                    <span style={{ color: '#8B5CF6' }}>●</span> {t('metrics.inputTokens')}: <span className="font-medium">{data.inputTokens.toLocaleString()}</span>
                  </p>
                  <p className="text-sm">
                    <span style={{ color: '#10B981' }}>●</span> {t('metrics.outputTokens')}: <span className="font-medium">{data.outputTokens.toLocaleString()}</span>
                  </p>
                  <p className="text-sm">
                    <span style={{ color: '#3B82F6' }}>●</span> {t('metrics.cacheRead')}: <span className="font-medium">{data.cacheReadTokens.toLocaleString()}</span>
                  </p>
                  <p className="text-sm">
                    <span style={{ color: '#F59E0B' }}>●</span> {t('metrics.cacheWrite')}: <span className="font-medium">{data.cacheWriteTokens.toLocaleString()}</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="cacheReadTokens" 
          stackId="1"
          stroke="#3B82F6" 
          fill="#3B82F6"
          fillOpacity={0.6}
          name={t('metrics.cacheRead')}
        />
        <Area 
          type="monotone" 
          dataKey="cacheWriteTokens" 
          stackId="1"
          stroke="#F59E0B" 
          fill="#F59E0B"
          fillOpacity={0.6}
          name={t('metrics.cacheWrite')}
        />
        <Area 
          type="monotone" 
          dataKey="inputTokens" 
          stackId="1"
          stroke="#8B5CF6" 
          fill="#8B5CF6"
          fillOpacity={0.6}
          name={t('metrics.inputTokens')}
        />
        <Area 
          type="monotone" 
          dataKey="outputTokens" 
          stackId="1"
          stroke="#10B981" 
          fill="#10B981"
          fillOpacity={0.6}
          name={t('metrics.outputTokens')}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};