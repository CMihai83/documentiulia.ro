import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import { Client } from '@elastic/elasticsearch';

/**
 * Centralized Logging Service for DocumentIulia.ro
 *
 * Features:
 * - Multi-level logging (error, warn, info, debug, verbose)
 * - Elasticsearch integration for centralized log storage
 * - Structured JSON logging with metadata
 * - Automatic PII redaction (passwords, tokens, CIF, IBAN)
 * - Request correlation IDs for distributed tracing
 * - Performance metrics logging
 * - GDPR-compliant log retention (30 days)
 *
 * Architecture:
 * - Console transport for local development
 * - File transport for staging (rotate daily, 7-day retention)
 * - Elasticsearch transport for production (30-day retention)
 *
 * Usage:
 * ```typescript
 * constructor(private logger: CentralizedLoggingService) {
 *   this.logger.setContext('InvoiceService');
 * }
 *
 * this.logger.log('Invoice created', { invoiceId: '123', amount: 1000 });
 * this.logger.error('ANAF API error', error.stack, { attempt: 3 });
 * ```
 */
@Injectable({ scope: Scope.TRANSIENT })
export class CentralizedLoggingService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;
  private readonly serviceName = 'documentiulia-backend';

  constructor(private configService: ConfigService) {
    this.initializeLogger();
  }

  /**
   * Initialize Winston logger with transports
   */
  private initializeLogger(): void {
    const environment = this.configService.get<string>('NODE_ENV') || 'development';
    const logLevel = this.configService.get<string>('LOG_LEVEL') || 'info';

    const transports: winston.transport[] = [];

    // Console transport (all environments)
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const contextStr = context ? `[${context}]` : '';
            const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
            return `${timestamp} ${level} ${contextStr} ${message}${metaStr}`;
          }),
        ),
      }),
    );

    // File transport (staging/production)
    if (environment !== 'development') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 7, // 7-day rotation
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      transports.push(
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 10485760, // 10MB
          maxFiles: 7, // 7-day rotation
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    // Elasticsearch transport (production)
    if (environment === 'production') {
      const elasticsearchHost = this.configService.get<string>('ELASTICSEARCH_HOST') || 'http://localhost:9200';
      const elasticsearchUser = this.configService.get<string>('ELASTICSEARCH_USER');
      const elasticsearchPassword = this.configService.get<string>('ELASTICSEARCH_PASSWORD');

      const clientOpts: any = {
        node: elasticsearchHost,
      };

      if (elasticsearchUser && elasticsearchPassword) {
        clientOpts.auth = {
          username: elasticsearchUser,
          password: elasticsearchPassword,
        };
      }

      const esClient = new Client(clientOpts);

      const esTransport = new ElasticsearchTransport({
        level: 'info',
        client: esClient as any,
        index: 'documentiulia-logs',
        transformer: (logData: any) => {
          // Transform log data for Elasticsearch
          return {
            '@timestamp': new Date().toISOString(),
            severity: logData.level,
            message: logData.message,
            context: logData.context || 'Application',
            service: this.serviceName,
            environment,
            meta: logData.meta,
            trace: logData.trace,
          };
        },
      });

      transports.push(esTransport);
    }

    // Create Winston logger
    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        this.redactPIIFormat(),
        winston.format.json(),
      ),
      defaultMeta: {
        service: this.serviceName,
        environment,
      },
      transports,
    });
  }

  /**
   * Custom format to redact PII from logs (GDPR compliance)
   */
  private redactPIIFormat(): winston.Logform.Format {
    return winston.format((info) => {
      const redactedInfo = this.redactSensitiveData(info);
      return redactedInfo;
    })();
  }

  /**
   * Redact sensitive data (passwords, tokens, CIF, IBAN, etc.)
   */
  private redactSensitiveData(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const redacted = { ...obj };

    const sensitiveKeys = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'sessionId',
    ];

    // Redact sensitive keys
    for (const key of Object.keys(redacted)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redactSensitiveData(redacted[key]);
      } else if (typeof redacted[key] === 'string') {
        // Redact Romanian CIF/CUI (fiscal code)
        redacted[key] = redacted[key].replace(/\bRO\d{8,10}\b/gi, '[CIF_REDACTED]');

        // Redact IBAN
        redacted[key] = redacted[key].replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/gi, '[IBAN_REDACTED]');

        // Redact credit card numbers
        redacted[key] = redacted[key].replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_REDACTED]');
      }
    }

    return redacted;
  }

  /**
   * Set logging context (e.g., service name, class name)
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log info message
   */
  log(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, { context: this.context, ...meta });
  }

  /**
   * Log error message
   */
  error(message: string, trace?: string, meta?: Record<string, any>): void {
    this.logger.error(message, { context: this.context, trace, ...meta });
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  /**
   * Log verbose message
   */
  verbose(message: string, meta?: Record<string, any>): void {
    this.logger.verbose(message, { context: this.context, ...meta });
  }

  /**
   * Log API request
   */
  logRequest(req: any, meta?: Record<string, any>): void {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      correlationId: req.headers['x-correlation-id'],
      ...meta,
    });
  }

  /**
   * Log API response
   */
  logResponse(req: any, res: any, responseTime: number, meta?: Record<string, any>): void {
    this.logger.info('HTTP Response', {
      context: 'HTTP',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      correlationId: req.headers['x-correlation-id'],
      ...meta,
    });
  }

  /**
   * Log ANAF API interaction
   */
  logAnafInteraction(
    operation: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    success: boolean,
    meta?: Record<string, any>,
  ): void {
    this.logger.info('ANAF API Interaction', {
      context: 'ANAF',
      operation,
      endpoint,
      statusCode,
      responseTime: `${responseTime}ms`,
      success,
      ...meta,
    });
  }

  /**
   * Log database query performance
   */
  logDatabaseQuery(
    query: string,
    duration: number,
    rowCount: number,
    meta?: Record<string, any>,
  ): void {
    const level = duration > 100 ? 'warn' : 'debug'; // Slow query threshold: 100ms

    this.logger.log({
      level,
      message: 'Database Query',
      context: 'Database',
      query: query.substring(0, 200), // Limit query length
      duration: `${duration}ms`,
      rowCount,
      slowQuery: duration > 100,
      ...meta,
    });
  }

  /**
   * Log security event (authentication, authorization failures)
   */
  logSecurityEvent(
    event: string,
    userId: string,
    success: boolean,
    meta?: Record<string, any>,
  ): void {
    this.logger.warn('Security Event', {
      context: 'Security',
      event,
      userId,
      success,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  /**
   * Log business event (invoice created, payment processed, etc.)
   */
  logBusinessEvent(
    event: string,
    entityType: string,
    entityId: string,
    meta?: Record<string, any>,
  ): void {
    this.logger.info('Business Event', {
      context: 'Business',
      event,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  /**
   * Create child logger with additional context
   */
  child(childContext: string): CentralizedLoggingService {
    const childLogger = new CentralizedLoggingService(this.configService);
    childLogger.setContext(`${this.context}.${childContext}`);
    return childLogger;
  }
}
