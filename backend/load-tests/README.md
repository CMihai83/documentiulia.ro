# DocumentIulia.ro - Load Testing Suite

Performance and load testing suite using k6 for the DocumentIulia.ro ERP platform.

## Performance Targets (per Grok Guidelines)

| Metric | Target | Threshold |
|--------|--------|-----------|
| API Response Time (p95) | < 200ms | < 500ms |
| Error Rate | < 1% | < 5% |
| Concurrent Users | 1,000 | 10,000 |
| Database Queries (p90) | < 50ms | < 100ms |
| Page Load | < 2s | < 3s |

## Prerequisites

```bash
# Install k6
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Available Tests

### 1. Integration Load Test
Tests cross-module integration endpoints (HR→Finance, Logistics→Finance, LMS→HR).

```bash
# Default load test (100 concurrent users)
k6 run integration-load-test.js

# With custom API URL
k6 run --env API_URL=http://localhost:3001/api integration-load-test.js
```

### 2. Full API Load Test
Comprehensive testing of all major API endpoints.

```bash
# Load test (default)
k6 run api-load-test.js

# Smoke test (1 user, 1 minute)
k6 run --env SCENARIO=smoke api-load-test.js

# Stress test (up to 1000 users)
k6 run --env SCENARIO=stress api-load-test.js

# Spike test (sudden traffic spike)
k6 run --env SCENARIO=spike api-load-test.js

# Soak test (30 minutes sustained load)
k6 run --env SCENARIO=soak api-load-test.js
```

## Test Scenarios

| Scenario | VUs | Duration | Use Case |
|----------|-----|----------|----------|
| smoke | 1 | 1m | Basic functionality check |
| load | 50→100→0 | 9m | Normal expected load |
| stress | 100→500→1000→0 | 14m | Beyond normal capacity |
| spike | 50→500→50→0 | 4m | Sudden traffic spike |
| soak | 100 | 30m | Extended duration |

## Running with Docker

```bash
# Run integration test
docker run -i grafana/k6 run - <integration-load-test.js

# Run with environment variables
docker run -i -e API_URL=http://host.docker.internal:3001/api grafana/k6 run - <api-load-test.js
```

## Output Files

After each test run:
- `*-results.json` - Full metrics data
- `*-summary.html` - HTML report with visual summary

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Load Tests
  uses: grafana/k6-action@v0.3.0
  with:
    filename: backend/load-tests/api-load-test.js
  env:
    API_URL: ${{ secrets.STAGING_API_URL }}
```

## Custom Metrics

| Metric | Description |
|--------|-------------|
| `finance_latency` | Finance module response times |
| `hr_latency` | HR module response times |
| `logistics_latency` | Logistics module response times |
| `database_latency` | Database operation times |
| `cache_latency` | Cache operation times |
| `event_publish_time` | Event bus publish times |
| `metrics_aggregation_time` | Dashboard metrics aggregation |
| `audit_query_time` | Audit trail query times |

## Interpreting Results

### Pass Criteria
- ✅ HTTP request duration p95 < 200ms
- ✅ Error rate < 1%
- ✅ Checks pass rate > 95%

### Warning Signs
- ⚠️ p95 between 200-500ms
- ⚠️ Error rate between 1-5%
- ⚠️ Memory usage > 80%

### Failure Indicators
- ❌ p95 > 500ms
- ❌ Error rate > 5%
- ❌ Checks pass rate < 90%

## Troubleshooting

### High Latency
1. Check database query optimization (EXPLAIN ANALYZE)
2. Verify Redis cache hit rate
3. Review slow query logs
4. Check for N+1 query problems

### High Error Rate
1. Check server logs for exceptions
2. Verify database connections
3. Check rate limiting configuration
4. Review memory/CPU usage

### Connection Issues
1. Verify API_URL is correct
2. Check firewall/network settings
3. Confirm server is running
4. Check SSL certificate validity

## Performance Optimization Tips

1. **Database**: Add indexes, use read replicas
2. **Caching**: Increase Redis cache TTL for static data
3. **API**: Implement pagination, limit response sizes
4. **Frontend**: Use CDN, lazy loading, code splitting
