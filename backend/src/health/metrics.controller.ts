import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

interface MetricValue {
  value: number;
  labels?: Record<string, string>;
}

interface Metrics {
  [key: string]: MetricValue | MetricValue[];
}

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  private startTime: number;

  constructor(private readonly prisma: PrismaService) {
    this.startTime = Date.now();
  }

  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus formatted metrics' })
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.collectMetrics();
    const prometheusFormat = this.formatPrometheus(metrics);

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(prometheusFormat);
  }

  @Get('json')
  @ApiOperation({ summary: 'JSON metrics endpoint' })
  @ApiResponse({ status: 200, description: 'JSON formatted metrics' })
  async getMetricsJson(): Promise<Metrics> {
    return this.collectMetrics();
  }

  private async collectMetrics(): Promise<Metrics> {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startTime) / 1000);

    // Database metrics
    let dbMetrics = {
      invoices_total: 0,
      invoices_issued: 0,
      invoices_received: 0,
      invoices_paid: 0,
      invoices_overdue: 0,
      users_total: 0,
      documents_total: 0,
      partners_total: 0,
    };

    try {
      const [
        invoicesTotal,
        invoicesIssued,
        invoicesReceived,
        invoicesPaid,
        invoicesOverdue,
        usersTotal,
        documentsTotal,
        partnersTotal,
      ] = await Promise.all([
        this.prisma.invoice.count(),
        this.prisma.invoice.count({ where: { type: 'ISSUED' } }),
        this.prisma.invoice.count({ where: { type: 'RECEIVED' } }),
        this.prisma.invoice.count({ where: { status: 'PAID' } }),
        this.prisma.invoice.count({
          where: {
            status: { in: ['DRAFT', 'SUBMITTED'] },
            dueDate: { lt: new Date() },
          },
        }),
        this.prisma.user.count(),
        this.prisma.document.count(),
        this.prisma.partner.count(),
      ]);

      dbMetrics = {
        invoices_total: invoicesTotal,
        invoices_issued: invoicesIssued,
        invoices_received: invoicesReceived,
        invoices_paid: invoicesPaid,
        invoices_overdue: invoicesOverdue,
        users_total: usersTotal,
        documents_total: documentsTotal,
        partners_total: partnersTotal,
      };
    } catch {
      // Database might not be ready
    }

    // Process metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      // Application info
      documentiulia_info: {
        value: 1,
        labels: {
          version: process.env.npm_package_version || '1.0.0',
          node_version: process.version,
          environment: process.env.NODE_ENV || 'development',
        },
      },

      // Uptime
      documentiulia_uptime_seconds: { value: uptimeSeconds },

      // Memory metrics
      documentiulia_memory_heap_used_bytes: { value: memoryUsage.heapUsed },
      documentiulia_memory_heap_total_bytes: { value: memoryUsage.heapTotal },
      documentiulia_memory_rss_bytes: { value: memoryUsage.rss },
      documentiulia_memory_external_bytes: { value: memoryUsage.external },

      // CPU metrics
      documentiulia_cpu_user_microseconds: { value: cpuUsage.user },
      documentiulia_cpu_system_microseconds: { value: cpuUsage.system },

      // Business metrics
      documentiulia_invoices_total: [
        { value: dbMetrics.invoices_total, labels: { type: 'all' } },
        { value: dbMetrics.invoices_issued, labels: { type: 'issued' } },
        { value: dbMetrics.invoices_received, labels: { type: 'received' } },
      ],
      documentiulia_invoices_status: [
        { value: dbMetrics.invoices_paid, labels: { status: 'paid' } },
        { value: dbMetrics.invoices_overdue, labels: { status: 'overdue' } },
      ],
      documentiulia_users_total: { value: dbMetrics.users_total },
      documentiulia_documents_total: { value: dbMetrics.documents_total },
      documentiulia_partners_total: { value: dbMetrics.partners_total },
    };
  }

  private formatPrometheus(metrics: Metrics): string {
    const lines: string[] = [];

    for (const [name, data] of Object.entries(metrics)) {
      if (Array.isArray(data)) {
        // Multiple values with labels
        lines.push(`# HELP ${name} ${name.replace(/_/g, ' ')}`);
        lines.push(`# TYPE ${name} gauge`);
        for (const item of data) {
          const labelsStr = item.labels
            ? `{${Object.entries(item.labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',')}}`
            : '';
          lines.push(`${name}${labelsStr} ${item.value}`);
        }
      } else {
        // Single value
        lines.push(`# HELP ${name} ${name.replace(/_/g, ' ')}`);
        lines.push(`# TYPE ${name} gauge`);
        const labelsStr = data.labels
          ? `{${Object.entries(data.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')}}`
          : '';
        lines.push(`${name}${labelsStr} ${data.value}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
