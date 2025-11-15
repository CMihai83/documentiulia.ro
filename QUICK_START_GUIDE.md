# DocumentiUlia Decision Tree System - Quick Start Guide

## 🚀 What Was Built

A complete **hybrid fiscal consultation system** that intelligently routes user questions between:
1. **Decision Trees** - Interactive guided question flows
2. **AI Responses** - DeepSeek-powered answers for complex questions
3. **Human Review Queue** - Questions that need expert analysis

## 📦 Backend Components (All Complete)

### 1. Database (14 New Tables)
- Decision trees structure
- Unanswered questions queue
- User notifications
- Legislation scraping logs
- Analytics tracking

### 2. Services (6 PHP Services)
- `Lege5ScraperService.php` - Auto-updates legislation from lege5.ro
- `DecisionTreeService.php` - Tree navigation engine
- `QuestionRouterService.php` - Intelligent routing (tree vs AI)
- `UnansweredQueueService.php` - Queue management
- `TreeGeneratorService.php` - AI-powered tree generation
- Plus existing: `FiscalAIService.php`, `OllamaService.php`

### 3. API Endpoints (3 New Endpoints)
- `/api/v1/fiscal/hybrid-consultant.php` - Main consultation endpoint
- `/api/v1/admin/queue-manager.php` - Admin queue interface
- `/api/v1/notifications/user-notifications.php` - In-app notifications

## 🎯 How It Works

### User Flow Example

**Scenario 1: Question matches decision tree**
```
User asks: "Cum mă înregistrez la TVA?"
↓
System finds "TVA Registration" tree (85% match)
↓
User navigates interactive questions:
  - "Ce tip de afacere ai?" → SRL
  - "Care este cifra de afaceri?" → 350,000 lei
  - "Ai mai mult de 300,000 lei?" → Da
↓
Final answer with exact legislation articles
```

**Scenario 2: Complex question → AI**
```
User asks: "Cum optimizez fiscal cu microîntreprindere și 2 angajați?"
↓
No tree match (45% confidence)
↓
AI generates detailed answer with:
  - Personal context (user's company data)
  - Legislation references
  - MBA frameworks
  - Strategic recommendations
```

**Scenario 3: Unknown question → Queue**
```
User asks: "Pot deduce cheltuielile cu bitcoins?"
↓
No tree match + Low AI confidence
↓
Question queued for review
↓
AI generates proposed decision tree
↓
Human reviews and approves
↓
User gets in-app notification with answer
↓
Tree integrated for future similar questions
```

## 🧪 Testing the System

### 1. Test Scraper Connection
```bash
curl "http://documentiulia.ro/api/v1/admin/scraper-test.php?action=test"
```

Expected response:
```json
{
  "success": true,
  "message": "Connection successful. Logged in to lege5.ro"
}
```

### 2. Test Hybrid Consultant (AI Response)
```bash
curl -X POST http://documentiulia.ro/api/v1/fiscal/hybrid-consultant.php \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Care este pragul de înregistrare pentru TVA în 2025?"
  }'
```

Expected response:
```json
{
  "success": true,
  "method": "ai",
  "confidence": 0.95,
  "answer": "<p>Pragul de înregistrare TVA...</p>",
  "references": ["Art. 316 Cod Fiscal"]
}
```

### 3. Test Queue Statistics
```bash
curl "http://documentiulia.ro/api/v1/admin/queue-manager.php?action=stats"
```

### 4. Test Notifications
```bash
curl "http://documentiulia.ro/api/v1/notifications/user-notifications.php?user_id=YOUR_USER_UUID"
```

## 📋 Creating Your First Decision Tree

### SQL Template

```sql
-- 1. Create the tree
INSERT INTO decision_trees (tree_key, tree_name, description, category, priority)
VALUES (
  'tva_registration',
  'Înregistrare TVA',
  'Ghid complet pentru înregistrarea ca plătitor de TVA',
  'fiscal',
  100
)
RETURNING id; -- Note this ID

-- 2. Create root node (use tree_id from above)
INSERT INTO decision_nodes (
  tree_id,
  node_key,
  parent_node_id,
  question,
  question_type,
  help_text,
  examples,
  display_order
)
VALUES (
  1, -- Replace with your tree_id
  'tva_root',
  NULL, -- Root node has no parent
  'Ce tip de afacere ai?',
  'multiple_choice',
  'Selectează forma juridică a afacerii tale',
  '["SRL - Societate cu Răspundere Limitată", "PFA - Persoană Fizică Autorizată", "Microîntreprindere"]'::jsonb,
  1
)
RETURNING id; -- Note this node_id

-- 3. Create paths (answer options)
INSERT INTO decision_paths (
  node_id,
  path_key,
  answer_option,
  next_node_id, -- NULL if this is final answer
  legislation_refs,
  answer_text,
  display_order
)
VALUES
(
  2, -- Replace with your node_id
  'tva_srl',
  'SRL',
  NULL, -- Will create another node later
  '[1, 2, 3]'::jsonb, -- IDs from fiscal_legislation table
  'Pentru SRL, pragul de înregistrare TVA este...',
  1
),
(
  2,
  'tva_pfa',
  'PFA',
  NULL,
  '[1, 2]'::jsonb,
  'Pentru PFA, pragul de înregistrare TVA este...',
  2
);

-- 4. Repeat steps 2-3 for each level of the tree
```

