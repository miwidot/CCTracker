/**
 * Centralized logging utility for CCTracker
 * Provides consistent logging across main and renderer processes
 * with configurable log levels and production handling
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  error?: Error;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private readonly isDevelopment: boolean = process.env.NODE_ENV !== 'production';

  private constructor() {
    // Set log level based on environment
    if (this.isDevelopment) {
      this.logLevel = LogLevel.DEBUG;
    } else {
      this.logLevel = LogLevel.WARN;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    return `[${timestamp}] ${level}${contextStr}: ${message}`;
  }

  private log(level: LogLevel, levelName: string, message: string, context?: string, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(levelName, message, context);

    // In development, use console for immediate feedback
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          if (error) {
            console.error(error.stack);
          }
          break;
      }
    } else {
      // In production, could integrate with external logging service
      // For now, only log errors and warnings to avoid noise
      if (level >= LogLevel.WARN) {
        const logEntry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: levelName,
          message,
          context,
          error
        };
        
        // Store in memory for now, could be enhanced to write to file or send to service
        this.storeLogEntry(logEntry);
      }
    }
  }

  private storeLogEntry(entry: LogEntry): void {
    // In a real implementation, this could write to file or send to logging service
    // For now, just use console for critical errors even in production
    if (entry.level === 'ERROR') {
      console.error(`[${entry.timestamp}] ERROR${entry.context ? ` [${entry.context}]` : ''}: ${entry.message}`);
      if (entry.error) {
        console.error(entry.error.stack);
      }
    }
  }

  debug(message: string, context?: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  info(message: string, context?: string): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  warn(message: string, context?: string): void {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  error(message: string, error?: Error, context?: string): void {
    this.log(LogLevel.ERROR, 'ERROR', message, context, error);
  }

  // Convenience methods for common logging patterns
  serviceStart(serviceName: string): void {
    this.info(`Service started`, serviceName);
  }

  serviceStop(serviceName: string): void {
    this.info(`Service stopped`, serviceName);
  }

  serviceError(serviceName: string, message: string, error?: Error): void {
    this.error(`Service error: ${message}`, error, serviceName);
  }

  ipcCall(channel: string, data?: any): void {
    this.debug(`IPC call to ${channel}${data ? ` with data: ${JSON.stringify(data)}` : ''}`, 'IPC');
  }

  ipcError(channel: string, error: Error): void {
    this.error(`IPC error on channel ${channel}`, error, 'IPC');
  }

  fileOperation(operation: string, path: string): void {
    this.debug(`File ${operation}: ${path}`, 'FileSystem');
  }

  fileError(operation: string, path: string, error: Error): void {
    this.error(`File ${operation} failed: ${path}`, error, 'FileSystem');
  }

  costCalculation(message: string, details?: any): void {
    this.debug(`Cost calculation: ${message}${details ? ` - ${JSON.stringify(details)}` : ''}`, 'CostCalculator');
  }

  parsingError(fileName: string, error: Error): void {
    this.error(`Failed to parse file: ${fileName}`, error, 'Parser');
  }

  componentRender(componentName: string): void {
    this.debug(`Component rendered: ${componentName}`, 'React');
  }

  componentError(componentName: string, error: Error): void {
    this.error(`Component error in ${componentName}`, error, 'React');
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export for testing purposes
export { Logger };

// Convenience exports for common patterns
export const log = {
  debug: (message: string, context?: string) => logger.debug(message, context),
  info: (message: string, context?: string) => logger.info(message, context),
  warn: (message: string, context?: string) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: string) => logger.error(message, error, context),
  
  // Service logging
  service: {
    start: (name: string) => logger.serviceStart(name),
    stop: (name: string) => logger.serviceStop(name),
    error: (name: string, message: string, error?: Error) => logger.serviceError(name, message, error)
  },
  
  // IPC logging
  ipc: {
    call: (channel: string, data?: any) => logger.ipcCall(channel, data),
    error: (channel: string, error: Error) => logger.ipcError(channel, error)
  },
  
  // File operations
  file: {
    operation: (operation: string, path: string) => logger.fileOperation(operation, path),
    error: (operation: string, path: string, error: Error) => logger.fileError(operation, path, error)
  },
  
  // Cost calculations
  cost: {
    calculation: (message: string, details?: any) => logger.costCalculation(message, details)
  },
  
  // Parsing
  parsing: {
    error: (fileName: string, error: Error) => logger.parsingError(fileName, error)
  },
  
  // React components
  component: {
    render: (name: string) => logger.componentRender(name),
    error: (name: string, error: Error) => logger.componentError(name, error)
  }
};