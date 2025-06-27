import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
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
import type { ProjectAnalytics, ProjectComparison } from '@shared/types';

interface ProjectCardProps {
  project: ProjectAnalytics;
  currency?: string;
  isLoading?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  currency = 'USD',
  isLoading = false 
}) => {
  const { convertFromUSD, formatCurrency, formatCurrencyDetailed } = useCurrency();
  const { formatDate } = useTimeFormat();
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  const costPerToken = project.total_tokens > 0 ? project.total_cost / project.total_tokens : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FolderIcon className="h-8 w-8 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {project.project_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {project.project_path}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('analytics.lastUsed')}</p>
          <p className="text-sm text-gray-900 dark:text-white">
            {formatDate(project.last_used)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('analytics.totalCost')}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrencyDetailed(project.total_cost, 4)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Tokens</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {project.total_tokens.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {project.session_count}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cost/Token</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrencyDetailed(costPerToken, 6)}
          </p>
        </div>
      </div>
    </div>
  );
};

export const SimpleUsageAnalytics: React.FC = () => {
  const { settings } = useSettings();
  const { convertFromUSD, formatCurrency, formatCurrencyDetailed } = useCurrency();
  const { t } = useTranslation();
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
      console.error('Failed to load project analytics:', err);
      setError('Failed to load project analytics data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const chartData = useMemo(() => {
    if (!projects.length) return [];
    
    return projects.slice(0, 10).map(project => ({
      name: project.project_name.length > 15 
        ? project.project_name.substring(0, 15) + '...' 
        : project.project_name,
      fullName: project.project_name,
      cost: project.total_cost,
      tokens: project.total_tokens,
      sessions: project.session_count
    }));
  }, [projects]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('analytics.errorLoading')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadProjectData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('analytics.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('analytics.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Project-level cost breakdown and analysis (All Time Data)
              </p>
              <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  📅 <strong>Data Period:</strong> This page shows cumulative data for all projects across your entire usage history. 
                  For date-specific analysis, use the Usage Dashboard with date range filters.
                </p>
              </div>
            </div>
            <button
              onClick={loadProjectData}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        {comparison && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <FolderIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {comparison.total_projects}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Most Expensive</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {comparison.most_expensive_project}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <CpuChipIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Most Efficient</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {comparison.most_efficient_project}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('analytics.totalCost')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(projects.reduce((sum, p) => sum + p.total_cost, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Cost Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('analytics.projectCostBreakdown')}
          </h3>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    name === 'cost' ? formatCurrencyDetailed(value, 4) : value,
                    name === 'cost' ? 'Cost' : 'Sessions'
                  ]}
                  labelFormatter={(label) => {
                    const item = chartData.find(d => d.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Bar dataKey="cost" fill="#3b82f6" name="cost" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Projects Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            All Projects ({projects.length})
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <ProjectCard 
                  key={i}
                  project={{} as ProjectAnalytics}
                  currency={settings.currency}
                  isLoading={true}
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Projects Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Start using Claude CLI in projects to see analytics here
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