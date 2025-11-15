# DocumentIulia Frontend Integration Guide

## Current Menu Structure

The customer dashboard currently has these menu items (see `/frontend/src/components/layout/Sidebar.tsx`):

```
📊 Dashboard
📄 Invoices
🧾 Expenses
👥 Contacts
📈 Reports
💡 AI Insights    ← Existing AI feature
```

---

## Where to Add New AI Features

### Recommended Menu Structure:

```
📊 Dashboard
📄 Invoices
🧾 Expenses
👥 Contacts
📈 Reports

🧠 === AI INTELLIGENCE ===
💡 AI Insights (existing)
🤖 Business Consultant (NEW - Personal MBA)
⚖️  Fiscal Law AI (NEW - Romanian legislation)
📋 Personal Context (NEW - PCT management)

⚙️  Settings
🚪 Logout
```

---

## 1. Business Consultant (Personal MBA) 💼

### Location in Menu
Add after "AI Insights" with icon: `Brain` or `Sparkles`

### Page Purpose
AI-powered business consultation based on Personal MBA framework

### Key Features
- **Ask business questions** - "How can I increase revenue?"
- **Get strategic advice** - Based on 5 Parts of Business
- **Concept browser** - Explore 15 Personal MBA concepts
- **Framework tools** - 5 Parts Analysis, Market Evaluation, Revenue Methods
- **Consultation history** - Track past advice and decisions

### API Endpoints
```typescript
// Business consultation
POST /api/v1/business/consultant.php
{
  question: string,
  user_id?: string  // For Personal Context integration
}

// Get insights
POST /api/v1/business/insights.php
{
  user_id: string
}
```

### UI Components Needed
1. **Chat Interface** - Ask questions, get AI responses
2. **Concept Explorer** - Browse 15 Personal MBA concepts
3. **Framework Tools** - Interactive worksheets
4. **Consultation History** - View past conversations

### Example UI Flow
```
┌─────────────────────────────────────────┐
│  🤖 Business Consultant                  │
├─────────────────────────────────────────┤
│                                          │
│  💬 Ask Your Business Question           │
│  ┌─────────────────────────────────┐    │
│  │ How can I improve my cash flow? │    │
│  └─────────────────────────────────┘    │
│                                          │
│  📚 Or Browse Concepts:                  │
│  [Value Creation] [Marketing] [Sales]    │
│  [Value Delivery] [Finance]              │
│                                          │
│  📊 Recent Consultations:                │
│  • How to increase revenue? (2 days ago) │
│  • Pricing strategy advice (5 days ago)  │
└─────────────────────────────────────────┘
```

### Integration with Personal Context
- If user has Personal Context, consultations are **personalized**
- Confidence: **95%** (vs 90% without context)
- Advice tailored to business stage, industry, goals

---

## 2. Fiscal Law AI ⚖️

### Location in Menu
Add after "Business Consultant" with icon: `Scale` or `BookOpen`

### Page Purpose
Romanian fiscal law consultation with access to 628 articles from Codul Fiscal 2015

### Key Features
- **Ask fiscal questions** (in Romanian) - "Care este pragul de înregistrare pentru TVA?"
- **Get AI answers** with article references
- **Search legislation** - 628 articles full-text search
- **Hot topics** - Latest fiscal law updates
- **Templates** - Download forms (D212, D300, D101, etc.)
- **Obligation calendar** - Monthly/quarterly/annual deadlines

### API Endpoints
```typescript
// Fiscal law consultation
POST /api/v1/fiscal/ai-consultant.php
{
  question: string  // In Romanian
}

// Response includes:
{
  success: true,
  answer: string,
  articles_referenced: string[],
  confidence: number,
  source: string
}
```

### UI Components Needed
1. **Chat Interface (Romanian)** - Ask fiscal questions
2. **Hot Topics** - Latest legislative updates
3. **Form Templates** - Download D212, D300, D101, etc.
4. **Obligation Calendar** - Deadlines tracker
5. **Q&A Knowledge Base** - Common questions

