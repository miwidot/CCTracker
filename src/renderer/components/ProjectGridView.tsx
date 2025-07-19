/**
 * Enhanced Project Grid View Component
 * Displays projects with rich cards, live indicators, and advanced filtering
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../hooks/useCurrency';
import { formatTokens } from '@shared/utils';
import type { ProjectAnalytics } from '@shared/types';
import type { BillingBlock } from '@shared/types/billing';
import {
  FolderOpenIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  FireIcon,
  SparklesIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format, differenceInMinutes } from 'date-fns';

interface ProjectGridViewProps {
  projects: ProjectAnalytics[];
  currentBlock?: BillingBlock;
  onProjectClick: (project: ProjectAnalytics) => void;
  className?: string;
}

type SortOption = 'name' | 'cost' | 'lastUsed' | 'efficiency' | 'burnRate';
type FilterOption = 'all' | 'active' | 'recent' | 'highCost';

interface EnhancedProject extends ProjectAnalytics {
  isActive: boolean;
  burnRate?: number;
  efficiency: number;
  recentActivity: 'active' | 'recent' | 'idle';
  percentageOfTotal: number;
  sessionsInCurrentBlock?: number;
  costInCurrentBlock?: number;
}

export const ProjectGridView: React.FC<ProjectGridViewProps> = ({
  projects,
  currentBlock,
  onProjectClick,
  className = '',
}) => {
  const { t } = useTranslation();
  const { formatCurrency, convertFromUSD } = useCurrency();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('cost');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showLiveMode, setShowLiveMode] = useState(false);

  // Calculate total cost across all projects
  const totalCost = useMemo(() => 
    projects.reduce((sum, p) => sum + p.total_cost, 0),
    [projects]
  );

  // Enhance projects with additional data
  const enhancedProjects = useMemo((): EnhancedProject[] => {
    return projects.map(project => {
      const lastUsedTime = new Date(project.last_used);
      const minutesSinceLastUse = differenceInMinutes(new Date(), lastUsedTime);
      
      // Determine activity status
      let recentActivity: 'active' | 'recent' | 'idle' = 'idle';
      let isActive = false;
      if (minutesSinceLastUse < 5) {
        recentActivity = 'active';
        isActive = true;
      } else if (minutesSinceLastUse < 60) {
        recentActivity = 'recent';
      }

      // Calculate efficiency (cost per 1000 tokens)
      const efficiency = project.total_tokens > 0 
        ? (project.total_cost / project.total_tokens) * 1000 
        : 0;

      // Calculate percentage of total cost
      const percentageOfTotal = totalCost > 0 
        ? (project.total_cost / totalCost) * 100 
        : 0;

      // Calculate burn rate for active projects (tokens per minute)
      let burnRate: number | undefined;
      if (isActive && project.session_count > 0) {
        // Simplified burn rate calculation
        const avgSessionDuration = 30; // minutes, would need real data
        burnRate = project.total_tokens / (project.session_count * avgSessionDuration);
      }

      return {
        ...project,
        isActive,
        burnRate,
        efficiency,
        recentActivity,
        percentageOfTotal,
        sessionsInCurrentBlock: 0, // Would need real data
        costInCurrentBlock: 0, // Would need real data
      };
    });
  }, [projects, totalCost]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = enhancedProjects;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.project_path.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply activity filter
    switch (filterBy) {
      case 'active':
        filtered = filtered.filter(p => p.recentActivity === 'active');
        break;
      case 'recent':
        filtered = filtered.filter(p => p.recentActivity !== 'idle');
        break;
      case 'highCost':
        filtered = filtered.filter(p => p.percentageOfTotal > 10);
        break;
    }

    return filtered;
  }, [enhancedProjects, searchQuery, filterBy]);

  // Sort projects
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects];
    
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.project_name.localeCompare(b.project_name));
        break;
      case 'cost':
        sorted.sort((a, b) => b.total_cost - a.total_cost);
        break;
      case 'lastUsed':
        sorted.sort((a, b) => 
          new Date(b.last_used).getTime() - new Date(a.last_used).getTime()
        );
        break;
      case 'efficiency':
        sorted.sort((a, b) => a.efficiency - b.efficiency);
        break;
      case 'burnRate':
        sorted.sort((a, b) => (b.burnRate ?? 0) - (a.burnRate ?? 0));
        break;
    }

    return sorted;
  }, [filteredProjects, sortBy]);

  // Auto-refresh for live mode
  useEffect(() => {
    if (!showLiveMode) return;

    const interval = setInterval(() => {
      // Trigger data refresh here
      // console.log('Refreshing project data...');
    }, 5000);

    return () => clearInterval(interval);
  }, [showLiveMode]);

  const _getActivityColor = (activity: 'active' | 'recent' | 'idle') => {
    switch (activity) {
      case 'active': return 'text-green-500';
      case 'recent': return 'text-yellow-500';
      case 'idle': return 'text-gray-400';
    }
  };

  const getActivityIcon = (activity: 'active' | 'recent' | 'idle') => {
    switch (activity) {
      case 'active': return '🟢';
      case 'recent': return '🟡';
      case 'idle': return '⚪';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency < 0.01) return 'text-green-600';
    if (efficiency < 0.03) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('projects.searchPlaceholder', 'Search projects...')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters and controls */}
          <div className="flex items-center gap-4">
            {/* Filter dropdown */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">{t('projects.filterAll', 'All Projects')}</option>
                <option value="active">{t('projects.filterActive', 'Active Only')}</option>
                <option value="recent">{t('projects.filterRecent', 'Recent Activity')}</option>
                <option value="highCost">{t('projects.filterHighCost', 'High Cost (>10%)')}</option>
              </select>
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <ArrowsUpDownIcon className="h-5 w-5 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="cost">{t('projects.sortByCost', 'Cost')}</option>
                <option value="name">{t('projects.sortByName', 'Name')}</option>
                <option value="lastUsed">{t('projects.sortByLastUsed', 'Last Used')}</option>
                <option value="efficiency">{t('projects.sortByEfficiency', 'Efficiency')}</option>
                <option value="burnRate">{t('projects.sortByBurnRate', 'Burn Rate')}</option>
              </select>
            </div>

            {/* Live mode toggle */}
            <button
              onClick={() => setShowLiveMode(!showLiveMode)}
              className={`px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                showLiveMode 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FireIcon className={`h-4 w-4 ${showLiveMode ? 'animate-pulse' : ''}`} />
              {t('projects.liveMode', 'Live')}
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="mt-4 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <span>{t('projects.totalProjects', '{{count}} projects', { count: sortedProjects.length })}</span>
          <span>{t('projects.totalCost', 'Total: {{cost}}', { cost: formatCurrency(convertFromUSD(totalCost)) })}</span>
          {currentBlock && (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {t('projects.currentBlock', 'Current block: {{remaining}}', { 
                remaining: `${Math.floor(currentBlock.remainingTimeMinutes / 60)}h ${currentBlock.remainingTimeMinutes % 60}m`
              })}
            </span>
          )}
        </div>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedProjects.map((project) => (
          <div
            key={project.project_path}
            onClick={() => onProjectClick(project)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
                     hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 
                     transition-all cursor-pointer group"
          >
            {/* Card header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <FolderOpenIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {project.project_name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {project.project_path}
                    </p>
                  </div>
                </div>
                <span className="text-lg" title={project.recentActivity}>
                  {getActivityIcon(project.recentActivity)}
                </span>
              </div>
            </div>

            {/* Card body */}
            <div className="p-4 space-y-3">
              {/* Cost and percentage */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(convertFromUSD(project.total_cost))}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {project.percentageOfTotal.toFixed(1)}% of total
                  </div>
                </div>
                {project.isActive && project.burnRate !== undefined && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-orange-500">
                      <FireIcon className="h-4 w-4 animate-pulse" />
                      <span className="text-sm font-medium">
                        {formatTokens(Math.round(project.burnRate))}/min
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">burn rate</div>
                  </div>
                )}
              </div>

              {/* Efficiency indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t('projects.efficiency', 'Efficiency')}
                  </span>
                </div>
                <span className={`text-sm font-medium ${getEfficiencyColor(project.efficiency)}`}>
                  ${project.efficiency.toFixed(3)}/1K
                </span>
              </div>

              {/* Sessions and last used */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{project.session_count} sessions</span>
                <span>{format(new Date(project.last_used), 'MMM dd, HH:mm')}</span>
              </div>

              {/* Mini activity chart (placeholder) */}
              <div className="h-8 flex items-end gap-0.5">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-t"
                    style={{ 
                      height: `${Math.random() * 100}%`,
                      opacity: 0.3 + (i * 0.1)
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Current block indicator */}
            {currentBlock && project.isActive && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-700 dark:text-blue-300">
                    Active in current block
                  </span>
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    {formatCurrency(convertFromUSD(project.costInCurrentBlock ?? 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {sortedProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery || filterBy !== 'all' 
              ? t('projects.noMatchingProjects', 'No projects match your criteria')
              : t('projects.noProjects', 'No projects found')
            }
          </p>
        </div>
      )}
    </div>
  );
};