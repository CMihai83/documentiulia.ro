import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MetricsInterceptor } from '../common/interceptors/metrics.interceptor';
import axios from 'axios';

interface DependencyStatus {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  latencyMs?: number;
  message?: string;
  lastChecked: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    const checks = {
      status: 'ok' as 'ok' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: 'unknown',
      },
      version: '1.0.0',
      compliance: {
        anaf: 'Order 1783/2021',
        vat: 'Legea 141/2025',
        efactura: 'UBL 2.1',
      },
    };

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.services.database = 'healthy';
    } catch (error) {
      checks.services.database = 'unhealthy';
      checks.status = 'degraded';
    }

    return checks;
  }

  @Get('dependencies')
  @ApiOperation({ summary: 'Check external dependencies health' })
  @ApiResponse({ status: 200, description: 'Returns external dependency status' })
  async checkDependencies() {
    const dependencies: Record<string, DependencyStatus> = {};
    let overallStatus: 'ok' | 'degraded' | 'unhealthy' = 'ok';

    // Check Database
    dependencies.database = await this.checkDatabase();
    if (dependencies.database.status === 'unhealthy') overallStatus = 'unhealthy';
    else if (dependencies.database.status === 'degraded' && overallStatus === 'ok') overallStatus = 'degraded';

    // Check ANAF e-Factura API
    dependencies.anaf_efactura = await this.checkAnafEfactura();
    if (dependencies.anaf_efactura.status === 'unhealthy' && overallStatus === 'ok') overallStatus = 'degraded';

    // Check ANAF SPV Portal
    dependencies.anaf_spv = await this.checkAnafSpv();
    if (dependencies.anaf_spv.status === 'unhealthy' && overallStatus === 'ok') overallStatus = 'degraded';

    // Check Redis (if configured)
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      dependencies.redis = await this.checkRedis(redisUrl);
      if (dependencies.redis.status === 'unhealthy' && overallStatus === 'ok') overallStatus = 'degraded';
    }

    // Check Grok AI API
    const grokApiKey = this.configService.get<string>('GROK_API_KEY');
    if (grokApiKey) {
      dependencies.grok_ai = await this.checkGrokApi();
      if (dependencies.grok_ai.status === 'unhealthy' && overallStatus === 'ok') overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      dependencies,
      summary: {
        total: Object.keys(dependencies).length,
        healthy: Object.values(dependencies).filter(d => d.status === 'healthy').length,
        degraded: Object.values(dependencies).filter(d => d.status === 'degraded').length,
        unhealthy: Object.values(dependencies).filter(d => d.status === 'unhealthy').length,
        unknown: Object.values(dependencies).filter(d => d.status === 'unknown').length,
      },
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return {
        status: latencyMs > 1000 ? 'degraded' : 'healthy',
        latencyMs,
        message: latencyMs > 1000 ? 'High latency detected' : 'Connection successful',
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: `Database connection failed: ${error.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkAnafEfactura(): Promise<DependencyStatus> {
    const start = Date.now();
    const efacturaUrl = this.configService.get<string>('ANAF_EFACTURA_URL') || 'https://api.anaf.ro/efactura';
    try {
      // Just check if the endpoint responds (no auth required for ping)
      const response = await axios.get(`${efacturaUrl}/test/echo/ping`, {
        timeout: 5000,
        validateStatus: () => true, // Accept any status
      });
      const latencyMs = Date.now() - start;

      // ANAF test endpoint may return various codes
      const isHealthy = response.status < 500;
      return {
        status: isHealthy ? (latencyMs > 2000 ? 'degraded' : 'healthy') : 'unhealthy',
        latencyMs,
        message: isHealthy ? 'ANAF e-Factura API responding' : `HTTP ${response.status}`,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unknown',
        latencyMs: Date.now() - start,
        message: `Cannot reach ANAF e-Factura: ${error.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkAnafSpv(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      // Check if SPV portal is accessible
      const response = await axios.get('https://www.anaf.ro/anaf/internet/ANAF/servicii_online/Servicii_in_punct_fix_virtual/', {
        timeout: 5000,
        validateStatus: () => true,
      });
      const latencyMs = Date.now() - start;

      return {
        status: response.status < 500 ? 'healthy' : 'unhealthy',
        latencyMs,
        message: response.status < 500 ? 'ANAF SPV portal accessible' : `HTTP ${response.status}`,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unknown',
        latencyMs: Date.now() - start,
        message: `Cannot reach ANAF SPV: ${error.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkRedis(redisUrl: string): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      // Basic check - just try to connect
      const url = new URL(redisUrl);
      const net = await import('net');

      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);

        socket.on('connect', () => {
          const latencyMs = Date.now() - start;
          socket.destroy();
          resolve({
            status: 'healthy',
            latencyMs,
            message: 'Redis connection successful',
            lastChecked: new Date().toISOString(),
          });
        });

        socket.on('error', (err) => {
          resolve({
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            message: `Redis connection failed: ${err.message}`,
            lastChecked: new Date().toISOString(),
          });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            message: 'Redis connection timeout',
            lastChecked: new Date().toISOString(),
          });
        });

        socket.connect(parseInt(url.port || '6379'), url.hostname);
      });
    } catch (error) {
      return {
        status: 'unknown',
        latencyMs: Date.now() - start,
        message: `Redis check error: ${error.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkGrokApi(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      // Just check if Grok API is reachable (don't make actual API call)
      const response = await axios.get('https://api.x.ai/v1', {
        timeout: 5000,
        validateStatus: () => true,
      });
      const latencyMs = Date.now() - start;

      // Any response indicates the API is reachable
      return {
        status: latencyMs > 3000 ? 'degraded' : 'healthy',
        latencyMs,
        message: 'Grok AI API reachable',
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unknown',
        latencyMs: Date.now() - start,
        message: `Cannot reach Grok API: ${error.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch {
      return { ready: false };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { live: true, timestamp: new Date().toISOString() };
  }

  @Get('db')
  @ApiOperation({ summary: 'Database health check with connection pool metrics' })
  @ApiResponse({ status: 200, description: 'Returns database health and pool metrics' })
  async getDatabaseHealth() {
    const health = await this.checkDatabase();
    return {
      timestamp: new Date().toISOString(),
      database: health,
    };
  }

  @Get('redis')
  @ApiOperation({ summary: 'Redis health check' })
  @ApiResponse({ status: 200, description: 'Returns Redis health status' })
  async getRedisHealth() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const health = await this.checkRedis(redisUrl);
    return {
      timestamp: new Date().toISOString(),
      redis: health,
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with all metrics' })
  @ApiResponse({ status: 200, description: 'Returns comprehensive health and performance metrics' })
  async detailedCheck() {
    const dbHealth = await this.checkDatabase();
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const redisHealth = await this.checkRedis(redisUrl);
    const memoryUsage = process.memoryUsage();

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Determine overall status
    if (dbHealth.status === 'unhealthy' || redisHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (dbHealth.status === 'degraded' || redisHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
      application: {
        uptime: Math.floor(process.uptime()),
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        },
        nodeVersion: process.version,
      },
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Application metrics' })
  @ApiResponse({ status: 200, description: 'Returns application metrics' })
  getMetrics() {
    const metrics = MetricsInterceptor.getMetrics();
    const memoryUsage = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      requests: {
        total: metrics.totalRequests,
        successful: metrics.successfulRequests,
        failed: metrics.failedRequests,
        averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
      },
      endpoints: metrics.endpointHits,
      statusCodes: metrics.statusCodes,
      uptime: {
        milliseconds: metrics.uptime,
        formatted: this.formatUptime(metrics.uptime),
      },
      memory: {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
      },
      lastReset: metrics.lastReset,
    };
  }

  @Post('metrics/reset')
  @ApiOperation({ summary: 'Reset application metrics' })
  @ApiResponse({ status: 200, description: 'Metrics reset successfully' })
  resetMetrics() {
    MetricsInterceptor.resetMetrics();
    return { success: true, message: 'Metrics reset successfully' };
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}