### Example UI Flow
```
┌─────────────────────────────────────────┐
│  ⚖️ Consultant Fiscal AI                │
├─────────────────────────────────────────┤
│                                          │
│  💬 Întreabă (în Română):                │
│  ┌─────────────────────────────────┐    │
│  │ Care este pragul de TVA 2025?   │    │
│  └─────────────────────────────────┘    │
│                                          │
│  🤖 AI Răspuns:                          │
│  Pragul de înregistrare ca plătitor      │
│  de TVA este 300.000 lei...              │
│                                          │
│  📚 Articole Referite:                   │
│  • Art. 316 - Înregistrare TVA           │
│  • Art. 317 - Plafon înregistrare        │
│                                          │
│  📋 Template-uri:                        │
│  [Descarcă D300] [Descarcă D212]         │
│                                          │
│  📅 Termene Următoare:                  │
│  • 25 Noiembrie - Declarație TVA         │
│  • 25 Mai 2025 - Declarația Unică       │
└─────────────────────────────────────────┘
```

---

## 3. Personal Context 📋

### Location in Menu
Add after "Fiscal Law AI" with icon: `User` or `FileText`

### Page Purpose
Manage personal business context for AI memory and personalization

### Key Features
- **View context** - See your complete business profile
- **Edit context** - Update business information
- **5 Parts Profile** - Value Creation, Marketing, Sales, Delivery, Finance
- **Metrics tracking** - Revenue, customers, growth rate
- **Goals & milestones** - Track progress
- **Export/Import** - Backup and restore context
- **Context statistics** - Usage and effectiveness metrics

### API Endpoints
```typescript
// Get personal context
GET /api/v1/context/get.php?user_id=UUID

// Update context
PUT /api/v1/context/update.php
{
  user_id: string,
  updates: object,
  change_reason?: string
}

// Export context
GET /api/v1/context/export.php?user_id=UUID

// Import context
POST /api/v1/context/import.php
{
  user_id: string,
  context_data: object
}
```

### UI Components Needed
1. **Context Overview** - Business profile summary
2. **5 Parts Editor** - Edit each part of business
3. **Metrics Dashboard** - Current business metrics
4. **Goals Tracker** - Track milestones
5. **Export/Import** - Backup functionality
6. **Context Stats** - Usage statistics

### Example UI Flow
```
┌─────────────────────────────────────────┐
│  📋 My Business Context                  │
├─────────────────────────────────────────┤
│                                          │
│  🏢 Basic Info                           │
│  Business: TechVision SRL                │
│  Industry: Software Development          │
│  Stage: Growth                           │
│  [Edit]                                  │
│                                          │
│  💼 The 5 Parts of Business              │
│  ┌──────────────────────────────────┐   │
│  │ 💡 Value Creation                │   │
│  │ Products/Services: 3              │   │
│  │ [View Details]                    │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ 📣 Marketing                      │   │
│  │ Target Market: Romanian SMEs      │   │
│  │ [View Details]                    │   │
│  └──────────────────────────────────┘   │
│  ... (Sales, Delivery, Finance)          │
│                                          │
│  📊 Current Metrics                      │
│  Revenue: 15,000 EUR/month               │
│  Customers: 25                           │
│  Growth: 15% monthly                     │
│  [Update Metrics]                        │
│                                          │
│  🎯 Goals & Milestones                   │
│  • Reach 50K EUR/month by 2025 (60%)    │
│  • Launch 3 new products (1/3)           │
│                                          │
│  💾 Backup & Restore                     │
│  [📥 Export Context] [📤 Import Context] │
│                                          │
│  📈 Context Statistics                   │
│  Total consultations: 42                 │
│  Context-aware: 38 (95% confidence)      │
│  Last updated: Today                     │
└─────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Update Sidebar Navigation

Edit `/frontend/src/components/layout/Sidebar.tsx`:

```typescript
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  TrendingUp,
  Lightbulb,
  Brain,        // NEW
  Scale,        // NEW
  FileUser,     // NEW
  Settings,
  LogOut,
} from 'lucide-react';

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', path: '/invoices', icon: FileText },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Contacts', path: '/contacts', icon: Users },
  { name: 'Reports', path: '/reports', icon: TrendingUp },
  { name: 'AI Insights', path: '/insights', icon: Lightbulb },

  // NEW: AI Intelligence Section
  { name: 'Business Consultant', path: '/business-consultant', icon: Brain },
  { name: 'Fiscal Law AI', path: '/fiscal-law', icon: Scale },
  { name: 'Personal Context', path: '/personal-context', icon: FileUser },
];
```

### Step 2: Create Page Components

```bash
# Create new page files
/frontend/src/pages/BusinessConsultantPage.tsx
/frontend/src/pages/FiscalLawAIPage.tsx
/frontend/src/pages/PersonalContextPage.tsx
```

### Step 3: Add Routes

Edit `/frontend/src/App.tsx`:

```typescript
import BusinessConsultantPage from './pages/BusinessConsultantPage';
import FiscalLawAIPage from './pages/FiscalLawAIPage';
import PersonalContextPage from './pages/PersonalContextPage';

