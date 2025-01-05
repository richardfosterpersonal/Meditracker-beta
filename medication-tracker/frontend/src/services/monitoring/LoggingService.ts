import { Severity } from '@sentry/types';
import { monitoring } from './MonitoringService';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

interface LogOptions {
  tags?: Record<string, string>;
  context?: Record<string, any>;
  sendToSentry?: boolean;
}

class LoggingService {
  private static instance: LoggingService;
  private logBuffer: LogEntry[] = [];
  private readonly bufferSize = 1000;
  private readonly sensitiveKeys = [
    'password',
    'token',
    'authorization',
    'secret',
    'key',
    'cookie',
    'session',
  ];

  private constructor() {
    this.setupErrorHandlers();
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private setupErrorHandlers() {
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        context: {
          reason: event.reason,
          stack: event.reason?.stack,
        },
      });
    });

    window.addEventListener('error', (event) => {
      this.error('Uncaught Error', {
        context: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
      });
    });
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    if (typeof data === 'object') {
      const sanitized = Array.isArray(data) ? [] : {};
      for (const [key, value] of Object.entries(data)) {
        if (this.sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    options?: LogOptions
  ): LogEntry {
    const timestamp = new Date().toISOString();
    const context = options?.context ? this.sanitizeData(options.context) : undefined;

    return {
      timestamp,
      level,
      message,
      context,
    };
  }

  private addToBuffer(entry: LogEntry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer.shift();
    }
  }

  private sendToSentry(level: LogLevel, message: string, options?: LogOptions) {
    if (options?.sendToSentry === false) return;

    const sentryLevel = this.mapLogLevelToSentry(level);
    monitoring.captureMessage(message, sentryLevel);

    if (options?.tags) {
      monitoring.setTags(options.tags);
    }
  }

  private mapLogLevelToSentry(level: LogLevel): Severity {
    switch (level) {
      case 'debug':
        return Severity.Debug;
      case 'info':
        return Severity.Info;
      case 'warn':
        return Severity.Warning;
      case 'error':
        return Severity.Error;
      default:
        return Severity.Info;
    }
  }

  public debug(message: string, options?: LogOptions) {
    if (process.env.NODE_ENV === 'production') return;

    const entry = this.formatLogEntry('debug', message, options);
    this.addToBuffer(entry);
    console.debug(message, options?.context || '');
  }

  public info(message: string, options?: LogOptions) {
    const entry = this.formatLogEntry('info', message, options);
    this.addToBuffer(entry);
    this.sendToSentry('info', message, options);
    console.info(message, options?.context || '');
  }

  public warn(message: string, options?: LogOptions) {
    const entry = this.formatLogEntry('warn', message, options);
    this.addToBuffer(entry);
    this.sendToSentry('warn', message, options);
    console.warn(message, options?.context || '');
  }

  public error(message: string, options?: LogOptions) {
    const entry = this.formatLogEntry('error', message, options);
    this.addToBuffer(entry);
    this.sendToSentry('error', message, options);
    console.error(message, options?.context || '');
  }

  public getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  public clearBuffer() {
    this.logBuffer = [];
  }

  public downloadLogs() {
    const logs = JSON.stringify(this.logBuffer, null, 2);
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const logging = LoggingService.getInstance();
export type { LogLevel, LogEntry, LogOptions };
