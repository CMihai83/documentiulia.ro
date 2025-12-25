import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MonitoringService } from '../../monitoring/monitoring.service';

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  responseTimesSum: number;
  endpointHits: Map<string, number>;
  statusCodes: Map<number, number>;
  anafRequests: Map<string, number>; // ANAF endpoint tracking
  lastReset: Date;
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private static metrics: RequestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    responseTimesSum: 0,
    endpointHits: new Map(),
    statusCodes: new Map(),
    anafRequests: new Map(),
    lastReset: new Date(),
  };

  constructor(
    @Optional() @Inject(MonitoringService) private readonly monitoringService?: MonitoringService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url } = request;
    const startTime = Date.now();
    const endpoint = `${method} ${url.split('?')[0]}`;

    MetricsInterceptor.metrics.totalRequests++;

    const currentHits = MetricsInterceptor.metrics.endpointHits.get(endpoint) || 0;
    MetricsInterceptor.metrics.endpointHits.set(endpoint, currentHits + 1);

    // Track ANAF-related endpoints for compliance metrics
    if (url.includes('/vat/') || url.includes('/saft-d406/') || url.includes('/efactura/') || url.includes('/deadlines/')) {
      const anafEndpoint = this.categorizeAnafEndpoint(url);
      const anafHits = MetricsInterceptor.metrics.anafRequests.get(anafEndpoint) || 0;
      MetricsInterceptor.metrics.anafRequests.set(anafEndpoint, anafHits + 1);
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          const success = statusCode >= 200 && statusCode < 400;

          if (success) {
            MetricsInterceptor.metrics.successfulRequests++;
          } else {
            MetricsInterceptor.metrics.failedRequests++;
          }

          MetricsInterceptor.metrics.responseTimesSum += duration;
          MetricsInterceptor.metrics.averageResponseTime =
            MetricsInterceptor.metrics.responseTimesSum /
            MetricsInterceptor.metrics.totalRequests;

          const currentCount =
            MetricsInterceptor.metrics.statusCodes.get(statusCode) || 0;
          MetricsInterceptor.metrics.statusCodes.set(statusCode, currentCount + 1);

          // Report to MonitoringService if available
          if (this.monitoringService) {
            this.monitoringService.recordRequest(success, duration);
          }
        },
        error: () => {
          MetricsInterceptor.metrics.failedRequests++;
          if (this.monitoringService) {
            this.monitoringService.recordRequest(false, Date.now() - startTime);
          }
        },
      }),
    );
  }

  private categorizeAnafEndpoint(url: string): string {
    if (url.includes('/vat/rates')) return 'vat_rates';
    if (url.includes('/vat/calculate')) return 'vat_calculate';
    if (url.includes('/vat/reverse-charge')) return 'vat_reverse_charge';
    if (url.includes('/vat/validate-cui')) return 'vat_cui_validation';
    if (url.includes('/vat/')) return 'vat_other';
    if (url.includes('/saft-d406/generate')) return 'saft_d406_generate';
    if (url.includes('/saft-d406/submit')) return 'saft_d406_submit';
    if (url.includes('/saft-d406/validate')) return 'saft_d406_validate';
    if (url.includes('/saft-d406/')) return 'saft_d406_other';
    if (url.includes('/efactura/')) return 'efactura';
    if (url.includes('/deadlines/')) return 'deadlines';
    return 'anaf_other';
  }

  static getMetrics() {
    return {
      ...MetricsInterceptor.metrics,
      endpointHits: Object.fromEntries(MetricsInterceptor.metrics.endpointHits),
      statusCodes: Object.fromEntries(MetricsInterceptor.metrics.statusCodes),
      anafRequests: Object.fromEntries(MetricsInterceptor.metrics.anafRequests),
      uptime: Date.now() - MetricsInterceptor.metrics.lastReset.getTime(),
    };
  }

  static getAnafMetrics() {
    return Object.fromEntries(MetricsInterceptor.metrics.anafRequests);
  }

  static resetMetrics() {
    MetricsInterceptor.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimesSum: 0,
      endpointHits: new Map(),
      statusCodes: new Map(),
      anafRequests: new Map(),
      lastReset: new Date(),
    };
  }
}
