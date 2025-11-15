# Admin Dashboard - User Guide
## Decision Tree Auto-Update System

**Last Updated**: 2025-11-15
**Version**: 1.0
**For**: Admin users managing decision tree content

---

## 📋 Table of Contents

1. [Accessing the Dashboard](#accessing-the-dashboard)
2. [Dashboard Overview](#dashboard-overview)
3. [Tab 1: Overdue Items](#tab-1-overdue-items)
4. [Tab 2: Due This Week](#tab-2-due-this-week)
5. [Tab 3: Variables](#tab-3-variables)
6. [Tab 4: Statistics](#tab-4-statistics)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Accessing the Dashboard

### Prerequisites
- Admin account with `role='admin'` in the database
- Access to http://documentiulia.ro

### Login Steps
1. Navigate to http://documentiulia.ro
2. Click "Login"
3. Enter your admin credentials:
   - Email: `test_admin@accountech.com`
   - Password: [Your admin password]
4. After login, you'll see the main dashboard

### Finding the Admin Dashboard
1. Look for the **"Administrare"** section in the left sidebar (only visible to admins)
2. Click **"Actualizări Arbori"** (with shield icon 🛡️)
3. You'll be redirected to `/admin/decision-tree-updates`

---

## Dashboard Overview

The admin dashboard has **4 main tabs**:

```
┌─────────────────────────────────────────────────────┐
│  🔴 Overdue  │  🟡 Due This Week  │  📊 Variables  │  📈 Statistics  │
└─────────────────────────────────────────────────────┘
```

### Key Metrics (Top of Page)
- **Critical Overdue**: Red alert - immediate action required
- **High Priority Overdue**: Orange alert - action needed soon
- **Due This Week**: Yellow alert - upcoming verifications
- **Total Update Points**: Overall system coverage

---

## Tab 1: Overdue Items

### What It Shows
All update points that have passed their `next_verification_due` date without being marked as verified.

### Criticality Levels
- 🔴 **CRITICAL** - System-wide impact (thresholds, tax rates)
  - Example: TVA registration threshold (300,000 RON)
  - Action: Verify immediately, legislation changes affect all users

- 🟠 **HIGH** - Financial penalties (deadlines, fines)
  - Example: TVA registration deadline (10 days)
  - Action: Verify within 24 hours

- 🟡 **MEDIUM** - Informational (costs, timelines)
  - Example: Accountant fees (150-300 RON/month)
  - Action: Verify within 1 week

- 🟢 **LOW** - Cosmetic (form versions, URLs)
  - Example: Form 010 version reference
  - Action: Verify within 1 month

### Table Columns
| Column | Description |
|--------|-------------|
| **Tree** | Which decision tree this belongs to |
| **Update Point** | Specific data point name |
| **Category** | Type (threshold, deadline, tax_rate, etc.) |
| **Current Value** | What the system currently shows |
| **Criticality** | Priority level badge |
| **Days Overdue** | How long past due date |
| **Auto-Update** | ✅ if automatically updateable via variables |
| **Actions** | "Mark Verified" button |

### How to Verify an Item

**Scenario**: TVA registration threshold is overdue

1. **Research**: Check official sources
   - ANAF website: https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm
   - Look for Article 316 (TVA registration threshold)
   - Current value: 300,000 RON (effective since 2016)

2. **Verify Value**:
   - Is the threshold still 300,000 RON? → YES
   - No changes in legislation? → CONFIRMED

3. **Mark as Verified**:
   - Click **"Mark Verified"** button
   - System automatically calculates next verification date
   - For CRITICAL items: next check in 90 days (quarterly)
   - Confirmation: "✅ Marcat ca verificat!"

4. **If Value Changed**:
   - DO NOT mark verified yet
   - Go to **Variables** tab instead
   - Update the variable (see [Tab 3](#tab-3-variables))

---

## Tab 2: Due This Week

### What It Shows
Update points with `next_verification_due` within the next 7 days.

### Why This Matters
Proactive verification prevents items from becoming overdue and ensures content stays current.

### Recommended Workflow

**Monday Morning Routine**:
1. Open "Due This Week" tab
2. Review all items (typically 0-5 items per week)
3. For each item:
   - Check official source
   - Verify value is current
   - Click "Mark Verified"
4. Goal: Keep this tab empty by Friday

**Example Weekly Schedule**:
```
Monday: Verify all CRITICAL + HIGH items due this week
Tuesday: Verify MEDIUM items
Wednesday: Verify LOW items
Thursday: Double-check any remaining items
Friday: Celebrate zero overdue! 🎉
```

---

## Tab 3: Variables

### What It Shows
All 19 legislation variables that power the auto-update system.

### Current Variables (Complete List)

#### TVA (VAT) Related (7 variables)
1. **tva_registration_threshold** - 300,000 RON
2. **tva_standard_rate** - 19%
3. **tva_reduced_rate_9** - 9%
4. **tva_reduced_rate_5** - 5%
5. **tva_registration_deadline** - 10 working days
6. **tva_declaration_deadline** - 25th of next month
7. **tva_penalty_min/max** - 500-1,000 RON

#### Microenterprise (3 variables)
8. **microenterprise_revenue_threshold** - 500,000 EUR
9. **microenterprise_employee_threshold** - 9 employees
10. **microenterprise_tax_rate_1** - 1% (consulting < 80%)
11. **microenterprise_tax_rate_3** - 3% (consulting ≥ 80%)

#### Tax Rates (3 variables)
12. **profit_tax_rate** - 16%
13. **dividend_tax_rate** - 8%
14. **cas_employee_rate** - 25%
15. **cass_employee_rate** - 10%

#### Salary & Deadlines (4 variables)
16. **minimum_gross_salary** - 3,300 RON
17. **d100_deadline** - May 25th
18. **d112_deadline** - January 31st
19. **tva_penalty_min/max** - 500-1,000 RON

### Table Columns
- **Variable Key**: Internal identifier
- **Name**: Human-readable Romanian name
- **Current Value**: Active value
- **Type**: amount, percentage, days, text, date
- **Unit**: RON, %, days, etc.
- **Effective From**: When this value took effect
- **Last Verified**: When admin last confirmed accuracy

### How to Update a Variable

**Scenario**: Government announces TVA threshold increase from 300,000 → 350,000 RON

⚠️ **IMPORTANT**: Variable updates propagate automatically to ALL linked answers!

#### Step 1: Identify Affected Content
Before updating, check how many answers will be affected:
```sql
-- Run this query or use API
SELECT COUNT(*) FROM decision_answers
WHERE variable_mappings ? 'tva_registration_threshold';
-- Result: 4 answers will be updated
```

#### Step 2: Use API to Propose Update
```bash
curl -X POST '/api/v1/admin/decision-tree-updates.php' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "update_variable",
    "variable_key": "tva_registration_threshold",
    "new_value": "350000",
    "auto_apply": false
  }'
```

**Response**:
```json
{
  "success": true,
  "update_result": {
    "affected_answers": 4,
    "pending_updates": 4,
    "preview": "300.000 → 350.000 in 4 answers"
  }
}
```

#### Step 3: Review Pending Updates
System creates 4 pending update entries with diffs:
```
Answer #10: SRL TVA Registration
OLD: "Ai depășit pragul de 300.000 lei"
NEW: "Ai depășit pragul de 350.000 lei"
Confidence: 95% (variable replacement)
```

#### Step 4: Approve or Reject
- If confident: Bulk approve all 4 updates
- If unsure: Review each individually
- System logs everything to audit trail

#### Step 5: Update Variable Record
After approving pending updates:
1. Navigate to Variables tab
2. Locate `tva_registration_threshold`
3. Note that `last_verified` updates automatically
4. `effective_from` changes to legislation effective date

---

## Tab 4: Statistics

### What It Shows
Aggregated analytics by **category** and **criticality**.

### Categories Tracked (7 Total)

| Category | Description | Example |
|----------|-------------|---------|
| **threshold** | Numeric thresholds | TVA 300k RON |
| **deadline** | Registration/filing deadlines | 10 days, 25th |
| **tax_rate** | Percentage rates | VAT 19%, Profit 16% |
| **penalty** | Fines and penalties | 500-1,000 RON |
| **cost_estimate** | Market research costs | Accountant fees |
| **processing_time** | ANAF processing | 3-5 days |
| **form_requirement** | Form versions/URLs | Form 010 |

### Metrics Explained

**Total Points**: How many update points in this category
- Example: `threshold` category has 2 points (TVA threshold, Microenterprise revenue)

**Overdue Count**: Items past verification date
- Goal: Keep this at 0 for CRITICAL categories

**Due This Week**: Upcoming verifications
- Helps plan weekly workload

**Avg Days Since Verification**:
- NULL = Never verified (newly created)
- <90 days = Good (for CRITICAL items)
- >90 days = Needs attention

### Using Statistics for Planning

**Monthly Review Meeting**:
1. Check **critical** category overdue count → should be 0
2. Review **high** category avg days → should be <90
3. Plan quarterly verification for **medium** items
4. Schedule annual review for **low** priority

**Example Report**:
```
📊 Monthly Update Report - November 2025

CRITICAL Items (7 total):
- Overdue: 0 ✅
- Avg days since verification: 45 days ✅
- Status: All current

HIGH Items (2 total):
- Overdue: 0 ✅
- Due next week: 1 (penalty amounts)
- Action: Schedule verification

MEDIUM Items (6 total):
- Overdue: 1 (accountant fees)
- Action: Market research needed

LOW Items (2 total):
- All good, next review in Q1 2026
```

---

## Common Workflows

### Workflow 1: Daily Verification Routine

**Time Required**: 5-10 minutes/day

1. **Login** to admin dashboard
2. **Check Critical Alert** at top of page
   - If red banner appears → drop everything, verify immediately
3. **Open "Due This Week"** tab
   - If items present → verify and mark
4. **Review "Overdue"** tab
   - Should be empty; if not, prioritize by criticality
5. **Log out** (or keep tab open)

### Workflow 2: Quarterly Full Verification

**Time Required**: 2-3 hours/quarter

**Preparation**:
- Block calendar for focused work
- Gather reference materials:
  - ANAF Cod Fiscal: https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm
  - Government legislation updates
  - Accountant industry benchmarks

**Execution**:
1. **Variables Tab**:
   - Review all 19 variables
   - Check each against official source
   - Update `last_verified` date even if no changes

2. **Update Points**:
   - Sort by `next_verification_due` date
   - Work oldest to newest
   - Mark verified or flag for update

3. **Documentation**:
   - Note any legislation changes
   - Update internal wiki if needed
   - Create report for stakeholders

**Checklist**:
```
□ All 7 CRITICAL thresholds verified
□ All 3 CRITICAL tax rates verified
□ All 2 CRITICAL deadlines verified
□ All 2 HIGH penalty amounts verified
□ All 6 MEDIUM cost estimates updated (market research)
□ All 2 MEDIUM processing times checked (ANAF stats)
□ All 2 LOW form requirements checked (ANAF website)
□ Report generated and shared
```

### Workflow 3: Responding to Legislation Change

**Scenario**: ANAF announces TVA threshold increase effective 2026-01-01

**Timeline**: Complete within 24 hours

**Steps**:

**Hour 1: Research & Validation**
1. Read official government announcement
2. Identify exact article/law reference
3. Note effective date
4. Confirm change is final (not proposal)

**Hour 2: Impact Analysis**
1. Open Variables tab
2. Identify affected variable: `tva_registration_threshold`
3. Check how many answers reference this variable
4. Review each answer's content manually

**Hour 3: Update Preparation**
1. Use API to propose variable update:
   ```json
   {
     "action": "update_variable",
     "variable_key": "tva_registration_threshold",
     "new_value": "350000",
     "auto_apply": false
   }
   ```
2. System creates pending updates
3. Review diff previews

**Hour 4: Testing**
1. Check staging environment if available
2. Verify template replacements look correct
3. Confirm formatting (e.g., "350.000 lei" not "350000")

**Hour 5-6: Deployment**
1. Approve pending updates
2. Update variable `effective_from` date
3. Test live decision tree
4. Verify all 4 affected answers display correctly

**Hour 7-8: Communication**
1. Notify team of change
2. Update internal documentation
3. Post announcement if customer-facing
4. Log to update history for audit

---

## Troubleshooting

### Issue 1: "Mark Verified" Button Doesn't Work

**Symptoms**: Clicking button shows error or no response

**Possible Causes**:
- Network connectivity issue
- API endpoint error
- Insufficient permissions

**Solution**:
1. Check browser console for errors (F12)
2. Verify you're logged in as admin
3. Try refreshing page (Ctrl+R)
4. Contact tech team if persists

**Manual Workaround**:
```sql
UPDATE decision_tree_update_points
SET last_verified = NOW()
WHERE id = [point_id];
-- Next verification date calculates automatically via trigger
```

### Issue 2: Variable Update Doesn't Propagate

**Symptoms**: Changed variable but answers still show old value

**Possible Causes**:
- `auto_apply: false` requires manual approval
- Pending updates not approved
- Template syntax error

**Solution**:
1. Check pending updates queue:
   ```bash
   curl -X POST '/api/v1/admin/decision-tree-updates.php' \
     -d '{"action": "get_pending_updates"}'
   ```
2. Review and approve pending updates
3. Verify template placeholders: `{{variable_key}}`
4. Check update history for errors

### Issue 3: Too Many Overdue Items

**Symptoms**: Overdue tab shows 10+ items

**Root Cause**: Verification schedule not followed

**Recovery Plan**:
1. **Triage by Criticality**:
   - CRITICAL → verify today
   - HIGH → verify this week
   - MEDIUM → verify next week
   - LOW → schedule for next month

2. **Batch Processing**:
   - Group by category (all thresholds together)
   - Use single research session for similar items
   - Mark verified in batches

3. **Prevention**:
   - Set calendar reminders for weekly checks
   - Assign backup admin for coverage
   - Review quarterly verification schedule

### Issue 4: Dashboard Not Visible in Sidebar

**Symptoms**: No "Administrare" section in sidebar

**Possible Causes**:
- User role is not 'admin'
- Frontend not updated
- Browser cache

**Solution**:
1. Check user role:
   ```sql
   SELECT role FROM users WHERE email = 'your_email@example.com';
   ```
2. If role is wrong, update:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
   ```
3. Clear browser cache (Ctrl+Shift+Delete)
4. Rebuild frontend if recently deployed

---

## Best Practices

### 1. Verification Frequency

**CRITICAL Items** (7 points):
- Check: Every legislation change (real-time alerts)
- Verify: Quarterly (every 90 days)
- Examples: TVA threshold, tax rates, registration deadlines

**HIGH Items** (2 points):
- Check: Annual budget announcements
- Verify: Annually
- Examples: Penalty amounts, fine structures

**MEDIUM Items** (6 points):
- Check: Market conditions change
- Verify: Quarterly
- Examples: Accountant fees, software costs, ANAF processing times

**LOW Items** (2 points):
- Check: ANAF website updates
- Verify: Annually or on-demand
- Examples: Form versions, procedure URLs

### 2. Source Verification

**Always Use Official Sources**:
1. **Primary**: ANAF Cod Fiscal - https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm
2. **Secondary**: Government Official Gazette - https://www.gov.ro
3. **Tertiary**: Accounting professional associations

**Never Use**:
- Random blogs or forums
- Outdated cached pages
- Unverified social media

### 3. Audit Trail

Every action is logged automatically:
- Who made the change
- What was changed (old → new value)
- When it was changed
- Why (trigger source: manual, auto, legislation)

**Viewing History**:
```bash
curl -X POST '/api/v1/admin/decision-tree-updates.php' \
  -d '{"action": "get_update_history", "limit": 50}'
```

---

## Support & Resources

### Technical Support
- **API Issues**: Contact backend team
- **UI Bugs**: Create GitHub issue
- **Data Questions**: Check database documentation

### Legislation Resources
- **ANAF**: https://www.anaf.ro
- **Cod Fiscal**: https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm
- **Government Portal**: https://www.gov.ro

### Internal Documentation
- **Master Index**: `DECISION_TREES_MASTER_INDEX.md`
- **Expansion Plan**: `DECISION_TREES_EXPONENTIAL_EXPANSION_PLAN.md`
- **Update Points Catalog**: `DECISION_TREE_UPDATE_POINTS_COLLECTION.md`

---

## FAQ

**Q: How often should I check the dashboard?**
A: Daily quick check (2 min), weekly verification (15-30 min), quarterly deep review (2-3 hours).

**Q: What if legislation changes and I'm on vacation?**
A: Assign backup admin with same permissions. Document coverage in team calendar.

**Q: Can I bulk-update multiple variables at once?**
A: Not yet via UI. Use API to create multiple pending updates, then bulk-approve.

**Q: How do I know if a variable update will break anything?**
A: System shows affected answer count and confidence level. Test in staging first if available.

**Q: What's the rollback procedure if I make a mistake?**
A: Check update history, find the change, manually revert or contact tech team for database rollback.

**Q: Why are some items auto-updateable and others not?**
A: Items linked to variables (8/17 points) update automatically. Others require manual content editing (forms, procedures).

---

## Glossary

**Update Point**: A specific data point in decision tree content that requires periodic verification

**Variable**: A central repository value that can be referenced in multiple answers via template placeholders

**Criticality**: Priority level (critical/high/medium/low) indicating impact and verification frequency

**Verification**: The act of confirming a data point's accuracy against official sources

**Pending Update**: A proposed change waiting for admin review and approval

**Auto-Updateable**: Content that updates automatically when linked variable changes

**Template Placeholder**: Syntax like `{{variable_key}}` that gets replaced with current variable value

**Audit Trail**: Complete history log of all changes with who/what/when/why

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Maintained By**: Admin Team
**Next Review**: 2026-02-15
