import * as fs from 'fs/promises';
import * as path from 'path';
import { UsageEntry, SessionStats, DateRangeStats, CurrencyRates, BusinessIntelligence } from '../../shared/types';
import CostCalculatorService from './CostCalculatorService';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'pdf';
  includeHeaders?: boolean;
  includeSummary?: boolean;
  currency?: keyof CurrencyRates;
  dateFormat?: 'iso' | 'local' | 'short';
  groupBy?: 'none' | 'session' | 'model' | 'date';
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  content?: string;
  error?: string;
  stats: {
    totalEntries: number;
    totalCost: number;
    fileSize: number;
    exportTime: number;
  };
}

export class ExportService {
  private exportDir: string;

  constructor(exportDir: string = path.join(process.cwd(), 'exports')) {
    this.exportDir = exportDir;
    this.ensureExportDirectory();
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
      throw new Error(`Failed to create export directory: ${error}`);
    }
  }

  /**
   * Export usage data to various formats
   */
  async exportUsageData(
    data: UsageEntry[],
    options: ExportOptions = { format: 'csv' }
  ): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      let result: ExportResult;
      
      switch (options.format) {
        case 'csv':
          result = await this.exportToCSV(data, options);
          break;
        case 'json':
          result = await this.exportToJSON(data, options);
          break;
        case 'excel':
          result = await this.exportToExcel(data, options);
          break;
        case 'pdf':
          result = await this.exportToPDF(data, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      result.stats.exportTime = Date.now() - startTime;
      console.log(`Export completed in ${result.stats.exportTime}ms`);
      
      return result;
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
        stats: {
          totalEntries: data.length,
          totalCost: CostCalculatorService.calculateTotalCost(data),
          fileSize: 0,
          exportTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(data: UsageEntry[], options: ExportOptions): Promise<ExportResult> {
    try {
      const processedData = this.processDataForExport(data, options);
      let csvContent = '';

      // Add summary if requested
      if (options.includeSummary) {
        csvContent += this.generateCSVSummary(data);
        csvContent += '\n\n';
      }

      // Add headers
      if (options.includeHeaders !== false) {
        const headers = [
          'ID',
          'Timestamp',
          'Model',
          'Input Tokens',
          'Output Tokens',
          'Total Tokens',
          'Cost USD',
          'Session ID',
          'Project Path',
          'Conversation ID',
        ];
        csvContent += headers.join(',') + '\n';
      }

      // Add data rows
      for (const entry of processedData) {
        const row = [
          this.escapeCSV(entry.id),
          this.escapeCSV(this.formatDate(entry.timestamp, options.dateFormat)),
          this.escapeCSV(entry.model),
          entry.input_tokens.toString(),
          entry.output_tokens.toString(),
          entry.total_tokens.toString(),
          entry.cost_usd.toFixed(6),
          this.escapeCSV(entry.session_id || ''),
          this.escapeCSV(entry.project_path || ''),
          this.escapeCSV(entry.conversation_id || ''),
        ];
        csvContent += row.join(',') + '\n';
      }

      // Save to file
      const fileName = `usage_export_${this.getTimestamp()}.csv`;
      const filePath = path.join(this.exportDir, fileName);
      await fs.writeFile(filePath, csvContent, 'utf-8');

      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        content: csvContent,
        stats: {
          totalEntries: data.length,
          totalCost: CostCalculatorService.calculateTotalCost(data),
          fileSize: stats.size,
          exportTime: 0, // Will be set by caller
        },
      };
    } catch (error) {
      throw new Error(`CSV export failed: ${error}`);
    }
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(data: UsageEntry[], options: ExportOptions): Promise<ExportResult> {
    try {
      const processedData = this.processDataForExport(data, options);
      
      const exportData: any = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          format: 'json',
          totalEntries: data.length,
          totalCost: CostCalculatorService.calculateTotalCost(data),
          options,
        },
      };

      // Add summary if requested
      if (options.includeSummary) {
        exportData.summary = this.generateJSONSummary(data);
      }

      // Group data if requested
      if (options.groupBy && options.groupBy !== 'none') {
        exportData.data = this.groupData(processedData, options.groupBy);
      } else {
        exportData.data = processedData;
      }

      const jsonContent = JSON.stringify(exportData, null, 2);

      // Save to file
      const fileName = `usage_export_${this.getTimestamp()}.json`;
      const filePath = path.join(this.exportDir, fileName);
      await fs.writeFile(filePath, jsonContent, 'utf-8');

      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        content: jsonContent,
        stats: {
          totalEntries: data.length,
          totalCost: CostCalculatorService.calculateTotalCost(data),
          fileSize: stats.size,
          exportTime: 0,
        },
      };
    } catch (error) {
      throw new Error(`JSON export failed: ${error}`);
    }
  }

  /**
   * Export to Excel format (simplified implementation)
   */
  private async exportToExcel(data: UsageEntry[], options: ExportOptions): Promise<ExportResult> {
    try {
      // For now, create a tab-separated file that can be opened in Excel
      // In production, use a library like 'xlsx' for proper Excel format
      const processedData = this.processDataForExport(data, options);
      let content = '';

      // Add summary if requested
      if (options.includeSummary) {
        content += 'USAGE SUMMARY\n';
        content += `Total Entries\t${data.length}\n`;
        content += `Total Cost\t$${CostCalculatorService.calculateTotalCost(data).toFixed(6)}\n`;
        content += `Export Date\t${new Date().toISOString()}\n`;
        content += '\n';
      }

      // Add headers
      const headers = [
        'ID',
        'Timestamp',
        'Model',
        'Input Tokens',
        'Output Tokens',
        'Total Tokens',
        'Cost USD',
        'Session ID',
        'Project Path',
        'Conversation ID',
      ];
      content += headers.join('\t') + '\n';

      // Add data rows
      for (const entry of processedData) {
        const row = [
          entry.id,
          this.formatDate(entry.timestamp, options.dateFormat),
          entry.model,
          entry.input_tokens.toString(),
          entry.output_tokens.toString(),
          entry.total_tokens.toString(),
          entry.cost_usd.toFixed(6),
          entry.session_id || '',
          entry.project_path || '',
          entry.conversation_id || '',
        ];
        content += row.join('\t') + '\n';
      }

      // Save to file
      const fileName = `usage_export_${this.getTimestamp()}.xlsx`;
      const filePath = path.join(this.exportDir, fileName);
      await fs.writeFile(filePath, content, 'utf-8');

      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        content,
        stats: {
          totalEntries: data.length,
          totalCost: CostCalculatorService.calculateTotalCost(data),
          fileSize: stats.size,
          exportTime: 0,
        },
      };
    } catch (error) {
      throw new Error(`Excel export failed: ${error}`);
    }
  }

  /**
   * Export to PDF format (simplified implementation)
   */
  private async exportToPDF(data: UsageEntry[], options: ExportOptions): Promise<ExportResult> {
    try {
      // For now, create an HTML file that can be converted to PDF
      // In production, use a library like 'puppeteer' or 'pdfkit'
      const processedData = this.processDataForExport(data, options);
      
      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Usage Export Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        .cost { text-align: right; }
        .timestamp { font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>Claude API Usage Report</h1>
`;

      // Add summary if requested
      if (options.includeSummary) {
        htmlContent += `
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Entries:</strong> ${data.length}</p>
        <p><strong>Total Cost:</strong> $${CostCalculatorService.calculateTotalCost(data).toFixed(6)}</p>
        <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Date Range:</strong> ${this.getDateRange(data)}</p>
    </div>
`;
      }

      // Add data table
      htmlContent += `
    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Model</th>
                <th>Input Tokens</th>
                <th>Output Tokens</th>
                <th>Total Tokens</th>
                <th>Cost (USD)</th>
                <th>Session</th>
            </tr>
        </thead>
        <tbody>
`;

      for (const entry of processedData.slice(0, 1000)) { // Limit for PDF
        htmlContent += `
            <tr>
                <td class="timestamp">${this.formatDate(entry.timestamp, options.dateFormat)}</td>
                <td>${this.escapeHTML(entry.model)}</td>
                <td>${entry.input_tokens}</td>
                <td>${entry.output_tokens}</td>
                <td>${entry.total_tokens}</td>
                <td class="cost">$${entry.cost_usd.toFixed(6)}</td>
                <td>${this.escapeHTML(entry.session_id || 'N/A')}</td>
            </tr>
`;
      }

      htmlContent += `
        </tbody>
    </table>
</body>
</html>
`;

      // Save to file
      const fileName = `usage_export_${this.getTimestamp()}.html`;
      const filePath = path.join(this.exportDir, fileName);
      await fs.writeFile(filePath, htmlContent, 'utf-8');

      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        content: htmlContent,
        stats: {
          totalEntries: data.length,
          totalCost: CostCalculatorService.calculateTotalCost(data),
          fileSize: stats.size,
          exportTime: 0,
        },
      };
    } catch (error) {
      throw new Error(`PDF export failed: ${error}`);
    }
  }

  /**
   * Export session statistics
   */
  async exportSessionStats(
    sessions: SessionStats[],
    format: 'csv' | 'json' = 'csv'
  ): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      let content: string;
      let fileName: string;
      
      if (format === 'csv') {
        content = this.sessionsToCSV(sessions);
        fileName = `session_stats_${this.getTimestamp()}.csv`;
      } else {
        content = JSON.stringify({ sessions, exportDate: new Date().toISOString() }, null, 2);
        fileName = `session_stats_${this.getTimestamp()}.json`;
      }

      const filePath = path.join(this.exportDir, fileName);
      await fs.writeFile(filePath, content, 'utf-8');
      
      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        content,
        stats: {
          totalEntries: sessions.length,
          totalCost: sessions.reduce((sum, s) => sum + s.total_cost, 0),
          fileSize: stats.size,
          exportTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('Session stats export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
        stats: {
          totalEntries: sessions.length,
          totalCost: sessions.reduce((sum, s) => sum + s.total_cost, 0),
          fileSize: 0,
          exportTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Process data before export (filtering, sorting, grouping)
   */
  private processDataForExport(data: UsageEntry[], options: ExportOptions): UsageEntry[] {
    let processedData = [...data];

    // Sort by timestamp (newest first)
    processedData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return processedData;
  }

  /**
   * Group data by specified criteria
   */
  private groupData(data: UsageEntry[], groupBy: string): any {
    const grouped: any = {};

    for (const entry of data) {
      let key: string;
      
      switch (groupBy) {
        case 'session':
          key = entry.session_id || 'unknown';
          break;
        case 'model':
          key = entry.model;
          break;
        case 'date':
          key = entry.timestamp.split('T')[0]; // Get date part
          break;
        default:
          key = 'all';
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    }

    return grouped;
  }

  /**
   * Generate CSV summary
   */
  private generateCSVSummary(data: UsageEntry[]): string {
    const totalCost = CostCalculatorService.calculateTotalCost(data);
    const models = [...new Set(data.map(d => d.model))];
    const dateRange = this.getDateRange(data);
    
    return [
      'USAGE SUMMARY',
      `Total Entries,${data.length}`,
      `Total Cost,$${totalCost.toFixed(6)}`,
      `Models Used,"${models.join(', ')}"`,
      `Date Range,${dateRange}`,
      `Export Date,${new Date().toISOString()}`,
    ].join('\n');
  }

  /**
   * Generate JSON summary
   */
  private generateJSONSummary(data: UsageEntry[]): any {
    const totalCost = CostCalculatorService.calculateTotalCost(data);
    const models = [...new Set(data.map(d => d.model))];
    const sessions = [...new Set(data.map(d => d.session_id).filter(Boolean))];
    
    return {
      totalEntries: data.length,
      totalCost,
      modelsUsed: models,
      uniqueSessions: sessions.length,
      dateRange: this.getDateRange(data),
      costByModel: CostCalculatorService.calculateModelBreakdown(data),
    };
  }

  /**
   * Convert sessions to CSV format
   */
  private sessionsToCSV(sessions: SessionStats[]): string {
    const headers = [
      'Session ID',
      'Start Time',
      'End Time',
      'Duration (minutes)',
      'Total Cost',
      'Total Tokens',
      'Message Count',
      'Model',
    ];
    
    let csv = headers.join(',') + '\n';
    
    for (const session of sessions) {
      const duration = (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60);
      
      const row = [
        this.escapeCSV(session.session_id),
        this.escapeCSV(session.start_time),
        this.escapeCSV(session.end_time),
        duration.toFixed(2),
        session.total_cost.toFixed(6),
        session.total_tokens.toString(),
        session.message_count.toString(),
        this.escapeCSV(session.model),
      ];
      
      csv += row.join(',') + '\n';
    }
    
    return csv;
  }


  /**
   * Get date range from data
   */
  private getDateRange(data: UsageEntry[]): string {
    if (data.length === 0) return 'No data';
    
    const dates = data.map(d => new Date(d.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0].toISOString().split('T')[0];
    const end = dates[dates.length - 1].toISOString().split('T')[0];
    
    return start === end ? start : `${start} to ${end}`;
  }

  /**
   * Format date according to options
   */
  private formatDate(dateString: string, format: string = 'iso'): string {
    const date = new Date(dateString);
    
    switch (format) {
      case 'local':
        return date.toLocaleString();
      case 'short':
        return date.toLocaleDateString();
      case 'iso':
      default:
        return date.toISOString();
    }
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Escape HTML values
   */
  private escapeHTML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Get timestamp for filenames
   */
  private getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
  }

  /**
   * List available export files
   */
  async listExportFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.exportDir);
      return files.filter(file => 
        file.endsWith('.csv') || 
        file.endsWith('.json') || 
        file.endsWith('.xlsx') || 
        file.endsWith('.html')
      ).sort().reverse(); // Newest first
    } catch (error) {
      console.error('Failed to list export files:', error);
      return [];
    }
  }

  /**
   * Delete export file
   */
  async deleteExportFile(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.exportDir, fileName);
      await fs.unlink(filePath);
      console.log(`Deleted export file: ${fileName}`);
    } catch (error) {
      console.error('Failed to delete export file:', error);
      throw new Error(`Failed to delete export file: ${error}`);
    }
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(maxAge: number = 30): Promise<void> {
    try {
      const files = await fs.readdir(this.exportDir);
      const cutoffTime = Date.now() - (maxAge * 24 * 60 * 60 * 1000); // maxAge in days
      
      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          console.log(`Deleted old export file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old exports:', error);
    }
  }

  /**
   * Export comprehensive business intelligence report
   */
  async exportBusinessIntelligence(data: BusinessIntelligence): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      await this.ensureExportDirectory();
      
      // Generate comprehensive BI report in JSON format
      const reportData = {
        title: "CCTracker Business Intelligence Report",
        generated_at: new Date().toISOString(),
        summary: {
          total_cost: data.total_cost,
          total_tokens: data.total_tokens,
          total_sessions: data.total_sessions,
          cost_per_token: data.cost_per_token,
          data_quality_score: data.data_quality_score,
          calculation_time_ms: data.calculation_time_ms
        },
        performance_metrics: {
          tokens_per_hour: data.tokens_per_hour,
          cost_burn_rate: data.cost_burn_rate,
          session_efficiency: data.session_efficiency,
          model_diversity: data.model_diversity
        },
        model_analysis: {
          efficiency_ranking: data.model_efficiency,
          most_expensive_model: data.most_expensive_model,
          most_efficient_model: data.most_efficient_model
        },
        time_analysis: {
          peak_usage_hours: data.peak_usage_hours,
          busiest_day_of_week: data.busiest_day_of_week,
          usage_patterns: data.usage_patterns
        },
        trends: {
          daily: data.trends.daily,
          weekly: data.trends.weekly,
          monthly: data.trends.monthly
        },
        predictions: {
          predicted_monthly_cost: data.predictions.predicted_monthly_cost,
          predicted_monthly_tokens: data.predictions.predicted_monthly_tokens,
          cost_trend: data.predictions.cost_trend,
          confidence_level: data.predictions.confidence_level,
          next_week_forecast: data.predictions.next_week_forecast,
          budget_risk: data.predictions.budget_risk
        },
        anomalies: data.anomalies,
        insights: {
          key_findings: [
            `Your most efficient model is ${data.most_efficient_model}`,
            `Peak usage occurs at ${data.peak_usage_hours.join(', ')} hours`,
            `You're most active on ${data.busiest_day_of_week}`,
            `Current cost trend is ${data.predictions.cost_trend}`,
            `${data.anomalies.length} anomalies detected in your usage patterns`
          ],
          recommendations: this.generateRecommendations(data),
          cost_optimization: this.generateCostOptimizationSuggestions(data)
        },
        metadata: {
          data_points_analyzed: data.data_points_analyzed,
          export_timestamp: new Date().toISOString(),
          report_version: "1.0.0"
        }
      };

      const content = JSON.stringify(reportData, null, 2);
      const fileName = `business_intelligence_report_${this.getTimestamp()}.json`;
      const filePath = path.join(this.exportDir, fileName);
      
      await fs.writeFile(filePath, content, 'utf-8');
      const stats = await fs.stat(filePath);

      // Also generate a simplified CSV summary
      const csvSummary = this.generateBusinessIntelligenceCSV(data);
      const csvFileName = `bi_summary_${this.getTimestamp()}.csv`;
      const csvFilePath = path.join(this.exportDir, csvFileName);
      await fs.writeFile(csvFilePath, csvSummary, 'utf-8');

      console.log(`Generated business intelligence report: ${fileName}`);

      return {
        success: true,
        filePath,
        content,
        stats: {
          totalEntries: data.data_points_analyzed,
          totalCost: data.total_cost,
          fileSize: stats.size,
          exportTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('Business intelligence export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
        stats: {
          totalEntries: data.data_points_analyzed,
          totalCost: data.total_cost,
          fileSize: 0,
          exportTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Generate business intelligence recommendations
   */
  private generateRecommendations(data: BusinessIntelligence): string[] {
    const recommendations: string[] = [];

    // Cost optimization recommendations
    if (data.predictions.cost_trend === 'increasing') {
      recommendations.push(`Cost trend is increasing. Consider monitoring usage more closely.`);
    }

    // Model efficiency recommendations
    if (data.model_efficiency.length > 1) {
      const leastEfficient = data.model_efficiency[data.model_efficiency.length - 1];
      const mostEfficient = data.model_efficiency[0];
      
      if (leastEfficient.efficiency_score > mostEfficient.efficiency_score * 2) {
        recommendations.push(`Consider using ${mostEfficient.model} more often for better cost efficiency.`);
      }
    }

    // Usage pattern recommendations
    const totalUsage = Object.values(data.usage_patterns).reduce((a, b) => a + b, 0);
    const nightUsage = data.usage_patterns.night / totalUsage;
    
    if (nightUsage > 0.3) {
      recommendations.push(`High night usage detected (${(nightUsage * 100).toFixed(1)}%). Consider scheduling non-urgent tasks for off-peak hours.`);
    }

    // Anomaly recommendations
    if (data.anomalies.length > 5) {
      recommendations.push(`${data.anomalies.length} anomalies detected. Review unusual usage patterns to optimize costs.`);
    }

    // Budget risk recommendations
    if (data.predictions.budget_risk.level === 'high') {
      recommendations.push(`High budget risk detected. Projected overage: $${data.predictions.budget_risk.projected_overage.toFixed(2)}`);
    }

    return recommendations;
  }

  /**
   * Generate cost optimization suggestions
   */
  private generateCostOptimizationSuggestions(data: BusinessIntelligence): string[] {
    const suggestions: string[] = [];

    // Model selection optimization
    if (data.model_efficiency.length > 0) {
      const topModel = data.model_efficiency[0];
      suggestions.push(`Primary recommendation: Use ${topModel.model} for optimal cost-per-token ratio`);
    }

    // Usage timing optimization
    const peakHours = data.peak_usage_hours;
    if (peakHours.length > 0) {
      suggestions.push(`Consider spreading usage outside peak hours (${peakHours.join(', ')}) for potentially better performance`);
    }

    // Session efficiency optimization
    if (data.session_efficiency > 0) {
      const avgTokensPerSession = data.session_efficiency;
      if (avgTokensPerSession < 1000) {
        suggestions.push(`Low session efficiency detected. Consider batching smaller requests to reduce overhead`);
      }
    }

    return suggestions;
  }

  /**
   * Generate business intelligence CSV summary
   */
  private generateBusinessIntelligenceCSV(data: BusinessIntelligence): string {
    const headers = [
      'Metric',
      'Value',
      'Unit',
      'Description'
    ];

    const rows = [
      ['Total Cost', data.total_cost.toFixed(4), 'USD', 'Total spending on Claude API'],
      ['Total Tokens', data.total_tokens.toString(), 'tokens', 'Total tokens processed'],
      ['Total Sessions', data.total_sessions.toString(), 'sessions', 'Number of unique sessions'],
      ['Cost Per Token', (data.cost_per_token * 1000000).toFixed(2), 'USD per million', 'Average cost efficiency'],
      ['Tokens Per Hour', data.tokens_per_hour.toFixed(0), 'tokens/hour', 'Usage velocity'],
      ['Cost Burn Rate', data.cost_burn_rate.toFixed(4), 'USD/hour', 'Spending rate'],
      ['Session Efficiency', data.session_efficiency.toFixed(0), 'tokens/session', 'Average tokens per session'],
      ['Model Diversity', data.model_diversity.toString(), 'models', 'Number of different models used'],
      ['Most Efficient Model', data.most_efficient_model, 'model', 'Best cost-per-token model'],
      ['Most Expensive Model', data.most_expensive_model, 'model', 'Highest total cost model'],
      ['Busiest Day', data.busiest_day_of_week, 'day', 'Most active day of week'],
      ['Predicted Monthly Cost', data.predictions.predicted_monthly_cost.toFixed(2), 'USD', 'Forecasted monthly spending'],
      ['Cost Trend', data.predictions.cost_trend, 'trend', 'Current spending direction'],
      ['Confidence Level', data.predictions.confidence_level.toFixed(1), '%', 'Prediction reliability'],
      ['Budget Risk Level', data.predictions.budget_risk.level, 'risk', 'Budget overage risk'],
      ['Anomalies Count', data.anomalies.length.toString(), 'count', 'Unusual usage patterns detected'],
      ['Data Quality Score', data.data_quality_score.toFixed(1), '%', 'Data completeness and accuracy']
    ];

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Export default instance
export const exportService = new ExportService();