## 🔧 Configuration

### Scraper Settings (in database)
```sql
-- View current config
SELECT * FROM scraper_config;

-- Update scraper rate limit (number of scrapes per day)
UPDATE scraper_config
SET config_value = '5'
WHERE config_key = 'scrape_rate_limit_per_day';

-- Update delay between requests (seconds)
UPDATE scraper_config
SET config_value = '45'
WHERE config_key = 'scrape_delay_seconds';
```

### Routing Thresholds (in code)
Edit `/api/services/QuestionRouterService.php`:
```php
// Line 15-16
const TREE_CONFIDENCE_THRESHOLD = 0.70; // Use tree if match >= 70%
const AI_CONFIDENCE_THRESHOLD = 0.60;   // Use AI if confidence >= 60%
```

## 📊 Monitoring

### Check Scraper Activity
```sql
SELECT
  scrape_date,
  source_url,
  articles_scraped,
  articles_updated,
  articles_new,
  status,
  scrape_duration_seconds
FROM legislation_updates_log
ORDER BY scrape_date DESC
LIMIT 10;
```

### Check Queue Status
```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(similarity_score) as avg_similarity
FROM unanswered_questions
GROUP BY status;
```

### Check Tree Usage
```sql
SELECT
  dt.tree_name,
  COUNT(*) as sessions,
  COUNT(*) FILTER (WHERE completed = TRUE) as completed,
  AVG(user_rating) as avg_rating,
  AVG(time_spent_seconds) as avg_time_seconds
FROM decision_tree_analytics dta
JOIN decision_trees dt ON dta.tree_id = dt.id
WHERE dta.created_at >= NOW() - INTERVAL '30 days'
GROUP BY dt.id, dt.tree_name
ORDER BY sessions DESC;
```

### Check Notifications
```sql
SELECT
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = FALSE) as unread,
  notification_type,
  priority
FROM user_notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY notification_type, priority;
```

## 🎨 Frontend Integration (To Do)

### React Component Example
```typescript
import React, { useState } from 'react';

function FiscalConsultant() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    setLoading(true);

    const res = await fetch('/api/v1/fiscal/hybrid-consultant.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const data = await res.json();
    setResponse(data);
    setLoading(false);
  };

  return (
    <div>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Pune o întrebare fiscală..."
      />
      <button onClick={askQuestion} disabled={loading}>
        {loading ? 'Se procesează...' : 'Întreabă'}
      </button>

      {response?.method === 'decision_tree' && (
        <DecisionTreeNavigator tree={response.tree} />
      )}

      {response?.method === 'ai' && (
        <div dangerouslySetInnerHTML={{ __html: response.answer }} />
      )}

      {response?.method === 'queued' && (
        <div>
          <p>{response.message}</p>
          <p>Vei primi o notificare când răspunsul este gata.</p>
        </div>
      )}
    </div>
  );
}
```

## 🚀 Production Deployment Steps

1. ✅ Database migration (already done)
2. ✅ Backend services deployed
3. ✅ API endpoints active
4. ⏳ Create initial decision trees (SQL above)
5. ⏳ Build frontend components
6. ⏳ Set up cron job for scraper
7. ⏳ Test end-to-end flow
8. ⏳ Monitor and optimize

## 📞 Support

**Documentation**:
- Full status: `/var/www/documentiulia.ro/DECISION_TREE_SYSTEM_STATUS.md`
- This guide: `/var/www/documentiulia.ro/QUICK_START_GUIDE.md`

**Key Files**:
- Database migration: `/database/migrations/001_decision_trees_schema.sql`
- Services: `/api/services/`
- Endpoints: `/api/v1/fiscal/`, `/api/v1/admin/`, `/api/v1/notifications/`

**Credentials**:
- Lege5.ro: loredana.ciuca@tmdfriction.com / tmdfriction
- Database: accountech_app / AccTech2025Prod@Secure

---

**Status**: ✅ Backend 100% complete - Ready for frontend integration!
