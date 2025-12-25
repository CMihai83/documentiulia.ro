import { Module, Global } from '@nestjs/common';
import { AnafUtilsService } from './anaf-utils.service';
import { PerformanceService } from './services/performance.service';
import { PerformanceController } from './controllers/performance.controller';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { GlobalExceptionFilter } from './filters/http-exception.filter';
import { CsrfGuard } from './guards/csrf.guard';
import { RateLimitGuard, RateLimitService } from './guards/rate-limit.guard';


@Global()
@Module({
  controllers: [PerformanceController],
  providers: [
    AnafUtilsService,
    PerformanceService,
    MetricsInterceptor,
    LoggingInterceptor,
    AuditInterceptor,
    CacheInterceptor,
    RateLimitInterceptor,
    GlobalExceptionFilter,
    CsrfGuard,
    RateLimitGuard,
    RateLimitService,
  ],
  exports: [
    AnafUtilsService,
    PerformanceService,
    MetricsInterceptor,
    LoggingInterceptor,
    AuditInterceptor,
    CacheInterceptor,
    RateLimitInterceptor,
    GlobalExceptionFilter,
    CsrfGuard,
    RateLimitGuard,
    RateLimitService,
  ],
})
export class CommonModule {}
