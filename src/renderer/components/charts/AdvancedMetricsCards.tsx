import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UsersIcon,
  ChartPieIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon: IconComponent, 
  subtitle, 
  trend,
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="bg-[var(--bg-primary)] p-4 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
        <div className="space-y-2">
          <div className="h-4 bg-[var(--bg-skeleton)] rounded animate-pulse w-3/4" />
          <div className="h-6 bg-[var(--bg-skeleton)] rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-primary)] p-4 rounded-lg shadow-[var(--shadow-sm)] border border-[var(--border-color)] card theme-transition">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-sm mt-1 font-medium ${trend.isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
          <IconComponent className="h-6 w-6 text-[var(--text-accent)]" />
        </div>
      </div>
    </div>
  );
};

interface AdvancedMetricsCardsProps {
  data: {
    activeProjects: number;
    avgCostPerUser: number;
    totalMessages: number;
    topModelShare: {
      model: string;
      percentage: number;
    };
  };
  currencySymbol: string;
  isLoading?: boolean;
}

export const AdvancedMetricsCards: React.FC<AdvancedMetricsCardsProps> = ({ 
  data, 
  currencySymbol, 
  isLoading 
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title={t('metrics.activeProjects')}
        value={data.activeProjects}
        icon={UsersIcon}
        subtitle={t('metrics.inLastMonth')}
        isLoading={isLoading}
      />
      <MetricCard
        title={t('metrics.avgCostPerUser')}
        value={`${currencySymbol}${data.avgCostPerUser.toFixed(2)}`}
        icon={ArrowTrendingUpIcon}
        subtitle={t('metrics.meanValue')}
        isLoading={isLoading}
      />
      <MetricCard
        title={t('metrics.totalMessages')}
        value={data.totalMessages.toLocaleString()}
        icon={ChartPieIcon}
        subtitle={t('metrics.allTypes')}
        isLoading={isLoading}
      />
      <MetricCard
        title={t('metrics.topModelShare')}
        value={`${data.topModelShare.percentage.toFixed(0)}%`}
        icon={ClockIcon}
        subtitle={data.topModelShare.model}
        isLoading={isLoading}
      />
    </div>
  );
};