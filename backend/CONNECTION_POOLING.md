# Connection Pooling Optimization - DocumentIulia.ro Backend

## Overview

This document describes the connection pooling optimizations implemented for the DocumentIulia.ro backend to improve database and cache performance under production workloads.

## Implementation Details

### 1. Database Connection Pooling (PostgreSQL + Prisma)

#### Configuration

**Location**: `/root/documentiulia.ro/backend/prisma/schema.prisma`

The Prisma schema has been updated with connection pooling documentation and preview features for enhanced tracing.

**Environment Variables**:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20&pool_timeout=10"
DB_CONNECTION_LIMIT=20
DB_POOL_TIMEOUT=10
```

**Connection Pool Parameters**:
- `connection_limit`: Maximum connections per Prisma Client instance (default: 20)
- `pool_timeout`: Seconds to wait for connection from pool (default: 10)

**Recommended Settings**:
- Formula: `connection_limit = (num_physical_cores * 2) + effective_spindle_count`
- For 8-core server: 20-25 connections
- For 16-core server: 35-40 connections

#### Enhanced Prisma Service

**Location**: `/root/documentiulia.ro/backend/src/prisma/prisma.service.ts`

**Features**:
- Dynamic connection pool configuration via environment variables
- Query performance tracking (duration, slow queries, errors)
- Connection pool metrics from PostgreSQL
- Slow query detection with configurable threshold (default: 100ms)
- Very slow query logging (>1000ms) with full details
- Graceful connection handling and shutdown
- Percentile-based query performance statistics (P50, P95, P99)

**New Methods**:
```typescript
getQueryStats()              // Query performance statistics
getConnectionPoolMetrics()   // PostgreSQL connection pool metrics
healthCheck()                // Enhanced health check with status
getSlowQueryCount()          // Count of slow queries
getErrorCount()              // Count of database errors
```

**Query Statistics Tracked**:
- Total queries executed
- Slow queries (>100ms by default)
- Database errors
- Average, min, max query times
- P50, P95, P99 percentiles
- Queries per second
- Uptime

### 2. Redis Connection Pooling

#### Configuration

**Location**: `/root/documentiulia.ro/backend/src/redis/redis.module.ts`

**Environment Variables**:
```env
REDIS_URL=redis://localhost:6379
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
REDIS_CONNECTION_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=3000
```

#### Redis Service

**Location**: `/root/documentiulia.ro/backend/src/redis/redis.service.ts`

**Features**:
- Automatic reconnection with exponential backoff
- Connection retry logic (max 3 retries by default)
- Connection pooling via Redis client
- Command queue management (max 1000 commands)
- Cache hit/miss ratio tracking
- Comprehensive error handling
- Health check endpoint

**Cache Operations**:
```typescript
get<T>(key: string)                    // Get value from cache
set(key, value, ttlSeconds?)           // Set value with optional TTL
del(key: string)                       // Delete key
delPattern(pattern: string)            // Delete keys matching pattern
exists(key: string)                    // Check if key exists
expire(key, ttlSeconds)                // Set TTL on existing key
incr(key)                              // Increment counter
decr(key)                              // Decrement counter
mget(keys[])                           // Get multiple keys
mset(pairs{})                          // Set multiple key-value pairs
flushAll()                             // Flush all keys (use with caution)
```

**Metrics**:
```typescript
getMetrics()        // Get cache hit/miss statistics
resetMetrics()      // Reset metrics counters
healthCheck()       // Redis health check
getInfo()           // Redis server info
```

**Cache Metrics Tracked**:
- Cache hits
- Cache misses
- Cache sets
- Cache deletes
- Cache errors
- Hit rate percentage

### 3. Health Check Endpoints

**Location**: `/root/documentiulia.ro/backend/src/health/health.controller.ts`

#### Available Endpoints

**Basic Health Check**:
```
GET /health
```
Returns overall health status and service availability.

**Database Health Check**:
```
GET /health/db
```
Returns:
- Database connection status
- Connection pool metrics (active, idle, total, waiting)
- Pool utilization percentage
- Query performance statistics

**Redis Health Check**:
```
GET /health/redis
```
Returns:
- Redis connection status
- Cache metrics (hits, misses, hit rate)
- Redis server info (version, mode, uptime, memory)

**Detailed Health Check**:
```
GET /health/detailed
```
Returns comprehensive metrics including:
- Database health and connection pool
- Redis health and cache metrics
- Application metrics (uptime, requests, memory)
- Environment information
- Query performance percentiles

**Liveness Probe**:
```
GET /health/live
```
Simple liveness check for Kubernetes/Docker.

**Readiness Probe**:
```
GET /health/ready
```
Checks if database is ready to accept connections.

### 4. Performance Monitoring

#### Query Performance Logging

**Slow Query Detection**:
- Queries >100ms: Warning logged
- Queries >1000ms: Error logged with full details

**Query Metrics**:
- Real-time query duration tracking
- Percentile calculations (P50, P95, P99)
- Queries per second
- Total, slow, and error counts

#### Connection Pool Monitoring

**PostgreSQL Metrics**:
- Active connections
- Idle connections
- Total connections
- Waiting requests
- Pool utilization percentage

**Redis Metrics**:
- Connected clients
- Memory usage
- Cache hit/miss ratio
- Command queue depth

## Production Configuration

### Database (PostgreSQL)

For optimal performance on production servers:

1. **8-core server**:
```env
DB_CONNECTION_LIMIT=20
DB_POOL_TIMEOUT=10
```

2. **16-core server**:
```env
DB_CONNECTION_LIMIT=35
DB_POOL_TIMEOUT=10
```

3. **High-traffic scenarios**:
```env
DB_CONNECTION_LIMIT=50
DB_POOL_TIMEOUT=20
```

### Redis

Standard configuration for most use cases:
```env
REDIS_URL=redis://localhost:6379
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
REDIS_CONNECTION_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=3000
```

For high-availability setups, consider using Redis Sentinel or Cluster.

## Monitoring and Alerts

### Recommended Metrics to Monitor

1. **Database**:
   - Connection pool utilization (alert if >80%)
   - Slow query count (alert if increasing)
   - P99 query latency (alert if >500ms)
   - Database errors (alert on any)

2. **Redis**:
   - Cache hit rate (alert if <70%)
   - Connection errors (alert on any)
   - Memory usage (alert if >80%)

3. **Application**:
   - Response times (alert if P95 >1000ms)
   - Error rate (alert if >1%)
   - Memory usage (alert if >80%)

### Health Check Integration

Integrate health endpoints with monitoring tools:

**Prometheus/Grafana**:
```
GET /health/detailed
```

**Kubernetes Probes**:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Docker Healthcheck**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:3001/health || exit 1
```

