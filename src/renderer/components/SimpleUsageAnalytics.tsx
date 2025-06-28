import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FolderIcon,
  CurrencyDollarIcon,
  CpuChipIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import { useCurrency } from '../hooks/useCurrency';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { useTranslation } from '../hooks/useTranslation';
import { useChartTheme } from '../hooks/useChartTheme';
import type { ProjectAnalytics, ProjectComparison } from '@shared/types';
import { log } from '@shared/utils/logger';

interface ProjectCardProps {
  project: ProjectAnalytics;
  currency?: string;
  isLoading?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  currency: _currency = 'USD',
  isLoading = false 
}) => {
  const { formatCurrencyDetailed } = useCurrency();
  const { formatDate } = useTimeFormat();
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow-sm)] p-6 animate-pulse">
        <div className="h-4 bg-[var(--bg-skeleton)] rounded w-3/4 mb-4" />
        <div className="space-y-3">
          <div className="h-3 bg-[var(--bg-skeleton)] rounded" />
          <div className="h-3 bg-[var(--bg-skeleton)] rounded w-5/6" />
          <div className="h-3 bg-[var(--bg-skeleton)] rounded w-4/6" />
        </div>
      </div>
    );
  }

  const costPerToken = project.total_tokens > 0 ? project.total_cost / project.total_tokens : 0;

  return (
    <div className="card interactive bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] theme-transition p-4 border border-[var(--border-color)]">
      <div className="flex items-start justify-between mb-4 min-h-[60px]">
        <div className="flex items-center space-x-3">
          <FolderIcon className="h-8 w-8 text-[var(--color-primary)]" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
              {project.project_name}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] truncate">
              {project.project_path.split('/').pop() || project.project_path}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <p className="text-xs text-[var(--text-secondary)] whitespace-nowrap">{t('analytics.lastUsed')}</p>
          <p className="text-sm text-[var(--text-primary)] whitespace-nowrap">
            {formatDate(project.last_used)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 mt-4">
        <div className="text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-1">{t('analytics.totalCost')}</p>
          <p className="text-lg font-bold text-[var(--text-primary)] break-all">
            {formatCurrencyDetailed(project.total_cost, 2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-1">{t('analytics.totalTokens')}</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {project.total_tokens.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-1">{t('analytics.sessions')}</p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {project.session_count}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-secondary)] mb-1">{t('analytics.costPerToken')}</p>
          <p className="text-lg font-semibold text-[var(--text-primary)] break-all">
            {formatCurrencyDetailed(costPerToken, 4)}
          </p>
        </div>
      </div>
    </div>
  );
};

export const SimpleUsageAnalytics: React.FC = () => {
  const { settings } = useSettings();
  const { formatCurrencyDetailed } = useCurrency();
  const { t } = useTranslation();
  const chartTheme = useChartTheme();
  // Chart CSS variables available if needed
  // const chartCSSVars = getChartCSSVariables();
  const [projects, setProjects] = useState<ProjectAnalytics[]>([]);
  const [comparison, setComparison] = useState<ProjectComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjectData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [projectsData, comparisonData] = await Promise.all([
        window.electronAPI.getProjectBreakdown(),
        window.electronAPI.getProjectComparison()
      ]);
      
      setProjects(projectsData);
      setComparison(comparisonData);
    } catch (err) {
      log.component.error('SimpleUsageAnalytics', err as Error);
      setError(t('analytics.errorMessage'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadProjectData();
  }, [loadProjectData]);

  const chartData = useMemo(() => {
    if (!projects.length) return [];
    
    return projects.slice(0, 10).map(project => ({
      name: project.project_name.length > 15 
        ? `${project.project_name.substring(0, 15)  }...` 
        : project.project_name,
      fullName: project.project_name,
      cost: project.total_cost,
      tokens: project.total_tokens,
      sessions: project.session_count
    }));
  }, [projects]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-12 w-12 text-[var(--text-error)] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              {t('analytics.errorLoading')}
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">{error}</p>
            <button
              onClick={() => void loadProjectData()}
              className="btn btn-primary interactive-scale px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary)]/80 theme-transition"
            >
              {t('analytics.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                {t('analytics.title')}
              </h1>
              <p className="text-[var(--text-secondary)] mt-2">
                {t('analytics.subtitle')}
              </p>
              <div className="mt-3 px-3 py-2 bg-[var(--bg-info)] border border-[var(--border-color)] rounded-lg">
                <p className="text-sm text-[var(--text-accent)]">
                  📅 <strong>{t('analytics.dataPeriod')}:</strong> {t('analytics.dataPeriodNote')}
                </p>
              </div>
            </div>
            <button
              onClick={() => void loadProjectData()}
              disabled={isLoading}
              className="btn btn-primary interactive-scale flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary)]/80 disabled:opacity-50 theme-transition"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{t('common.refresh')}</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        {comparison && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow-sm)] p-6 border border-[var(--border-color)]">
              <div className="flex items-center">
                <FolderIcon className="h-8 w-8 text-[var(--text-accent)]" />
                <div className="ml-4">
                  <p className="text-sm text-[var(--text-secondary)]">{t('analytics.totalProjects')}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {comparison.total_projects}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow-sm)] p-6 border border-[var(--border-color)]">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-[var(--text-success)]" />
                <div className="ml-4">
                  <p className="text-sm text-[var(--text-secondary)]">{t('analytics.mostExpensive')}</p>
                  <p className="text-lg font-bold text-[var(--text-primary)] truncate">
                    {comparison.most_expensive_project}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow-sm)] p-6 border border-[var(--border-color)]">
              <div className="flex items-center">
                <CpuChipIcon className="h-8 w-8 text-[var(--text-accent)]" />
                <div className="ml-4">
                  <p className="text-sm text-[var(--text-secondary)]">{t('analytics.mostEfficient')}</p>
                  <p className="text-lg font-bold text-[var(--text-primary)] truncate">
                    {comparison.most_efficient_project}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow-sm)] p-6 border border-[var(--border-color)]">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-[var(--text-warning)]" />
                <div className="ml-4">
                  <p className="text-sm text-[var(--text-secondary)]">{t('analytics.totalCost')}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrencyDetailed(projects.reduce((sum, p) => sum + p.total_cost, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Cost Chart */}
        <div className="bg-[var(--bg-primary)] rounded-lg shadow-[var(--shadow-sm)] p-6 mb-8 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {t('analytics.projectCostBreakdown')}
          </h3>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--text-accent)]" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis 
                  dataKey="name" 
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke={chartTheme.axis}
                  tick={{ fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBackground,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    borderRadius: '8px',
                    color: chartTheme.text,
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'cost' ? formatCurrencyDetailed(value, 4) : value.toString(),
                    name === 'cost' ? t('businessIntelligence.cost') : t('analytics.sessions')
                  ]}
                  labelFormatter={(label) => {
                    const item = chartData.find(d => d.name === label);
                    return item?.fullName ?? label;
                  }}
                />
                <Bar dataKey="cost" fill={chartTheme.primary} name="cost" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Projects Grid */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
            {t('analytics.allProjects')} ({projects.length})
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <ProjectCard 
                  key={`loading-project-${i}`}
                  project={{} as ProjectAnalytics}
                  currency={settings.currency}
                  isLoading
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                {t('analytics.noProjects')}
              </h3>
              <p className="text-[var(--text-secondary)]">
                {t('analytics.noProjectsMessage')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.project_name}
                  project={project}
                  currency={settings.currency}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleUsageAnalytics;