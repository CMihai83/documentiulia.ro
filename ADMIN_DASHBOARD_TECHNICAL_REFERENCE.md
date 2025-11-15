# Admin Dashboard - Technical Reference
## Decision Tree Auto-Update System

**Last Updated**: 2025-11-15
**For**: Developers, DevOps, Technical Team

---

## Quick Reference

### API Endpoint
```
POST /api/v1/admin/decision-tree-updates.php
Content-Type: application/json
```

### Frontend Component
```
/var/www/documentiulia.ro/frontend/src/pages/admin/DecisionTreeUpdates.tsx
Route: /admin/decision-tree-updates
Access: Admin role only
```

### Database Tables
```sql
legislation_variables           -- 19 variables
decision_tree_update_points     -- 17 tracked points
decision_tree_update_history    -- Audit trail
pending_tree_updates            -- Review queue
answer_templates                -- Reusable templates
```

---

## API Actions Reference

### 1. Get All Variables
```bash
curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{"action": "get_all_variables"}'
```

**Response**:
```json
{
  "success": true,
  "variables": [
    {
      "id": 1,
      "variable_key": "tva_registration_threshold",
      "variable_name": "Prag înregistrare TVA",
      "current_value": "300000",
      "value_type": "amount",
      "unit": "RON",
      "effective_from": "2016-01-01",
      "last_verified": "2025-11-15 16:54:16.917899"
    }
  ]
}
```

### 2. Get Overdue Points
```bash
curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{"action": "get_overdue_points"}'
```

**Response**:
```json
{
  "success": true,
  "overdue_points": [],
  "summary": [
    {
      "criticality": "critical",
      "count": 0,
      "max_days_overdue": 0
    }
  ],
  "total_count": 0
}
```

### 3. Get Due This Week
```bash
curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{"action": "get_due_this_week"}'
```

### 4. Mark Point as Verified
```bash
curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "mark_verified",
    "point_id": 1
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Update point marked as verified",
  "updated": {
    "id": 1,
    "next_verification_due": "2026-02-15"
  }
}
```

**Side Effects**:
- Updates `last_verified` to NOW()
- Trigger `calculate_next_verification_date()` fires
- `next_verification_due` recalculated based on frequency

### 5. Update Variable
```bash
curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "update_variable",
    "variable_key": "tva_registration_threshold",
    "new_value": "350000",
    "auto_apply": false
  }'
```

**Parameters**:
- `variable_key` (required): Variable identifier
- `new_value` (required): New value as string
- `auto_apply` (optional, default: false):
  - `false`: Create pending updates for review
  - `true`: Apply changes immediately (dangerous!)

**Response**:
```json
{
  "success": true,
  "update_result": {
    "affected_answers": 4,
    "pending_updates": 4,
    "preview": "300.000 → 350.000"
  }
}
```

**Side Effects**:
- Calls SQL function `propagate_variable_update()`
- Finds all answers with `variable_mappings ? 'variable_key'`
- Creates entries in `pending_tree_updates` table
- Does NOT modify answers if `auto_apply=false`

### 6. Get Pending Updates
```bash
curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{"action": "get_pending_updates"}'
```

**Response**:
```json
{
  "success": true,
  "pending_updates": [
    {
      "id": 1,
      "tree_id": 1,
      "tree_name": "TVA Registration",
      "tree_key": "tva_registration_srl",
      "update_point_id": 1,
      "field_name": "answer_text",
      "current_content": "300.000 lei",
      "proposed_content": "350.000 lei",
      "change_type": "variable_update",
      "trigger_source": "tva_registration_threshold",
      "reviewed": false,
      "created_at": "2025-11-15 17:00:00"
    }
  ]
}
```

### 7. Approve Pending Update
```bash
curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "approve_pending_update",
    "update_id": 1,
    "answer_id": 10,
    "review_notes": "Verified against ANAF Cod Fiscal Art. 316"
  }'
```

**Transaction Steps**:
1. Begin transaction
2. Get pending update by ID
3. Update `decision_answers` with `proposed_content`
4. Mark pending update as reviewed/approved
5. Log to `decision_tree_update_history`
6. Commit transaction

