/**
 * HIPAA-Compliant Logger Implementation
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/core/types';
import { LogEntry, LoggerConfig } from './types';
import { Logger } from '@/core/logging';
import { createLogger, format, transports } from 'winston';

@injectable()
export class HIPAALogger implements Logger {
    private readonly logger: any;
    private readonly phiPatterns: Record<string, RegExp>;

    constructor(
        @inject(TYPES.LoggerConfig) private config: LoggerConfig
    ) {
        this.phiPatterns = {
            ...config.phiPatterns,
            ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
            phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
            zip: /\b\d{5}(?:-\d{4})?\b/g,
            creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
            ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
            date: /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g
        };

        this.logger = createLogger({
            level: config.level,
            format: format.combine(
                format.timestamp(),
                format.json(),
                format((info) => {
                    if (config.hipaaMode) {
                        info.message = this.sanitizePHI(info.message);
                        if (info.context) {
                            info.context = this.sanitizeObject(info.context);
                        }
                    }
                    return info;
                })()
            ),
            transports: [
                new transports.Console(),
                new transports.File({ 
                    filename: 'logs/hipaa-compliant.log',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    tailable: true
                })
            ]
        });
    }

    info(message: string, context?: Record<string, any>): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: Record<string, any>): void {
        this.log('warn', message, context);
    }

    error(message: string, context?: Record<string, any>): void {
        this.log('error', message, context);
    }

    debug(message: string, context?: Record<string, any>): void {
        this.log('debug', message, context);
    }

    private log(level: string, message: string, context?: Record<string, any>): void {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context,
            phi: this.containsPHI(message) || (context && this.containsPHI(JSON.stringify(context)))
        };

        this.logger.log(level, entry);
    }

    private sanitizePHI(text: string): string {
        if (!text) return text;

        let sanitized = text;
        for (const [type, pattern] of Object.entries(this.phiPatterns)) {
            sanitized = sanitized.replace(pattern, `[REDACTED ${type}]`);
        }
        return sanitized;
    }

    private sanitizeObject(obj: any): any {
        if (!obj) return obj;
        if (typeof obj !== 'object') return obj;

        const sanitized: any = Array.isArray(obj) ? [] : {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizePHI(value);
            } else if (typeof value === 'object') {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    private containsPHI(text: string): boolean {
        if (!text) return false;
        return Object.values(this.phiPatterns).some(pattern => pattern.test(text));
    }
}
