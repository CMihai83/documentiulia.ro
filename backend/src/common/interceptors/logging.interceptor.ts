import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Logging Interceptor with Correlation IDs and Structured Logging
 *
 * Features:
 * - Correlation ID generation/propagation for distributed tracing
 * - Structured JSON logging with metadata
 * - Request/response time tracking
 * - Slow request detection (>1s warning, >3s error)
 * - Error logging with stack traces
 * - User context tracking
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '-';
    const userId = (request as unknown as { user?: { id?: string } }).user?.id || 'anonymous';
    const startTime = Date.now();

    // Generate or extract correlation ID for distributed tracing
    const correlationId = (headers['x-correlation-id'] as string) || uuidv4();

    // Attach correlation ID to request and response
    (request as any).correlationId = correlationId;
    response.setHeader('X-Correlation-ID', correlationId);

    // Log incoming request
    this.logRequest(method, url, ip, userAgent, userId, correlationId);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        this.logResponse(method, url, statusCode, duration, ip, userId, correlationId);

        // Performance monitoring
        if (duration > 3000) {
          this.logger.error(
            JSON.stringify({
              type: 'slow_request_critical',
              method,
              url,
              duration: `${duration}ms`,
              threshold: '3000ms',
              correlationId,
              userId,
              ip,
            }),
          );
        } else if (duration > 1000) {
          this.logger.warn(
            JSON.stringify({
              type: 'slow_request_warning',
              method,
              url,
              duration: `${duration}ms`,
              threshold: '1000ms',
              correlationId,
              userId,
              ip,
            }),
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        this.logError(method, url, statusCode, duration, ip, userId, correlationId, error);
        throw error;
      }),
    );
  }

  /**
   * Log incoming HTTP request
   */
  private logRequest(
    method: string,
    url: string,
    ip: string | undefined,
    userAgent: string,
    userId: string,
    correlationId: string,
  ): void {
    this.logger.log(
      JSON.stringify({
        type: 'request',
        method,
        url,
        ip: ip || 'unknown',
        userAgent,
        userId,
        correlationId,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Log outgoing HTTP response
   */
  private logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    ip: string | undefined,
    userId: string,
    correlationId: string,
  ): void {
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

    this.logger[logLevel](
      JSON.stringify({
        type: 'response',
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        ip: ip || 'unknown',
        userId,
        correlationId,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Log HTTP error
   */
  private logError(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    ip: string | undefined,
    userId: string,
    correlationId: string,
    error: any,
  ): void {
    this.logger.error(
      JSON.stringify({
        type: 'error',
        method,
        url,
        statusCode: statusCode || 500,
        duration: `${duration}ms`,
        ip: ip || 'unknown',
        userId,
        correlationId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
