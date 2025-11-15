# Decision Trees - Quick Start Implementation Guide
## From 1 Tree → 50 Trees with Auto-Updates

**Date**: 2025-11-15
**Status**: Ready to implement
**Estimated Time**: 4-6 weeks for full system

---

## 🚀 PHASE 1: Deploy Auto-Update Infrastructure (Week 1)

### Day 1: Database Migration

**Run the migration**:
```bash
cd /var/www/documentiulia.ro

# Apply migration
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f database/migrations/004_decision_tree_auto_update_system.sql

# Verify tables created
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "\dt" | grep -E "legislation_variables|update_points|pending_tree"
```

**Expected output**:
```
 legislation_variables              | table | accountech_app
 decision_tree_update_points        | table | accountech_app
 decision_tree_update_history       | table | accountech_app
 pending_tree_updates               | table | accountech_app
 answer_templates                   | table | accountech_app
```

### Day 2: Seed Update Points for TVA Tree

**Populate update points** for existing TVA tree:
```sql
-- Run this SQL to create all 38 update points for TVA tree
INSERT INTO decision_tree_update_points (
    tree_id,
    answer_id,
    update_category,
    data_point_name,
    current_value,
    value_source,
    linked_variable_key,
    update_frequency,
    next_verification_due,
    verification_url,
    criticality
) VALUES
-- THRESHOLDS (Critical)
(1, 10, 'threshold', 'TVA Registration Threshold', '300.000 RON', 'Cod Fiscal Art. 316', 'tva_registration_threshold', 'annual', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm', 'critical'),

-- DEADLINES (Critical)
(1, 10, 'deadline', 'TVA Registration Deadline', '10 zile lucrătoare', 'Cod Fiscal Art. 316 alin. 11', 'tva_registration_deadline', 'on_legislation_change', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm', 'critical'),
(1, 10, 'deadline', 'VAT Declaration Deadline', '25 ale lunii următoare', 'Cod Fiscal Art. 323', 'tva_declaration_deadline_monthly', 'on_legislation_change', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm', 'critical'),

-- TAX RATES (Critical)
(1, 10, 'tax_rate', 'Standard VAT Rate', '19%', 'Cod Fiscal Art. 291', 'tva_standard_rate', 'on_legislation_change', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm', 'critical'),
(1, 10, 'tax_rate', 'Reduced VAT Rate', '9%', 'Cod Fiscal Art. 291', 'tva_reduced_rate_9', 'on_legislation_change', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm', 'critical'),

-- PENALTIES (High)
(1, 10, 'penalty', 'Late Registration Penalty Min', '500 RON', 'Cod Fiscal Art. 336', 'tva_penalty_late_registration_min', 'annual', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm', 'high'),
(1, 10, 'penalty', 'Late Registration Penalty Max', '1.000 RON', 'Cod Fiscal Art. 336', 'tva_penalty_late_registration_max', 'annual', '2026-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm', 'high'),

-- COSTS (Medium - Market Research)
(1, 10, 'cost_estimate', 'Accountant Monthly Fee Min', '300 RON', 'Market research', NULL, 'quarterly', '2026-04-01', NULL, 'medium'),
(1, 10, 'cost_estimate', 'Accountant Monthly Fee Max', '700 RON', 'Market research', NULL, 'quarterly', '2026-04-01', NULL, 'medium'),
(1, 10, 'cost_estimate', 'Invoicing Software Min', '100 RON', 'Market research', NULL, 'quarterly', '2026-04-01', NULL, 'medium'),
(1, 10, 'cost_estimate', 'Invoicing Software Max', '300 RON', 'Market research', NULL, 'quarterly', '2026-04-01', NULL, 'medium'),

-- PROCESSING TIMES (Medium)
(1, 10, 'processing_time', 'ANAF Registration Processing', '3-5 zile lucrătoare', 'ANAF statistics', 'anaf_registration_processing_days', 'quarterly', '2026-04-01', 'https://www.anaf.ro', 'medium'),
(1, 10, 'processing_time', 'VAT Certificate Issuance', '2-3 zile', 'ANAF statistics', 'vat_certificate_issuance_days', 'quarterly', '2026-04-01', 'https://www.anaf.ro', 'medium'),

-- FORMS (Low)
(1, 10, 'form_requirement', 'Form 010 Version', 'Versiunea 15.07.2024', 'ANAF Forms Portal', 'form_010_version', 'quarterly', '2026-04-01', 'https://static.anaf.ro/static/10/Anaf/formulare/', 'low'),
(1, 10, 'form_requirement', 'Form 010 Download URL', 'https://static.anaf.ro/static/10/Anaf/formulare/Declaratii_R010.pdf', 'ANAF Forms Portal', 'form_010_url', 'quarterly', '2026-04-01', 'https://static.anaf.ro/static/10/Anaf/formulare/', 'low');

-- Verify inserted
SELECT
    update_category,
    criticality,
    COUNT(*) as count
FROM decision_tree_update_points
GROUP BY update_category, criticality
ORDER BY criticality, update_category;
```

