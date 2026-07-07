# DocumentIulia.ro Observability Stack

Complete observability solution for production-ready monitoring, logging, tracing, and metrics collection.

## 📊 Stack Components

| Component | Purpose | Port | URL |
|-----------|---------|------|-----|
| **Elasticsearch** | Log storage & search | 9200 | http://localhost:9200 |
| **Logstash** | Log aggregation | 5000, 5044 | http://localhost:9600 |
| **Kibana** | Log visualization | 5601 | http://localhost:5601 |
| **Jaeger** | Distributed tracing | 16686 | http://localhost:16686 |
| **Redis** | Caching & rate limiting | 6379 | redis://localhost:6379 |
| **PostgreSQL** | Primary database | 5432 | postgresql://localhost:5432 |
| **Prometheus** | Metrics collection | 9090 | http://localhost:9090 |
| **Grafana** | Metrics visualization | 3000 | http://localhost:3000 |

## 🚀 Quick Start

### 1. Start All Services

```bash
# Navigate to project root
cd /root/documentiulia.ro

# Start observability stack
docker-compose -f docker-compose.observability.yml up -d

# Check service health
docker-compose -f docker-compose.observability.yml ps

# View logs
docker-compose -f docker-compose.observability.yml logs -f
```

### 2. Verify Services

```bash
# Elasticsearch
curl http://localhost:9200/_cluster/health?pretty

# Kibana
curl http://localhost:5601/api/status

# Jaeger
curl http://localhost:14269/

# Redis
redis-cli ping

# PostgreSQL
psql -h localhost -U documentiulia_user -d documentiulia -c "SELECT version();"

# Prometheus
curl http://localhost:9090/-/healthy

# Grafana
curl http://localhost:3000/api/health
```

### 3. Access Dashboards

- **Kibana (Logs):** http://localhost:5601
  - Username: Not required (security disabled for dev)
  - Navigate to "Discover" → Create index pattern `documentiulia-logs-*`

- **Jaeger (Traces):** http://localhost:16686
  - Service dropdown → Select `documentiulia-backend`
  - View distributed traces with correlation IDs

- **Grafana (Metrics):** http://localhost:3000
  - Username: `admin`
  - Password: `admin_change_me` (change in `.env`)
  - Datasources auto-configured (Prometheus, Elasticsearch, Jaeger)

- **Prometheus:** http://localhost:9090
  - Query metrics: `http_requests_total`, `http_request_duration_seconds`

## 📝 Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# PostgreSQL
POSTGRES_PASSWORD=your_secure_password_here

# Grafana
GRAFANA_PASSWORD=admin_secure_password

# Elasticsearch (Production)
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=changeme

# S3 Backups (Optional)
S3_ENABLED=true
S3_ENDPOINT=https://storage.bunnycdn.com
S3_BUCKET=documentiulia-backups
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
```

### NestJS Backend Configuration

Update `backend/.env`:

```bash
# Logging
LOG_LEVEL=info
NODE_ENV=production

# Elasticsearch
ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=changeme

# Jaeger
JAEGER_AGENT_HOST=localhost
JAEGER_AGENT_PORT=6831
JAEGER_SAMPLER_TYPE=probabilistic
JAEGER_SAMPLER_PARAM=0.1  # 10% sampling

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Grok AI (x.ai)
XAI_API_KEY=your_xai_api_key_here
```

## 🔍 Logging

### Log Levels

- **error:** Application errors, exceptions, crashes
- **warn:** Warnings, slow queries, slow responses (>1s)
- **info:** General information, HTTP requests/responses
- **debug:** Detailed debugging information
- **verbose:** Very detailed logging for troubleshooting

### Log Indices

| Index Pattern | Purpose | Retention |
|---------------|---------|-----------|
| `documentiulia-logs-*` | All application logs | 30 days |
| `documentiulia-errors-*` | Error logs only | 90 days |
| `documentiulia-anaf-*` | ANAF compliance logs | 10 years |
| `documentiulia-security-*` | Security events | 5 years |

### Correlation IDs

All HTTP requests/responses include `X-Correlation-ID` header for distributed tracing:

```bash
curl -H "X-Correlation-ID: test-123" http://localhost:3001/api/health
```

Search logs in Kibana by correlation ID:
```
correlationId: "test-123"
```

### Structured Logging Example

```typescript
import { CentralizedLoggingService } from './common/logging/centralized-logging.service';

export class InvoiceService {
  constructor(private logger: CentralizedLoggingService) {
    this.logger.setContext('InvoiceService');
  }

  async createInvoice(data: CreateInvoiceDto) {
    this.logger.log('Creating invoice', { data });

    try {
      const invoice = await this.repository.create(data);

      this.logger.logBusinessEvent(
        'invoice.created',
        'Invoice',
        invoice.id,
        { amount: invoice.amount, customerId: invoice.customerId }
      );

      return invoice;
    } catch (error) {
      this.logger.error('Failed to create invoice', error.stack, { data });
      throw error;
    }
  }
}
```

## 🔬 Distributed Tracing

### Jaeger Integration

Traces capture:
- HTTP requests (method, URL, status, duration)
- Database queries (query, duration, row count)
- External API calls (ANAF, SAGA, banks)
- Background jobs (processing time, success/failure)

### View Traces

1. Open Jaeger UI: http://localhost:16686
2. Select service: `documentiulia-backend`
3. Find traces by:
   - Operation: `GET /api/invoices`
   - Tags: `correlationId=xxx`, `userId=xxx`
   - Duration: `>1s` (slow requests)

### Trace Propagation

Correlation IDs automatically propagate across services:

```
Frontend → Backend → Database → ANAF API
   └─────────── X-Correlation-ID ──────────┘
