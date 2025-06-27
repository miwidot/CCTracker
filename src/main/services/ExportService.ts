import * as fs from 'fs/promises';
import * as path from 'path';
import { UsageEntry, SessionStats, DateRangeStats, CurrencyRates } from '../../shared/types';

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
          totalCost: this.calculateTotalCost(data),
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
          totalCost: this.calculateTotalCost(data),
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
          totalCost: this.calculateTotalCost(data),
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
          totalCost: this.calculateTotalCost(data),
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
        content += `Total Cost\t$${this.calculateTotalCost(data).toFixed(6)}\n`;
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
          totalCost: this.calculateTotalCost(data),
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
        <p><strong>Total Cost:</strong> $${this.calculateTotalCost(data).toFixed(6)}</p>
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
          totalCost: this.calculateTotalCost(data),
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
    const totalCost = this.calculateTotalCost(data);
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
    const totalCost = this.calculateTotalCost(data);
    const models = [...new Set(data.map(d => d.model))];
    const sessions = [...new Set(data.map(d => d.session_id).filter(Boolean))];
    
    return {
      totalEntries: data.length,
      totalCost,
      modelsUsed: models,
      uniqueSessions: sessions.length,
      dateRange: this.getDateRange(data),
      costByModel: models.reduce((acc, model) => {
        const modelData = data.filter(d => d.model === model);
        acc[model] = this.calculateTotalCost(modelData);
        return acc;
      }, {} as Record<string, number>),
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
   * Calculate total cost from usage entries
   */
  private calculateTotalCost(data: UsageEntry[]): number {
    return data.reduce((sum, entry) => sum + entry.cost_usd, 0);
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
}

// Export default instance
export const exportService = new ExportService();