// Add routes
<Route path="/business-consultant" element={<BusinessConsultantPage />} />
<Route path="/fiscal-law" element={<FiscalLawAIPage />} />
<Route path="/personal-context" element={<PersonalContextPage />} />
```

### Step 4: Create API Service Layer

```typescript
// /frontend/src/services/aiService.ts

export const businessConsult = async (question: string, userId?: string) => {
  const response = await fetch('/api/v1/business/consultant.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, user_id: userId }),
  });
  return response.json();
};

export const fiscalConsult = async (question: string) => {
  const response = await fetch('/api/v1/fiscal/ai-consultant.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  return response.json();
};

export const getPersonalContext = async (userId: string) => {
  const response = await fetch(`/api/v1/context/get.php?user_id=${userId}`);
  return response.json();
};

export const updatePersonalContext = async (userId: string, updates: any) => {
  const response = await fetch('/api/v1/context/update.php', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, updates }),
  });
  return response.json();
};
```

---

## Visual Design Guidelines

### Color Scheme
- **Business Consultant**: Blue/Indigo (`#4F46E5`)
- **Fiscal Law AI**: Green/Emerald (`#059669`)
- **Personal Context**: Purple/Violet (`#7C3AED`)

### Icons
- Use **Lucide React** icons (already in project)
- Keep consistent size: `w-5 h-5` for sidebar, `w-6 h-6` for page headers

### Layout
- Follow existing **DashboardLayout** pattern
- Use **Tailwind CSS** classes (already configured)
- Maintain responsive design for mobile

---

## Priority Implementation Order

1. **Business Consultant Page** (Highest Priority)
   - Most valuable AI feature
   - Integrates with Personal Context
   - 90-95% confidence responses

2. **Personal Context Page** (High Priority)
   - Enables full Business Consultant personalization
   - User can manage their business profile
   - 100% context retention

3. **Fiscal Law AI Page** (Medium Priority)
   - Romanian-specific feature
   - Valuable for local businesses
   - 628 articles database ready

---

## Example Page: Business Consultant

```typescript
// /frontend/src/pages/BusinessConsultantPage.tsx

import React, { useState } from 'react';
import { Brain, Send } from 'lucide-react';
import { businessConsult } from '../services/aiService';

const BusinessConsultantPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await businessConsult(question, user?.id);
      setAnswer(response.answer);
    } catch (error) {
      console.error('Consultation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 rounded-lg">
          <Brain className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Business Consultant
          </h1>
          <p className="text-gray-600">
            AI-powered strategic advice based on Personal MBA principles
          </p>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ask Your Business Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="How can I increase my revenue?"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? 'Thinking...' : 'Get AI Advice'}
            <Send className="w-5 h-5" />
          </button>
        </form>

        {/* Answer Display */}
        {answer && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              AI Consultant Answer:
            </h3>
            <div className="text-gray-800 prose max-w-none">
              {answer}
            </div>
          </div>
        )}
      </div>

      {/* Quick Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Value Creation</h4>
          <p className="text-sm text-gray-600">Learn how to create value customers will pay for</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Marketing</h4>
          <p className="text-sm text-gray-600">Attract attention and build demand</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Sales</h4>
          <p className="text-sm text-gray-600">Convert prospects into paying customers</p>
        </div>
      </div>
    </div>
  );
};

export default BusinessConsultantPage;
```

---

## Testing Checklist

- [ ] Sidebar navigation shows new menu items
- [ ] Routes work for all 3 new pages
- [ ] Business Consultant page loads and accepts questions
- [ ] Fiscal Law AI page works with Romanian questions
- [ ] Personal Context page displays user's business profile
- [ ] API calls work (check with existing test endpoints)
- [ ] Responsive design works on mobile
- [ ] Icons and colors match design guidelines

---

**Status**: Ready for Frontend Development
**Backend APIs**: ✅ Complete and Tested
**Database**: ✅ Ready with data
**Documentation**: ✅ Complete

All backend functionality is working. The frontend just needs to be built to consume the APIs!