```

## 📈 Metrics

### Prometheus Metrics

Auto-collected metrics:

- **HTTP Metrics:**
  - `http_requests_total` (counter)
  - `http_request_duration_seconds` (histogram)
  - `http_requests_in_progress` (gauge)

- **Database Metrics:**
  - `db_query_duration_seconds` (histogram)
  - `db_connections_active` (gauge)
  - `db_queries_total` (counter)

- **Business Metrics:**
  - `invoices_created_total` (counter)
  - `payments_processed_total` (counter)
  - `anaf_api_calls_total` (counter)

### Custom Metrics

```typescript
import { Registry, Counter, Histogram } from 'prom-client';

const invoiceCounter = new Counter({
  name: 'invoices_created_total',
  help: 'Total number of invoices created',
  labelNames: ['status', 'customerId'],
});

invoiceCounter.inc({ status: 'draft', customerId: '123' });
```

### Grafana Dashboards

Pre-configured dashboards:

1. **Application Overview:**
   - Request rate, error rate, latency (p50, p95, p99)
   - Active users, API calls/min

2. **Database Performance:**
   - Query duration, connection pool, slow queries
   - Transaction rate, deadlocks

3. **ANAF Integration:**
   - e-Factura submissions, D406 reports, SPV status
   - Success rate, error types

4. **System Resources:**
   - CPU, memory, disk usage
   - Network I/O, container stats

## 🔐 Security & Compliance

### GDPR Compliance

- **PII Redaction:** Passwords, tokens, CIF, IBAN auto-redacted in logs
- **Log Retention:** 30 days general, 10 years for financial/compliance
- **Data Export:** Users can request log data via API
- **Data Deletion:** Anonymization after retention period

### Security Logging

All security events logged to `documentiulia-security-*`:

- Authentication attempts (success/failure)
- Authorization failures (403 errors)
- Suspicious activity (brute-force, unusual patterns)
- Admin actions (user creation, permission changes)

### Audit Trail

Immutable audit logs for compliance:

```typescript
this.logger.logBusinessEvent(
  'invoice.deleted',
  'Invoice',
  invoiceId,
  {
    userId: req.user.id,
    reason: 'User requested deletion',
    ipAddress: req.ip,
  }
);
```

## 🛠 Maintenance

### Backup PostgreSQL

```bash
# Manual full backup
./scripts/backup-postgres.sh full

# Manual incremental backup
./scripts/backup-postgres.sh incremental

# Setup automated daily backups (cron)
crontab -e
# Add:  0 2 * * * /root/documentiulia.ro/scripts/backup-postgres.sh full >> /var/log/backup-postgres.log 2>&1
```

### Restore PostgreSQL

```bash
# Find latest backup
ls -lh /backups/postgres/

# Decrypt backup (if encrypted)
gpg --decrypt /backups/postgres/documentiulia_full_20251227_020000.sql.gz.gpg > /tmp/backup.sql.gz

# Decompress
gunzip /tmp/backup.sql.gz

# Restore
psql -h localhost -U documentiulia_user -d documentiulia < /tmp/backup.sql
```

### Clean Up Old Logs

```bash
# Delete Elasticsearch indices older than 30 days
curl -X DELETE "localhost:9200/documentiulia-logs-2024.11.*"

# Automated cleanup (curator)
pip install elasticsearch-curator
curator --config curator.yml delete_indices.yml
```

### Scale Services

```bash
# Increase Elasticsearch memory
docker-compose -f docker-compose.observability.yml stop elasticsearch
# Edit docker-compose.observability.yml: ES_JAVA_OPTS=-Xms1g -Xmx1g
docker-compose -f docker-compose.observability.yml up -d elasticsearch

# Add Logstash workers
# Edit observability/logstash/config/logstash.yml: pipeline.workers: 4
docker-compose -f docker-compose.observability.yml restart logstash
```

## 🚨 Troubleshooting

### Elasticsearch Not Starting

```bash
# Check logs
docker logs documentiulia-elasticsearch

# Common issues:
# 1. Insufficient memory: Increase ES_JAVA_OPTS in docker-compose
# 2. Disk full: Clean up old indices
# 3. Permission issues: chown -R 1000:1000 /var/lib/docker/volumes/documentiulia-elasticsearch-data
```

### Logs Not Appearing in Kibana

```bash
# Test Logstash input
echo '{"message": "test", "level": "info"}' | nc localhost 5000

# Check Logstash logs
docker logs documentiulia-logstash

# Verify Elasticsearch indices
curl http://localhost:9200/_cat/indices?v
```

### Jaeger Traces Missing

```bash
# Check Jaeger health
curl http://localhost:14269/

# Verify sampling rate (increase for development)
# backend/.env: JAEGER_SAMPLER_PARAM=1.0  # 100% sampling

# Check backend logs for tracing errors
docker logs documentiulia-backend | grep -i jaeger
```

### High Memory Usage

```bash
# Check container resource usage
docker stats

# Limit container memory in docker-compose.observability.yml:
#   mem_limit: 512m

# Restart services
docker-compose -f docker-compose.observability.yml restart
```

## 📚 Additional Resources

- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana User Guide](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Tutorials](https://grafana.com/tutorials/)

## 🤝 Support

For issues or questions:
1. Check logs: `docker-compose -f docker-compose.observability.yml logs -f`
2. GitHub Issues: https://github.com/anthropics/documentiulia-ro/issues
3. Email: support@documentIulia.ro

---

**Version:** 1.0.0
**Last Updated:** December 27, 2025
**Maintained By:** DocumentIulia.ro DevOps Team
