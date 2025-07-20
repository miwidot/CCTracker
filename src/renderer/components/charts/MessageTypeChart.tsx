import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useChartTheme } from '../../hooks/useChartTheme';

interface MessageTypeChartProps {
  data: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  isLoading?: boolean;
}

const COLORS = {
  human: '#3B82F6', // Blue
  assistant: '#F59E0B', // Orange  
  agent: '#10B981', // Green
  system: '#8B5CF6', // Purple
};

export const MessageTypeChart: React.FC<MessageTypeChartProps> = ({ data, isLoading }) => {
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
        {t('charts.noData')}
      </div>
    );
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="count"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.type as keyof typeof COLORS] ?? chartTheme.primary} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
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
                  <p className="font-medium mb-2 capitalize">{data.type}</p>
                  <p className="text-sm">
                    {t('charts.messages')}: <span className="font-medium">{data.count.toLocaleString()}</span>
                  </p>
                  <p className="text-sm">
                    {t('charts.percentage')}: <span className="font-medium">{data.percentage.toFixed(1)}%</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value) => (
            <span className="capitalize">{value}: {data.find(d => d.type === value)?.count.toLocaleString()}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};