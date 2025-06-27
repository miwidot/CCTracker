import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  BoltIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import type { BusinessIntelligence, ModelEfficiency, UsageAnomaly } from '@shared/types';

interface BIMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

const BIMetricCard: React.FC<BIMetricCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle, 
  color = 'blue' 
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up': return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      case 'stable': return <MinusIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color]} transition-all hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className="h-8 w-8" />
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className="text-sm font-medium">{trend.value.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface ModelEfficiencyTableProps {
  models: ModelEfficiency[];
}

const ModelEfficiencyTable: React.FC<ModelEfficiencyTableProps> = ({ models }) => (
  <div className="bg-white rounded-lg shadow-sm border">
    <div className="p-6 border-b">
      <h3 className="text-lg font-semibold flex items-center">
        <CpuChipIcon className="h-5 w-5 mr-2" />
        Model Efficiency Ranking
      </h3>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Token</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Count</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency Score</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {models.slice(0, 10).map((model, index) => (
            <tr key={model.model} className={index < 3 ? 'bg-green-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  index === 0 ? 'bg-gold text-yellow-800' : 
                  index === 1 ? 'bg-gray-200 text-gray-800' :
                  index === 2 ? 'bg-orange-200 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  #{index + 1}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {model.model}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${(model.costPerToken * 1000000).toFixed(2)}/M
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${model.totalCost.toFixed(4)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {model.usageCount.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {model.efficiency_score.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

interface AnomalyAlertsProps {
  anomalies: UsageAnomaly[];
}

const AnomalyAlerts: React.FC<AnomalyAlertsProps> = ({ anomalies }) => {
  const severityColors = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-500" />
          Recent Anomalies ({anomalies.length})
        </h3>
      </div>
      <div className="p-6">
        {anomalies.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No anomalies detected in your usage patterns</p>
        ) : (
          <div className="space-y-3">
            {anomalies.slice(0, 5).map((anomaly, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${severityColors[anomaly.severity]}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold uppercase">
                        {anomaly.severity} • {anomaly.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(anomaly.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{anomaly.description}</p>
                    <p className="text-xs mt-1 text-gray-600">
                      Deviation: {anomaly.deviation_percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const BusinessIntelligenceDashboard: React.FC = () => {
  const [biData, setBiData] = useState<BusinessIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBusinessIntelligence();
  }, []);

  const loadBusinessIntelligence = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.electronAPI.getBusinessIntelligence();
      setBiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business intelligence');
      console.error('Failed to load BI data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportBusinessReport = async () => {
    if (!biData) return;
    
    try {
      const result = await window.electronAPI.exportBusinessReport(biData);
      console.log('Business report exported:', result);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to export business report:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating Business Intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">{error}</p>
          <button
            onClick={loadBusinessIntelligence}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!biData) return null;

  // Prepare chart data
  const trendsChartData = biData.trends.daily.slice(-30).map(trend => ({
    date: new Date(trend.period).toLocaleDateString(),
    cost: trend.cost,
    tokens: trend.tokens / 1000, // Convert to thousands
    growth: trend.growth_rate,
  }));

  const modelEfficiencyChartData = biData.model_efficiency.slice(0, 6).map(model => ({
    name: model.model.replace('claude-', '').replace('-20240229', '').replace('-20241022', ''),
    efficiency: model.efficiency_score,
    cost: model.totalCost,
    usage: model.usageCount,
  }));

  const usagePatternData = [
    { time: 'Morning', usage: biData.usage_patterns.morning, period: '6AM-12PM' },
    { time: 'Afternoon', usage: biData.usage_patterns.afternoon, period: '12PM-6PM' },
    { time: 'Evening', usage: biData.usage_patterns.evening, period: '6PM-12AM' },
    { time: 'Night', usage: biData.usage_patterns.night, period: '12AM-6AM' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <BoltIcon className="h-8 w-8 mr-3 text-blue-600" />
                Business Intelligence
              </h1>
              <p className="text-gray-600 mt-1">
                Advanced analytics and insights for your Claude API usage
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadBusinessIntelligence}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <BoltIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={exportBusinessReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <BIMetricCard
            title="Total Cost"
            value={`$${biData.total_cost.toFixed(4)}`}
            icon={CurrencyDollarIcon}
            color="green"
          />
          <BIMetricCard
            title="Cost Burn Rate"
            value={`$${biData.cost_burn_rate.toFixed(4)}/hr`}
            icon={ClockIcon}
            subtitle="Current spending rate"
            color="blue"
          />
          <BIMetricCard
            title="Model Diversity"
            value={biData.model_diversity}
            icon={CpuChipIcon}
            subtitle="Different models used"
            color="purple"
          />
          <BIMetricCard
            title="Data Quality"
            value={`${biData.data_quality_score.toFixed(1)}%`}
            icon={ChartBarIcon}
            color="green"
          />
        </div>

        {/* Predictions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <BIMetricCard
            title="Predicted Monthly Cost"
            value={`$${biData.predictions.predicted_monthly_cost.toFixed(2)}`}
            icon={SparklesIcon}
            subtitle={`${biData.predictions.confidence_level.toFixed(1)}% confidence`}
            trend={{
              value: biData.predictions.cost_trend === 'increasing' ? 15 : 
                     biData.predictions.cost_trend === 'decreasing' ? -10 : 0,
              direction: biData.predictions.cost_trend === 'increasing' ? 'up' : 
                        biData.predictions.cost_trend === 'decreasing' ? 'down' : 'stable'
            }}
            color={biData.predictions.budget_risk.level === 'high' ? 'red' : 
                   biData.predictions.budget_risk.level === 'medium' ? 'yellow' : 'green'}
          />
          <BIMetricCard
            title="Next Week Forecast"
            value={`$${biData.predictions.next_week_forecast.cost.toFixed(2)}`}
            icon={CalendarDaysIcon}
            subtitle={`${(biData.predictions.next_week_forecast.tokens / 1000).toFixed(0)}K tokens`}
            color="blue"
          />
          <BIMetricCard
            title="Budget Risk"
            value={biData.predictions.budget_risk.level.toUpperCase()}
            icon={ExclamationTriangleIcon}
            subtitle={biData.predictions.budget_risk.projected_overage > 0 ? 
              `$${biData.predictions.budget_risk.projected_overage.toFixed(2)} overage` : 'On track'}
            color={biData.predictions.budget_risk.level === 'high' ? 'red' : 
                   biData.predictions.budget_risk.level === 'medium' ? 'yellow' : 'green'}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cost Trends Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
              Cost Trends (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'cost' ? `$${Number(value).toFixed(4)}` : `${Number(value).toFixed(0)}K`,
                  name === 'cost' ? 'Cost' : 'Tokens'
                ]} />
                <Area type="monotone" dataKey="cost" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Usage Patterns */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Usage Patterns by Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usagePatternData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} sessions`, 'Usage']} />
                <Bar dataKey="usage" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Efficiency and Anomalies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ModelEfficiencyTable models={biData.model_efficiency} />
          <AnomalyAlerts anomalies={biData.anomalies} />
        </div>

        {/* Usage Insights */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BoltIcon className="h-5 w-5 mr-2" />
            Key Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Usage Patterns</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Most efficient model: <strong>{biData.most_efficient_model}</strong></li>
                <li>• Peak usage hours: <strong>{biData.peak_usage_hours.join(', ')}</strong></li>
                <li>• Busiest day: <strong>{biData.busiest_day_of_week}</strong></li>
                <li>• Session efficiency: <strong>{biData.session_efficiency.toFixed(0)} tokens/session</strong></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Processing speed: <strong>{biData.tokens_per_hour.toFixed(0)} tokens/hour</strong></li>
                <li>• Data analyzed: <strong>{biData.data_points_analyzed.toLocaleString()} entries</strong></li>
                <li>• Analysis time: <strong>{biData.calculation_time_ms.toFixed(0)}ms</strong></li>
                <li>• Cost efficiency: <strong>${(biData.cost_per_token * 1000000).toFixed(2)}/M tokens</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