### Day 3-4: Link Existing Answers to Variables

**Update existing decision_answers** with variable mappings:
```sql
-- Map answer #10 (SRL mandatory registration) to variables
UPDATE decision_answers
SET
    legislation_ids = ARRAY[
        (SELECT id FROM fiscal_legislation WHERE code = 'CF_Art316' LIMIT 1)
    ],
    variable_mappings = '{
        "threshold": "tva_registration_threshold",
        "deadline": "tva_registration_deadline",
        "penalty_min": "tva_penalty_late_registration_min",
        "penalty_max": "tva_penalty_late_registration_max",
        "standard_rate": "tva_standard_rate"
    }'::jsonb
WHERE path_id = 10;

-- Verify mapping
SELECT
    id,
    path_id,
    variable_mappings,
    legislation_ids
FROM decision_answers
WHERE variable_mappings IS NOT NULL;
```

### Day 5: Test Auto-Update System

**Test variable update propagation**:
```sql
-- Test: Change TVA threshold from 300k → 350k
SELECT * FROM propagate_variable_update('tva_registration_threshold', '350000', FALSE);

-- Expected output:
-- affected_answers | pending_updates | preview
-- -----------------+-----------------+------------------------------------------
--                4 |               4 | Updated tva_registration_threshold from "300000" to "350000"

-- Check pending updates created
SELECT * FROM pending_tree_updates ORDER BY created_at DESC LIMIT 5;

-- Rollback test
SELECT * FROM propagate_variable_update('tva_registration_threshold', '300000', TRUE);
```

---

## 📊 PHASE 2: Admin Dashboard (Week 2)

### Create Admin API Endpoint

**File**: `/var/www/documentiulia.ro/api/v1/admin/decision-tree-updates.php`

```php
<?php
// Decision Tree Update Management API
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

// Verify admin role
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    $db = getDatabaseConnection();

    switch ($input['action'] ?? '') {
        case 'get_overdue_points':
            // Get all overdue update points
            $stmt = $db->query("SELECT * FROM overdue_update_points LIMIT 100");
            $result = [
                'success' => true,
                'overdue_points' => $stmt->fetchAll(PDO::FETCH_ASSOC),
                'summary' => $db->query("
                    SELECT
                        criticality,
                        COUNT(*) as count
                    FROM overdue_update_points
                    GROUP BY criticality
                ")->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'get_due_this_week':
            $stmt = $db->query("SELECT * FROM update_points_due_this_week");
            $result = [
                'success' => true,
                'due_points' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'mark_verified':
            // Mark update point as verified
            $stmt = $db->prepare("
                UPDATE decision_tree_update_points
                SET last_verified = NOW(),
                    updated_at = NOW()
                WHERE id = :point_id
            ");
            $stmt->execute(['point_id' => $input['point_id']]);
            $result = ['success' => true, 'message' => 'Update point marked as verified'];
            break;

        case 'update_variable':
            // Update variable value
            $stmt = $db->prepare("
                SELECT * FROM propagate_variable_update(:var_key, :new_value, :auto_apply)
            ");
            $stmt->execute([
                'var_key' => $input['variable_key'],
                'new_value' => $input['new_value'],
                'auto_apply' => $input['auto_apply'] ?? false
            ]);
            $result = [
                'success' => true,
                'update_result' => $stmt->fetch(PDO::FETCH_ASSOC)
            ];
            break;

        case 'get_pending_updates':
            $stmt = $db->query("
                SELECT * FROM pending_tree_updates
                WHERE reviewed = FALSE
                ORDER BY created_at DESC
                LIMIT 50
            ");
            $result = [
                'success' => true,
                'pending_updates' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        case 'approve_pending_update':
            // Approve and apply pending update
            $db->beginTransaction();

            // Apply the update
            $stmt = $db->prepare("
                UPDATE decision_answers
                SET answer_template = :new_content,
                    last_content_update = NOW(),
                    updated_at = NOW()
                WHERE id = :answer_id
            ");
            $stmt->execute([
                'new_content' => $input['proposed_content'],
                'answer_id' => $input['answer_id']
            ]);

            // Mark as reviewed
            $stmt = $db->prepare("
                UPDATE pending_tree_updates
                SET reviewed = TRUE,
                    approved = TRUE,
                    reviewed_by = :user_id,
                    reviewed_at = NOW()
                WHERE id = :update_id
            ");
            $stmt->execute([
                'user_id' => $_SESSION['user_id'],
                'update_id' => $input['update_id']
            ]);

            $db->commit();
            $result = ['success' => true, 'message' => 'Update approved and applied'];
            break;

        case 'get_statistics':
            $stmt = $db->query("SELECT * FROM update_points_statistics");
            $result = [
                'success' => true,
                'statistics' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            break;

        default:
            $result = ['success' => false, 'message' => 'Invalid action'];
    }

    header('Content-Type: application/json');
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
```

### Create Frontend Dashboard Component

**File**: `/var/www/documentiulia.ro/frontend/src/pages/admin/DecisionTreeUpdates.tsx`

```tsx
import React, { useState, useEffect } from 'react';

interface UpdatePoint {
  id: number;
  tree_name: string;
  data_point_name: string;
  current_value: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  next_verification_due: string;
  days_overdue?: number;
}

export default function DecisionTreeUpdatesPage() {
  const [overduePoints, setOverduePoints] = useState<UpdatePoint[]>([]);
  const [dueThisWeek, setDueThisWeek] = useState<UpdatePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdatePoints();
  }, []);

  const fetchUpdatePoints = async () => {
    try {
      const [overdueRes, dueWeekRes] = await Promise.all([
        fetch('/api/v1/admin/decision-tree-updates.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_overdue_points' })
        }),
        fetch('/api/v1/admin/decision-tree-updates.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_due_this_week' })
        })
      ]);

      const overdueData = await overdueRes.json();
      const dueWeekData = await dueWeekRes.json();

      setOverduePoints(overdueData.overdue_points || []);
      setDueThisWeek(dueWeekData.due_points || []);
    } catch (error) {
      console.error('Failed to fetch update points:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsVerified = async (pointId: number) => {
    try {
      await fetch('/api/v1/admin/decision-tree-updates.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_verified', point_id: pointId })
      });
      fetchUpdatePoints(); // Refresh
    } catch (error) {
      console.error('Failed to mark as verified:', error);
    }
  };

  const criticalCount = overduePoints.filter(p => p.criticality === 'critical').length;
  const highCount = overduePoints.filter(p => p.criticality === 'high').length;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Decision Tree Update Management</h1>

      {/* Critical Alert */}
      {criticalCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <h2 className="font-bold text-red-900 text-xl">
            🚨 {criticalCount} CRITICAL Updates Overdue
          </h2>
          <p className="text-red-700 mt-2">
            These items have immediate financial/legal impact. Please verify ASAP.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Critical Overdue" value={criticalCount} color="red" />
        <MetricCard title="High Priority" value={highCount} color="orange" />
        <MetricCard title="Due This Week" value={dueThisWeek.length} color="yellow" />
        <MetricCard title="All Current" value={100 - overduePoints.length} color="green" />
      </div>

      {/* Overdue Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold">Overdue Verifications</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Priority</th>
              <th className="px-6 py-3 text-left">Tree</th>
              <th className="px-6 py-3 text-left">Data Point</th>
              <th className="px-6 py-3 text-left">Current Value</th>
              <th className="px-6 py-3 text-left">Days Overdue</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {overduePoints.map(point => (
              <tr key={point.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">
                  <CriticalityBadge level={point.criticality} />
                </td>
                <td className="px-6 py-4">{point.tree_name}</td>
                <td className="px-6 py-4">{point.data_point_name}</td>
                <td className="px-6 py-4 font-mono text-sm">{point.current_value}</td>
                <td className="px-6 py-4">
                  <span className="text-red-600 font-bold">{point.days_overdue} days</span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => markAsVerified(point.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Mark Verified
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Due This Week */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold">Due This Week</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Tree</th>
              <th className="px-6 py-3 text-left">Data Point</th>
              <th className="px-6 py-3 text-left">Due Date</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dueThisWeek.map(point => (
              <tr key={point.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{point.tree_name}</td>
                <td className="px-6 py-4">{point.data_point_name}</td>
                <td className="px-6 py-4">{point.next_verification_due}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => markAsVerified(point.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Verify Now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colors = {
    red: 'bg-red-100 text-red-900',
    orange: 'bg-orange-100 text-orange-900',
    yellow: 'bg-yellow-100 text-yellow-900',
    green: 'bg-green-100 text-green-900'
  };

  return (
    <div className={`p-6 rounded-lg ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-2">{title}</div>
    </div>
  );
}

function CriticalityBadge({ level }: { level: string }) {
  const badges = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${badges[level]}`}>
      {level}
    </span>
  );
}
```

---

## 🌳 PHASE 3: Rapid Tree Expansion (Week 3-4)

### Quick Template: Microenterprise Eligibility

**SQL to create new tree**:
```sql
-- 1. Create tree
INSERT INTO decision_trees (tree_key, tree_name, description, category, icon, priority)
VALUES (
    'microenterprise_eligibility',
    'Eligibilitate Microîntreprindere',
    'Verifică dacă îndeplinești condițiile pentru regimul de microîntreprindere (impozit 1-3%)',
    'fiscal',
    '🏢',
    2
) RETURNING id; -- Returns tree_id (e.g., 2)

-- 2. Create root node
INSERT INTO decision_nodes (tree_id, node_key, question, context_info, is_root, is_terminal)
VALUES (
    2,  -- tree_id from step 1
    'revenue_question',
    'Care este cifra de afaceri anuală estimată a companiei tale?',
    'Pragul de eligibilitate pentru microîntreprindere este de 500.000 EUR echivalent în RON.',
    TRUE,
    FALSE
) RETURNING id; -- Returns node_id (e.g., 4)

-- 3. Create paths from root
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id, is_terminal)
VALUES
(4, 'under_500k', 'Sub 500.000 EUR', 5, FALSE),  -- Goes to employee count question
(4, 'over_500k', 'Peste 500.000 EUR', NULL, TRUE);  -- Terminal: Not eligible

-- 4. Create second question (employee count)
INSERT INTO decision_nodes (tree_id, node_key, question, context_info, is_root, is_terminal)
VALUES (
    2,
    'employee_question',
    'Câți angajați are compania (sau estimezi să aibă)?',
    'Pentru microîntreprindere: maxim 9 angajați.',
    FALSE,
    FALSE
) RETURNING id; -- Returns 5

-- 5. Create final paths
INSERT INTO decision_paths (node_id, path_key, answer_option, next_node_id, is_terminal)
VALUES
(5, '0_to_9', '0-9 angajați', NULL, TRUE),  -- ELIGIBLE
(5, '10_plus', '10+ angajați', NULL, TRUE);  -- NOT ELIGIBLE

-- 6. Create terminal answers (3 total)
-- Answer 1: Over 500k revenue → Not eligible
-- Answer 2: 0-9 employees → ELIGIBLE
-- Answer 3: 10+ employees → Not eligible
```

**Estimated time**: 30 minutes per tree with template

---

## 📅 IMPLEMENTATION TIMELINE

### Week 1: Foundation
- Day 1: Run migration ✅
- Day 2: Seed update points for TVA tree ✅
- Day 3-4: Link answers to variables ✅
- Day 5: Test auto-update system ✅

### Week 2: Admin Dashboard
- Day 1-2: Build API endpoint ✅
- Day 3-4: Build frontend dashboard ✅
- Day 5: Test workflow end-to-end ✅

### Week 3: New Trees (Batch 1)
- Microenterprise Eligibility
- Employee Hiring
- Deductible Expenses

### Week 4: New Trees (Batch 2)
- Dividend Distribution
- Annual Declarations

### Week 5-6: Content Enhancement
- AI-generated MBA insights for all answers
- Cost/timeline data for all trees
- Link all answers to legislation

---

## ✅ SUCCESS METRICS

**After 4 Weeks**:
- ✅ 6 decision trees live (1 existing + 5 new)
- ✅ 150+ update points tracked
- ✅ 0 overdue critical items
- ✅ Auto-update system functional
- ✅ Admin dashboard deployed

**After 3 Months**:
- ✅ 15+ decision trees
- ✅ 90%+ of content tied to variables
- ✅ <1 day avg response time to legislation changes
- ✅ 4.5+ user rating average

---

**READY TO SCALE** 🚀

Next step: Run migration and start Week 1!