**Rollback Conditions**:
- Pending update not found
- Database error during update
- Any exception thrown

### 8. Get Statistics
```bash
curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{"action": "get_statistics"}'
```

**Response**:
```json
{
  "success": true,
  "statistics": [
    {
      "update_category": "threshold",
      "criticality": "critical",
      "total_points": 2,
      "overdue_count": 0,
      "due_this_week": 0,
      "avg_days_since_verification": null
    }
  ]
}
```

### 9. Get Update History
```bash
curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "get_update_history",
    "limit": 50
  }'
```

**Response**:
```json
{
  "success": true,
  "history": [
    {
      "id": 1,
      "tree_id": 1,
      "tree_name": "TVA Registration",
      "update_point_id": 1,
      "answer_id": 10,
      "field_name": "answer_text",
      "old_value": "300.000 lei",
      "new_value": "350.000 lei",
      "change_type": "variable_update",
      "trigger_source": "tva_registration_threshold",
      "auto_applied": false,
      "created_at": "2025-11-15 17:00:00"
    }
  ]
}
```

---

## Database Schema

### legislation_variables
```sql
CREATE TABLE legislation_variables (
    id SERIAL PRIMARY KEY,
    variable_key VARCHAR(100) UNIQUE NOT NULL,
    variable_name VARCHAR(255) NOT NULL,
    current_value TEXT NOT NULL,
    value_type VARCHAR(50) NOT NULL CHECK (value_type IN ('amount', 'percentage', 'days', 'text', 'date')),
    unit VARCHAR(20),
    legislation_id INTEGER REFERENCES fiscal_legislation(id),
    effective_from DATE NOT NULL,
    effective_to DATE,
    source_url TEXT,
    last_verified TIMESTAMP,
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### decision_tree_update_points
```sql
CREATE TABLE decision_tree_update_points (
    id SERIAL PRIMARY KEY,
    tree_id INTEGER REFERENCES decision_trees(id),
    update_category VARCHAR(100) NOT NULL CHECK (update_category IN (
        'threshold', 'deadline', 'tax_rate', 'penalty', 'cost_estimate',
        'processing_time', 'form_requirement', 'procedure_step', 'contact_info'
    )),
    data_point_name VARCHAR(255) NOT NULL,
    current_value TEXT NOT NULL,
    linked_variable_key VARCHAR(100) REFERENCES legislation_variables(variable_key),
    update_frequency VARCHAR(50) NOT NULL CHECK (update_frequency IN (
        'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'on_legislation_change'
    )),
    last_verified TIMESTAMP,
    next_verification_due DATE NOT NULL,
    verification_source TEXT,
    criticality VARCHAR(20) NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    auto_updateable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### decision_tree_update_history
```sql
CREATE TABLE decision_tree_update_history (
    id SERIAL PRIMARY KEY,
    update_point_id INTEGER REFERENCES decision_tree_update_points(id),
    tree_id INTEGER REFERENCES decision_trees(id),
    answer_id INTEGER REFERENCES decision_answers(id),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type VARCHAR(50) NOT NULL,
    trigger_source TEXT,
    auto_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### pending_tree_updates
```sql
CREATE TABLE pending_tree_updates (
    id SERIAL PRIMARY KEY,
    tree_id INTEGER REFERENCES decision_trees(id),
    update_point_id INTEGER REFERENCES decision_tree_update_points(id),
    field_name VARCHAR(100) NOT NULL,
    current_content TEXT,
    proposed_content TEXT NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    trigger_source TEXT,
    reviewed BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## SQL Functions

### propagate_variable_update()
```sql
CREATE OR REPLACE FUNCTION propagate_variable_update(
    p_variable_key VARCHAR,
    p_new_value TEXT,
    p_auto_apply BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
    affected_answers INTEGER,
    pending_updates INTEGER,
    preview TEXT
) AS $$
DECLARE
    v_old_value TEXT;
    v_answer RECORD;
    v_affected_count INTEGER := 0;
    v_pending_count INTEGER := 0;
BEGIN
    -- Get old value
    SELECT current_value INTO v_old_value
    FROM legislation_variables
    WHERE variable_key = p_variable_key;

    -- Find all affected answers
    FOR v_answer IN
        SELECT id, tree_id, answer_text
        FROM decision_answers
        WHERE variable_mappings ? p_variable_key
    LOOP
        v_affected_count := v_affected_count + 1;

        IF p_auto_apply THEN
            -- Direct update (dangerous!)
            UPDATE decision_answers
            SET answer_text = REPLACE(answer_text, v_old_value, p_new_value),
                last_content_update = NOW()
            WHERE id = v_answer.id;
        ELSE
            -- Create pending update
            INSERT INTO pending_tree_updates (
                tree_id, field_name, current_content, proposed_content,
                change_type, trigger_source
            ) VALUES (
                v_answer.tree_id, 'answer_text', v_answer.answer_text,
                REPLACE(v_answer.answer_text, v_old_value, p_new_value),
                'variable_update', p_variable_key
            );
            v_pending_count := v_pending_count + 1;
        END IF;
    END LOOP;

    -- Update variable
    UPDATE legislation_variables
    SET current_value = p_new_value,
        updated_at = NOW()
    WHERE variable_key = p_variable_key;

    RETURN QUERY SELECT
        v_affected_count,
        v_pending_count,
        (v_old_value || ' → ' || p_new_value)::TEXT;
END;
$$ LANGUAGE plpgsql;
```

### calculate_next_verification_date()
```sql
CREATE OR REPLACE FUNCTION calculate_next_verification_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.next_verification_due := CASE NEW.update_frequency
        WHEN 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
        WHEN 'weekly' THEN CURRENT_DATE + INTERVAL '7 days'
        WHEN 'monthly' THEN CURRENT_DATE + INTERVAL '30 days'
        WHEN 'quarterly' THEN CURRENT_DATE + INTERVAL '90 days'
        WHEN 'annual' THEN CURRENT_DATE + INTERVAL '1 year'
        WHEN 'on_legislation_change' THEN CURRENT_DATE + INTERVAL '365 days'
        ELSE CURRENT_DATE + INTERVAL '90 days'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_next_verification_date
    BEFORE INSERT OR UPDATE OF last_verified
    ON decision_tree_update_points
    FOR EACH ROW
    EXECUTE FUNCTION calculate_next_verification_date();
```

---

## Frontend Architecture

### Component Structure
```tsx
/frontend/src/pages/admin/DecisionTreeUpdates.tsx

interface UpdatePoint {
  id: number;
  tree_name: string;
  data_point_name: string;
  current_value: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  days_overdue?: number;
  auto_updateable: boolean;
}

interface Variable {
  id: number;
  variable_key: string;
  variable_name: string;
  current_value: string;
  value_type: string;
  unit: string | null;
  effective_from: string;
  last_verified: string | null;
}

interface UpdateStatistic {
  update_category: string;
  criticality: string;
  total_points: number;
  overdue_count: number;
  due_this_week: number;
  avg_days_since_verification: number | null;
}
```

### State Management
```tsx
const [activeTab, setActiveTab] = useState<'overdue' | 'due-week' | 'variables' | 'stats'>('overdue');
const [overduePoints, setOverduePoints] = useState<UpdatePoint[]>([]);
const [dueThisWeek, setDueThisWeek] = useState<UpdatePoint[]>([]);
const [statistics, setStatistics] = useState<UpdateStatistic[]>([]);
const [variables, setVariables] = useState<Variable[]>([]);
const [loading, setLoading] = useState(true);
```

### API Calls
```tsx
const fetchAllData = async () => {
  setLoading(true);
  try {
    const [overdueRes, dueWeekRes, statsRes, varsRes] = await Promise.all([
      fetch('/api/v1/admin/decision-tree-updates.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_overdue_points' })
      }),
      fetch('/api/v1/admin/decision-tree-updates.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_due_this_week' })
      }),
      fetch('/api/v1/admin/decision-tree-updates.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_statistics' })
      }),
      fetch('/api/v1/admin/decision-tree-updates.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_all_variables' })
      })
    ]);

    const overdueData = await overdueRes.json();
    const dueWeekData = await dueWeekRes.json();
    const statsData = await statsRes.json();
    const varsData = await varsRes.json();

    setOverduePoints(overdueData.overdue_points || []);
    setDueThisWeek(dueWeekData.due_points || []);
    setStatistics(statsData.statistics || []);
    setVariables(varsData.variables || []);
  } catch (error) {
    console.error('Failed to fetch data:', error);
  } finally {
    setLoading(false);
  }
};
```

### Routing Configuration
```tsx
// App.tsx
import DecisionTreeUpdatesPage from './pages/admin/DecisionTreeUpdates';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

<Route
  path="/admin/decision-tree-updates"
  element={
    <AdminRoute>
      <DecisionTreeUpdatesPage />
    </AdminRoute>
  }
/>
```

---

## Deployment

### Build Frontend
```bash
cd /var/www/documentiulia.ro/frontend
npm run build
# Output: dist/ folder with index.html and assets
```

### Deploy to Production
```bash
# Already configured in nginx
# Static files served from /var/www/documentiulia.ro/frontend/dist
sudo systemctl reload nginx
```

### Verify Deployment
```bash
# Test API endpoint
curl -X POST 'http://127.0.0.1/api/v1/admin/decision-tree-updates.php' \
  -H 'Host: documentiulia.ro' \
  -H 'Content-Type: application/json' \
  -d '{"action": "get_all_variables"}' | python3 -m json.tool

# Check frontend build
ls -lh /var/www/documentiulia.ro/frontend/dist/

# Test access
curl -I 'http://127.0.0.1/admin/decision-tree-updates' \
  -H 'Host: documentiulia.ro'
```

---

## Monitoring

### Key Metrics to Track

**Application Health**:
- API response time (<200ms target)
- Error rate (<1% target)
- Active admin sessions

**Data Quality**:
- Overdue critical items (0 target)
- Average verification age (<90 days for critical)
- Pending updates queue size (<10 target)

**System Usage**:
- Variables updated per month
- Update points verified per week
- Admin dashboard sessions per day

### Logging

**API Logs**:
```bash
# Check PHP error log
sudo tail -f /var/log/php-fpm/error.log | grep decision-tree

# Check nginx access log
sudo tail -f /var/log/nginx/access.log | grep decision-tree-updates
```

**Database Logs**:
```sql
-- Recent update history
SELECT * FROM decision_tree_update_history
ORDER BY created_at DESC
LIMIT 20;

-- Pending updates waiting for review
SELECT COUNT(*) FROM pending_tree_updates
WHERE reviewed = FALSE;

-- Overdue critical items
SELECT COUNT(*) FROM overdue_update_points
WHERE criticality = 'critical';
```

---

## Security

### Access Control
- **Route Protection**: AdminRoute component checks `user.role === 'admin'`
- **Database Permissions**: `accountech_app` user has SELECT/UPDATE only
- **API Validation**: Input sanitization on all POST parameters

### CORS Configuration
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
```

**Production TODO**: Restrict origin to specific domain

### SQL Injection Prevention
```php
// All queries use PDO prepared statements
$stmt = $db->prepare("UPDATE decision_tree_update_points SET last_verified = NOW() WHERE id = :point_id");
$stmt->execute(['point_id' => $input['point_id']]);
```

---

## Troubleshooting

### API Returns Empty Response
**Check**:
1. Database connection in `/var/www/documentiulia.ro/api/config/database.php`
2. PHP error log: `sudo tail -f /var/log/php-fpm/error.log`
3. Test direct database connection:
   ```bash
   PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT COUNT(*) FROM legislation_variables;"
   ```

### Frontend Shows "Loading..." Forever
**Check**:
1. Browser console for CORS errors
2. Network tab for failed API calls
3. Verify API endpoint accessible:
   ```bash
   curl -X POST 'http://documentiulia.ro/api/v1/admin/decision-tree-updates.php' \
     -H 'Content-Type: application/json' \
     -d '{"action": "get_all_variables"}'
   ```

### "Mark Verified" Button Fails
**Debug**:
```sql
-- Check if update point exists
SELECT * FROM decision_tree_update_points WHERE id = 1;

-- Check trigger is active
SELECT tgname FROM pg_trigger WHERE tgrelid = 'decision_tree_update_points'::regclass;

-- Manually verify
UPDATE decision_tree_update_points
SET last_verified = NOW()
WHERE id = 1;
```

---

## Performance Optimization

### Database Indexes
```sql
-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_update_points_verification
ON decision_tree_update_points(next_verification_due, criticality);

CREATE INDEX IF NOT EXISTS idx_update_points_category
ON decision_tree_update_points(update_category, criticality);

CREATE INDEX IF NOT EXISTS idx_variables_key
ON legislation_variables(variable_key);

CREATE INDEX IF NOT EXISTS idx_pending_updates_reviewed
ON pending_tree_updates(reviewed, created_at);
```

### Query Optimization
```sql
-- Use views for complex queries
-- Already created: overdue_update_points, update_points_due_this_week, update_points_statistics

-- Example: Get overdue count without full table scan
SELECT COUNT(*) FROM overdue_update_points; -- Uses view materialization
```

### Frontend Optimization
```tsx
// Parallel API calls (already implemented)
const [overdueRes, dueWeekRes, statsRes, varsRes] = await Promise.all([...]);

// Debounce refresh
const debouncedRefresh = useMemo(() =>
  debounce(fetchAllData, 500), []);
```

---

## Testing

### API Testing Script
```bash
#!/bin/bash
# test_admin_api.sh

API_URL="http://documentiulia.ro/api/v1/admin/decision-tree-updates.php"

echo "Testing get_all_variables..."
curl -X POST "$API_URL" -H 'Content-Type: application/json' \
  -d '{"action": "get_all_variables"}' | python3 -m json.tool | head -20

echo -e "\n\nTesting get_overdue_points..."
curl -X POST "$API_URL" -H 'Content-Type: application/json' \
  -d '{"action": "get_overdue_points"}' | python3 -m json.tool

echo -e "\n\nTesting get_statistics..."
curl -X POST "$API_URL" -H 'Content-Type: application/json' \
  -d '{"action": "get_statistics"}' | python3 -m json.tool
```

### Database Testing
```sql
-- Verify all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'decision%' OR table_name = 'legislation_variables';

-- Check data integrity
SELECT
    (SELECT COUNT(*) FROM legislation_variables) as variables_count,
    (SELECT COUNT(*) FROM decision_tree_update_points) as update_points_count,
    (SELECT COUNT(*) FROM decision_tree_update_history) as history_count,
    (SELECT COUNT(*) FROM pending_tree_updates WHERE reviewed = FALSE) as pending_count;
```

---

## Backup & Recovery

### Database Backup
```bash
# Backup auto-update tables
pg_dump -h 127.0.0.1 -U accountech_app -d accountech_production \
  -t legislation_variables \
  -t decision_tree_update_points \
  -t decision_tree_update_history \
  -t pending_tree_updates \
  --clean --if-exists \
  > /tmp/decision_trees_backup_$(date +%Y%m%d).sql
```

### Recovery
```bash
# Restore from backup
psql -h 127.0.0.1 -U accountech_app -d accountech_production \
  < /tmp/decision_trees_backup_20251115.sql
```

---

## Future Enhancements

1. **Bulk Operations**: Update multiple variables at once
2. **Scheduled Verifications**: Automated reminders via email
3. **AI-Powered Detection**: Scan ANAF website for changes
4. **Multi-Language**: Support for Hungarian, English
5. **Mobile App**: React Native admin dashboard
6. **Analytics Dashboard**: Charts for verification trends
7. **Automated Testing**: Playwright E2E tests
8. **Webhooks**: Notify external systems of changes

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Maintained By**: Development Team
