import { NextResponse } from 'next/server';

/**
 * Health Check API - DocumentIulia.ro
 * Production readiness endpoint for monitoring and load balancers
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration?: number;
  }[];
}

// Track server start time for uptime calculation
const startTime = Date.now();

// Backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Check backend API connectivity
async function checkBackendAPI(): Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string; duration: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const duration = Date.now() - start;

    if (response.ok) {
      return { status: 'pass', duration };
    } else {
      return { status: 'warn', message: `Backend returned ${response.status}`, duration };
    }
  } catch (error) {
    const duration = Date.now() - start;
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Backend unreachable',
      duration,
    };
  }
}

// Check memory usage
function checkMemory(): { status: 'pass' | 'fail' | 'warn'; message: string } {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (usagePercent > 90) {
      return { status: 'fail', message: `Heap usage critical: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)` };
    } else if (usagePercent > 75) {
      return { status: 'warn', message: `Heap usage high: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)` };
    }
    return { status: 'pass', message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)` };
  }
  return { status: 'pass', message: 'Memory check not available in this environment' };
}

// Main health check handler
export async function GET() {
  const checks: HealthStatus['checks'] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check 1: Backend API
  const backendCheck = await checkBackendAPI();
  checks.push({
    name: 'backend_api',
    status: backendCheck.status,
    message: backendCheck.message,
    duration: backendCheck.duration,
  });

  if (backendCheck.status === 'fail') {
    overallStatus = 'degraded';
  }

  // Check 2: Memory
  const memoryCheck = checkMemory();
  checks.push({
    name: 'memory',
    status: memoryCheck.status,
    message: memoryCheck.message,
  });

  if (memoryCheck.status === 'fail') {
    overallStatus = 'unhealthy';
  } else if (memoryCheck.status === 'warn' && overallStatus === 'healthy') {
    overallStatus = 'degraded';
  }

  // Check 3: Environment
  const envCheck = {
    status: process.env.NODE_ENV === 'production' ? 'pass' : 'warn',
    message: `Environment: ${process.env.NODE_ENV || 'development'}`,
  };
  checks.push({
    name: 'environment',
    status: envCheck.status as 'pass' | 'warn',
    message: envCheck.message,
  });

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  // Return appropriate HTTP status
  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(healthStatus, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}

// HEAD request for simple health checks (load balancers)
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
