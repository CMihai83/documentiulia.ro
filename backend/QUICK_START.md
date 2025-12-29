# Connection Pooling - Quick Start Guide

## 1. Generate Prisma Client

```bash
cd /root/documentiulia.ro/backend
npm run prisma:generate
```

## 2. Configure Environment

Edit `.env` file (already configured):

```env
# Database Connection Pool (optimized for 8-core server)
DB_CONNECTION_LIMIT=20
DB_POOL_TIMEOUT=10

# Redis Cache
REDIS_URL=redis://localhost:6379
```

## 3. Start Backend

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## 4. Test Health Endpoints

### Basic Health Check
```bash
curl http://localhost:3001/health
```

### Database Health + Connection Pool
```bash
curl http://localhost:3001/health/db
```

### Redis Health + Cache Metrics
```bash
curl http://localhost:3001/health/redis
```

### Comprehensive Metrics
```bash
curl http://localhost:3001/health/detailed
```

## 5. Monitor Performance

### Key Metrics to Watch

**Database**:
- Connection pool utilization: Should stay < 80%
- P99 query latency: Should be < 500ms
- Slow query count: Should be minimal

**Redis**:
- Cache hit rate: Should be > 70%
- Connection status: Should be "healthy"

**Application**:
- Memory usage: Should be stable
- Response times: Should be < 1000ms (P95)

### Example Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-12-12T23:00:00.000Z",
  "services": {
    "database": {
      "status": "healthy",
      "connected": true,
      "latencyMs": 5,
      "connectionPool": {
        "active": 3,
        "idle": 17,
        "total": 20,
        "waiting": 0,
        "limit": 20,
        "utilization": 100
      },
      "queryPerformance": {
        "totalQueries": 1523,
        "slowQueries": 12,
        "avgQueryTime": 45.2,
        "p95QueryTime": 150,
        "p99QueryTime": 320,
        "queriesPerSecond": 15.3
      }
    },
    "redis": {
      "status": "healthy",
      "connected": true,
      "latencyMs": 2,
      "cache": {
        "hits": 856,
        "misses": 144,
        "hitRate": 85.6
      }
    }
  }
}
```

## 6. Using Redis Cache in Your Code

### Import RedisService

```typescript
import { RedisService } from '../redis/redis.service';

@Injectable()
export class YourService {
  constructor(private redis: RedisService) {}
}
```

### Cache Operations

```typescript
// Set cache with 1-hour TTL
await this.redis.set('user:123', userData, 3600);

// Get from cache
const user = await this.redis.get<User>('user:123');

// Delete from cache
await this.redis.del('user:123');

// Delete pattern
await this.redis.delPattern('user:*');

// Check if exists
const exists = await this.redis.exists('user:123');

// Increment counter
await this.redis.incr('page:views');

// Get metrics
const metrics = this.redis.getMetrics();
console.log(`Hit rate: ${metrics.hitRate}%`);
```

## 7. Optimizing Database Queries

### Use Prisma's Connection Pool

The connection pool is automatically managed. Just use Prisma as normal:

```typescript
// Connection is automatically retrieved from pool
const users = await this.prisma.user.findMany();

// Connection is automatically returned to pool after query
```

### Monitor Slow Queries

Slow queries (>100ms) are automatically logged:

```
[Prisma] Slow query detected (245ms): SELECT * FROM "User" WHERE...
```

### Get Query Statistics

```typescript
const stats = this.prisma.getQueryStats();
console.log(`P99 latency: ${stats.p99QueryTime}ms`);
```

## 8. Load Testing

Test your connection pool under load:

```bash
# Basic load test
npm run test:load

# Stress test
npm run test:load:stress

# Spike test
npm run test:load:spike
```

## 9. Production Deployment

### Adjust for Your Server

**For 8-core server** (default):
```env
DB_CONNECTION_LIMIT=20
```

**For 16-core server**:
```env
DB_CONNECTION_LIMIT=35
```

**For high-traffic scenarios**:
```env
DB_CONNECTION_LIMIT=50
DB_POOL_TIMEOUT=20
```

### Kubernetes Deployment

Add health probes to your deployment:

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

## 10. Troubleshooting

### Backend won't start

1. Regenerate Prisma client:
   ```bash
   npm run prisma:generate
   ```

2. Check logs for errors:
   ```bash
   npm run start:dev
   ```

### High connection pool utilization

1. Check metrics:
   ```bash
   curl http://localhost:3001/health/db
   ```

2. Increase connection limit:
   ```env
   DB_CONNECTION_LIMIT=30
   ```

3. Optimize slow queries (check logs)

### Redis connection errors

1. Verify Redis is running:
   ```bash
   redis-cli ping
   ```

2. Check Redis URL in `.env`:
   ```env
   REDIS_URL=redis://localhost:6379
   ```

3. Redis is optional - backend will continue without it

### Slow query warnings

1. Review query execution plans
2. Add database indexes
3. Implement caching for frequent queries
4. Optimize N+1 query patterns

## 11. Best Practices

### Connection Pool
- Monitor utilization (keep < 80%)
- Don't exceed PostgreSQL max_connections
- Leave headroom for admin connections

### Caching
- Cache frequently accessed data
- Use appropriate TTLs (1-24 hours typical)
- Invalidate cache on updates
- Monitor hit rate (target > 70%)

### Monitoring
- Set up alerts for pool utilization > 80%
- Alert on P99 latency > 500ms
- Alert on cache hit rate < 70%
- Review slow query logs daily

### Error Handling
- All Redis operations fail gracefully
- Database errors are logged with context
- Health checks provide diagnostic info
- Connection retries are automatic

## 12. Next Steps

1. Review detailed documentation: `CONNECTION_POOLING.md`
2. Set up monitoring dashboards (Grafana recommended)
3. Configure alerts for critical metrics
4. Optimize queries based on slow query logs
5. Tune connection limits for your workload

## Support

- Detailed docs: `CONNECTION_POOLING.md`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
- Health endpoints: `http://localhost:3001/health/*`
- Logs: Check console output for diagnostics
