import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { logAudit } from '../../logging/winston.config';

// Methods that modify data
const AUDIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Sensitive endpoints to audit
const AUDIT_PATHS = [
  '/invoices',
  '/finance',
  '/anaf',
  '/hr',
  '/documents',
  '/gdpr',
  '/auth',
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, ip } = request;
    const userId = (request as unknown as { user?: { id?: string } }).user?.id || 'anonymous';
    const startTime = Date.now();

    // Only audit sensitive operations
    if (!AUDIT_METHODS.includes(method)) {
      return next.handle();
    }

    // Check if this is a sensitive endpoint
    const shouldAudit = AUDIT_PATHS.some((path) => url.includes(path));
    if (!shouldAudit) {
      return next.handle();
    }

    // Determine action based on method and path
    const action = this.getAuditAction(method, url);

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;

          logAudit(action, userId, {
            method,
            url,
            ip,
            duration,
            status: 'SUCCESS',
            resourceId: this.extractResourceId(url),
            // Sanitize body - remove sensitive fields
            payload: this.sanitizePayload(body),
            responseId: (response as { id?: string })?.id,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          logAudit(action, userId, {
            method,
            url,
            ip,
            duration,
            status: 'FAILED',
            resourceId: this.extractResourceId(url),
            error: error.message,
          });
        },
      }),
    );
  }

  private getAuditAction(method: string, url: string): string {
    const resource = this.extractResource(url);
    const baseAction = resource.toUpperCase();

    switch (method) {
      case 'POST':
        return `${baseAction}_CREATED`;
      case 'PUT':
      case 'PATCH':
        return `${baseAction}_MODIFIED`;
      case 'DELETE':
        return `${baseAction}_DELETED`;
      default:
        return `${baseAction}_ACCESSED`;
    }
  }

  private extractResource(url: string): string {
    const parts = url.split('/').filter(Boolean);
    // Get the main resource (e.g., /api/v1/invoices/123 -> invoices)
    for (const part of parts) {
      if (AUDIT_PATHS.some((path) => path.includes(part))) {
        return part.replace(/^\//, '');
      }
    }
    return 'unknown';
  }

  private extractResourceId(url: string): string | null {
    const parts = url.split('/');
    // Look for UUID or numeric ID
    for (const part of parts) {
      if (/^[0-9a-f-]{36}$/i.test(part) || /^\d+$/.test(part)) {
        return part;
      }
    }
    return null;
  }

  private sanitizePayload(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const sensitiveFields = [
      'password',
      'confirmPassword',
      'currentPassword',
      'newPassword',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'certificatePassword',
      'cnp', // Romanian personal ID
    ];

    const sanitized = { ...(body as Record<string, unknown>) };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
