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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  FolderIcon,
  CurrencyDollarIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ChartBarIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import type { ProjectAnalytics, ProjectComparison, ProjectSession } from '@shared/types';

interface ProjectCardProps {
  project: ProjectAnalytics;
  onViewSessions?: (projectName: string) => void;
  currency?: string;
  isLoading?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onViewSessions, 
  currency = 'USD',
  isLoading = false 
}) => {
  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return 'text-red-600';
      case 'decreasing':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

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
        <div className={`flex items-center space-x-1 ${getTrendColor(project.cost_trend)}`}>
          {getTrendIcon(project.cost_trend)}
          <span className="text-sm font-medium capitalize">{project.cost_trend}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {currency === 'USD' ? '$' : currency + ' '}{project.total_cost.toFixed(4)}
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
            {project.total_sessions}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg/Session</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {currency === 'USD' ? '$' : currency + ' '}{project.average_cost_per_session.toFixed(4)}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500 dark:text-gray-400">Efficiency Score</span>
          <span className="text-gray-900 dark:text-white">{project.efficiency_score.toFixed(1)}/10</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              project.efficiency_score >= 7 ? 'bg-green-500' :
              project.efficiency_score >= 4 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${(project.efficiency_score / 10) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        <p>Most used: <span className="font-medium">{project.most_used_model}</span></p>
        <p>
          Activity: {format(new Date(project.first_activity), 'MMM dd')} - {format(new Date(project.last_activity), 'MMM dd')}
        </p>
      </div>

      {onViewSessions && (
        <button
          onClick={() => onViewSessions(project.project_name)}
          className="w-full mt-2 px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          View Sessions
        </button>
      )}
    </div>
  );
};

interface ProjectSessionTableProps {
  sessions: ProjectSession[];
  currency: string;
  isLoading?: boolean;
}

const ProjectSessionTable: React.FC<ProjectSessionTableProps> = ({ 
  sessions, 
  currency,
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No sessions found for this project</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Project Sessions ({sessions.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tokens
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Models
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Efficiency
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sessions.map((session) => {
              const duration = new Date(session.end_time).getTime() - new Date(session.start_time).getTime();
              const durationMinutes = Math.round(duration / (1000 * 60));
              
              return (
                <tr key={session.session_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div>
                      <p className="font-medium truncate max-w-xs">{session.session_id}</p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {format(new Date(session.start_time), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {durationMinutes}m
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {session.message_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {session.total_tokens.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {currency === 'USD' ? '$' : currency + ' '}{session.total_cost.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex flex-wrap gap-1">
                      {session.models_used.slice(0, 2).map((model, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
                        >
                          {model.replace('claude-', '')}
                        </span>
                      ))}
                      {session.models_used.length > 2 && (
                        <span className="text-xs text-gray-400">+{session.models_used.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      session.efficiency >= 7 ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                      session.efficiency >= 4 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    }`}>
                      {session.efficiency.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const UsageAnalyticsDashboard: React.FC = () => {
  const { settings } = useSettings();
  const [projects, setProjects] = useState<ProjectAnalytics[]>([]);
  const [comparison, setComparison] = useState<ProjectComparison | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectSessions, setProjectSessions] = useState<ProjectSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
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

  const loadProjectSessions = useCallback(async (projectName: string) => {
    try {
      setIsLoadingSessions(true);
      setSelectedProject(projectName);
      
      const sessions = await window.electronAPI.getProjectSessions(projectName);
      setProjectSessions(sessions);
    } catch (err) {
      console.error('Failed to load project sessions:', err);
      setError('Failed to load project sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const chartData = useMemo(() => {
    if (!comparison || !projects.length) return [];
    
    return projects.slice(0, 10).map(project => ({
      name: project.project_name.length > 15 
        ? project.project_name.substring(0, 15) + '...' 
        : project.project_name,
      fullName: project.project_name,
      cost: project.total_cost,
      tokens: project.total_tokens,
      sessions: project.total_sessions,
      efficiency: project.efficiency_score
    }));
  }, [projects, comparison]);

  const costDistributionData = useMemo(() => {
    if (!comparison) return [];
    
    return comparison.cost_distribution.slice(0, 8).map((item, index) => ({
      ...item,
      color: `hsl(${(index * 360) / comparison.cost_distribution.length}, 70%, 60%)`
    }));
  }, [comparison]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Analytics
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadProjectData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
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
                Usage Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Project-level cost breakdown and analysis
              </p>
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
                <ChartBarIcon className="h-8 w-8 text-purple-500" />
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {comparison.activity_timeline[comparison.activity_timeline.length - 1]?.projects_active || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Project Cost Breakdown Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Project Cost Breakdown
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
                      name === 'cost' ? `$${value.toFixed(4)}` : value,
                      name === 'cost' ? 'Cost' : 'Tokens'
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

          {/* Cost Distribution Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Cost Distribution
            </h3>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="cost"
                    label={({ project_name, percentage }) => `${project_name}: ${percentage.toFixed(1)}%`}
                  >
                    {costDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`$${value.toFixed(4)}`, 'Cost']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project Sessions Detail */}
        {selectedProject && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Sessions for "{selectedProject}"
              </h2>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
            <ProjectSessionTable 
              sessions={projectSessions} 
              currency={settings.currency}
              isLoading={isLoadingSessions}
            />
          </div>
        )}

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
                  onViewSessions={loadProjectSessions}
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

export default UsageAnalyticsDashboard;