## Troubleshooting

### High Connection Pool Utilization

**Symptom**: Connection pool >80% utilized
**Solutions**:
- Increase `DB_CONNECTION_LIMIT`
- Optimize slow queries
- Add database indexes
- Implement query caching

### Slow Queries

**Symptom**: Many queries >100ms
**Solutions**:
- Review query execution plans
- Add appropriate indexes
- Optimize N+1 queries
- Use connection pooling
- Implement Redis caching

### Redis Connection Errors

**Symptom**: Redis disconnections or timeouts
**Solutions**:
- Check Redis server health
- Increase `REDIS_CONNECTION_TIMEOUT`
- Verify network connectivity
- Check Redis max clients limit

### Memory Issues

**Symptom**: High memory usage
**Solutions**:
- Reduce `DB_CONNECTION_LIMIT`
- Clear Redis cache
- Optimize query result sizes
- Implement pagination

## Best Practices

1. **Connection Limits**:
   - Don't exceed PostgreSQL's `max_connections` setting
   - Leave headroom for admin connections
   - Consider multiple application instances

2. **Query Optimization**:
   - Use indexes for frequent queries
   - Implement pagination for large result sets
   - Use `select` to limit returned fields
   - Batch operations when possible

3. **Caching Strategy**:
   - Cache frequently accessed data
   - Use appropriate TTLs
   - Invalidate cache on updates
   - Monitor cache hit rates

4. **Error Handling**:
   - Implement retry logic for transient errors
   - Log errors with context
   - Use circuit breakers for external services
   - Graceful degradation on cache failures

5. **Monitoring**:
   - Set up alerts for critical metrics
   - Review slow query logs regularly
   - Monitor connection pool utilization
   - Track cache hit rates

## Testing

### Load Testing

Use the provided k6 scripts to test connection pooling:

```bash
# Basic load test
npm run test:load

# Stress test
npm run test:load:stress

# Spike test
npm run test:load:spike

# Soak test (long duration)
npm run test:load:soak
```

### Health Check Testing

```bash
# Test database health
curl http://localhost:3001/health/db

# Test Redis health
curl http://localhost:3001/health/redis

# Test detailed metrics
curl http://localhost:3001/health/detailed
```

## Migration Guide

### Existing Deployments

1. Update `.env` file with new variables
2. Update Prisma schema
3. Regenerate Prisma client: `npm run prisma:generate`
4. Restart application
5. Monitor health endpoints

### No Breaking Changes

The implementation maintains backward compatibility:
- Existing code continues to work
- Default values provided for all new settings
- Graceful fallback if Redis unavailable

## References

- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Redis Best Practices](https://redis.io/topics/clients)
- [NestJS Performance](https://docs.nestjs.com/techniques/performance)
