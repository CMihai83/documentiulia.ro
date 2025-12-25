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

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '-';
    const userId = (request as unknown as { user?: { id?: string } }).user?.id || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        this.logger.log(
          `${method} ${url} ${statusCode} ${duration}ms - ${ip} - ${userAgent} - User: ${userId}`,
        );

        if (duration > 3000) {
          this.logger.warn(
            `Slow request detected: ${method} ${url} took ${duration}ms`,
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `${method} ${url} ERROR ${duration}ms - ${ip} - ${error.message}`,
        );
        throw error;
      }),
    );
  }
}
