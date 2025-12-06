# ⚡ Time Tracking API Documentation

**Version:** 1.0
**Base URL:** `https://documentiulia.ro/api/v1/time`
**Authentication:** Bearer token required
**Company Context:** X-Company-ID header required

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Core Time Entries](#core-time-entries)
3. [Timer Operations](#timer-operations)
4. [Approval Workflow](#approval-workflow)
5. [Break Management](#break-management)
6. [Screenshot Tracking](#screenshot-tracking)
7. [AI Features](#ai-features)
8. [Response Format](#response-format)
9. [Error Handling](#error-handling)
10. [Code Examples](#code-examples)

---

## 🔐 Authentication

All requests require:

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
X-Company-ID: company-uuid
Content-Type: application/json
```

**Example:**
```bash
curl -X GET "https://documentiulia.ro/api/v1/time/entries" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJh..." \
  -H "X-Company-ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
```

---

## 📝 Core Time Entries

### 1. List Time Entries

**Endpoint:** `GET /entries`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `employee_id` | UUID | Filter by employee |
| `project_id` | UUID | Filter by project |
| `task_id` | UUID | Filter by task |
| `customer_id` | UUID | Filter by customer |
| `status` | String | pending, approved, rejected, disputed, under_review |
| `is_billable` | Boolean | Filter billable entries |
| `activity_level` | String | idle, low, normal, high, very_high |
| `start_date` | Date | Start of date range (YYYY-MM-DD) |
| `end_date` | Date | End of date range (YYYY-MM-DD) |
| `search` | String | Search in description |
| `tags` | String | Comma-separated tags |
| `limit` | Integer | Results per page (default: 100) |
| `offset` | Integer | Pagination offset (default: 0) |

**Example Request:**
```bash
GET /entries?employee_id=xxx&start_date=2025-11-01&end_date=2025-11-30&status=approved&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "uuid",
        "employee_id": "uuid",
        "employee_name": "John Doe",
        "project_id": "uuid",
        "project_name": "Website Redesign",
        "task_id": "uuid",
        "task_name": "Frontend Development",
        "entry_date": "2025-11-19",
        "start_time": "2025-11-19 09:00:00",
        "end_time": "2025-11-19 17:00:00",
        "duration_seconds": 28800,
        "hours": 8.0,
        "hours_calculated": 8.0,
        "is_billable": true,
        "hourly_rate": 50.00,
        "billable_amount": 400.00,
        "currency": "RON",
        "description": "Implemented responsive design",
        "status": "approved",
        "activity_level": "high",
        "tags": ["frontend", "react"],
        "location_lat": 44.4268,
        "location_lng": 26.1025,
        "location_verified": true,
        "ai_suggested_task_id": null,
        "ai_confidence_score": null,
        "approved_by": "uuid",
        "approved_by_name": "Manager Name",
        "approved_at": "2025-11-19 18:00:00",
        "breaks": [...],
        "screenshots": [...],
        "approval_history": [...]
      }
    ],
    "count": 1,
    "filters": {
      "employee_id": "uuid",
      "start_date": "2025-11-01",
      "end_date": "2025-11-30"
    }
  }
}
```

---

### 2. Get Single Time Entry

**Endpoint:** `GET /entries?id={entry_id}`

**Response:** Returns full entry with breaks, screenshots, and approval history.

```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "uuid",
      "...": "...",
      "breaks": [
        {
          "id": "uuid",
          "break_start": "2025-11-19 12:00:00",
          "break_end": "2025-11-19 12:30:00",
          "duration_seconds": 1800,
          "break_type": "lunch"
        }
      ],
      "screenshots": [
        {
          "id": "uuid",
          "screenshot_url": "https://...",
          "captured_at": "2025-11-19 10:00:00",
          "blur_level": 25
        }
      ],
      "approval_history": [
        {
          "id": "uuid",
          "approver_name": "Manager",
          "action": "approved",
          "created_at": "2025-11-19 18:00:00"
        }
      ]
    }
  }
}
```

---

### 3. Create Time Entry

**Endpoint:** `POST /entries`

**Request Body:**
```json
{
  "employee_id": "uuid",
  "project_id": "uuid",
  "task_id": "uuid",
  "description": "Working on feature X",
  "entry_date": "2025-11-19",
  "hours": 8.0,
  "is_billable": true,
  "hourly_rate": 50.00,
  "tags": ["development", "react"],
  "location_lat": 44.4268,
  "location_lng": 26.1025,
  "activity_level": "high",
  "notes": "Completed successfully"
}
```

**Or with start/end times:**
```json
{
  "employee_id": "uuid",
  "project_id": "uuid",
  "start_time": "2025-11-19 09:00:00",
  "end_time": "2025-11-19 17:00:00",
  "description": "Working on feature X",
  "is_billable": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry_id": "uuid",
    "entry": { ... }
  },
  "message": "Time entry created successfully"
}
```

---

### 4. Update Time Entry

**Endpoint:** `PUT /entries`

**Request Body:**
```json
{
  "id": "uuid",
  "hours": 7.5,
  "description": "Updated description",
  "status": "pending",
  "tags": ["development", "react", "refactoring"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry": { ... }
  },
  "message": "Time entry updated successfully"
}
```

---

### 5. Delete Time Entry

**Endpoint:** `DELETE /entries`

**Request Body:**
```json
{
  "id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Time entry deleted successfully"
}
```

---

### 6. Get Employee Summary

**Endpoint:** `GET /entries?employee_summary=true&employee_id={uuid}&start_date={date}&end_date={date}`

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_entries": 20,
      "total_hours": 160.0,
      "billable_hours": 140.0,
      "non_billable_hours": 20.0,
      "total_amount": 7000.00,
      "approved_entries": 18,
      "pending_entries": 2
    }
  }
}
```

---

### 7. Get Productivity Metrics

**Endpoint:** `GET /entries?productivity_metrics=true&employee_id={uuid}&start_date={date}&end_date={date}`

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "total_entries": 20,
      "total_hours": 160.0,
      "avg_activity_score": 4.2,
      "projects_worked": 3,
      "tasks_worked": 12,
      "revenue_generated": 7000.00,
      "billable_percentage": 87.5
    }
  }
}
```

---

## ⏱️ Timer Operations

### 1. Start Timer

**Endpoint:** `POST /timer/start`

**Request Body:**
```json
{
  "employee_id": "uuid",
  "project_id": "uuid",
  "task_id": "uuid",
  "description": "Working on feature",
  "is_billable": true,
  "tags": ["development"],
  "location_lat": 44.4268,
  "location_lng": 26.1025
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timer_id": "uuid",
    "timer": { ... },
    "started_at": "2025-11-19 14:30:00"
  },
  "message": "Timer started successfully"
}
```

---

### 2. Stop Timer

**Endpoint:** `POST /timer/stop`

**Request Body:**
```json
{
  "timer_id": "uuid",
  "employee_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timer": { ... },
    "duration_seconds": 7200,
    "hours": 2.0,
    "stopped_at": "2025-11-19 16:30:00"
  },
  "message": "Timer stopped successfully"
}
```

---

### 3. Get Active Timer

**Endpoint:** `GET /timer/active?employee_id={uuid}`

**Response:**
```json
{
  "success": true,
  "data": {
    "active_timer": {
      "id": "uuid",
      "start_time": "2025-11-19 14:30:00",
      "description": "Working on feature",
      "project_name": "Website Redesign"
    },
    "is_running": true
  }
}
```

---

## ✅ Approval Workflow

### 1. Approve Time Entry

**Endpoint:** `POST /approvals/approve`

**Request Body:**
```json
{
  "time_entry_id": "uuid",
  "action": "approve",
  "comments": "Looks good!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry": { ... }
  },
  "message": "Time entry approved successfully"
}
```

---

### 2. Reject Time Entry

**Endpoint:** `POST /approvals/reject`

**Request Body:**
```json
{
  "time_entry_id": "uuid",
  "action": "reject",
  "reason": "Inconsistent with project timeline"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry": { ... }
  },
  "message": "Time entry rejected"
}
```

---

### 3. Get Approval History

**Endpoint:** `GET /approvals?time_entry_id={uuid}`

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "uuid",
        "approver_name": "Manager Name",
        "approver_email": "manager@company.com",
        "action": "approved",
        "comments": "Looks good!",
        "previous_status": "pending",
        "new_status": "approved",
        "created_at": "2025-11-19 18:00:00"
      }
    ],
    "count": 1
  }
}
```

---

## ☕ Break Management

### 1. List Breaks

**Endpoint:** `GET /breaks?time_entry_id={uuid}`

**Response:**
```json
{
  "success": true,
  "data": {
    "breaks": [
      {
        "id": "uuid",
        "break_start": "2025-11-19 12:00:00",
        "break_end": "2025-11-19 12:30:00",
        "duration_seconds": 1800,
        "break_type": "lunch",
        "notes": null
      }
    ],
    "count": 1,
    "total_break_seconds": 1800,
    "total_break_hours": 0.5
  }
}
```

---

### 2. Add Break

**Endpoint:** `POST /breaks`

**Request Body:**
```json
{
  "time_entry_id": "uuid",
  "break_start": "2025-11-19 12:00:00",
  "break_end": "2025-11-19 12:30:00",
  "break_type": "lunch",
  "notes": "Lunch break"
}
```

**Break Types:** `regular`, `lunch`, `bathroom`, `meeting`, `other`

**Response:**
```json
{
  "success": true,
  "data": {
    "break_id": "uuid",
    "breaks": [ ... ]
  },
  "message": "Break added successfully"
}
```

---

## 📸 Screenshot Tracking

### 1. List Screenshots

**Endpoint:** `GET /screenshots?time_entry_id={uuid}`

**Response:**
```json
{
  "success": true,
  "data": {
    "screenshots": [
      {
        "id": "uuid",
        "screenshot_url": "https://cdn.example.com/screenshot.jpg",
        "thumbnail_url": "https://cdn.example.com/thumb.jpg",
        "captured_at": "2025-11-19 10:00:00",
        "blur_level": 25,
        "activity_level": "high",
        "file_size_bytes": 1024000,
        "width": 1920,
        "height": 1080
      }
    ],
    "count": 1
  }
}
```

---

### 2. Upload Screenshot

**Endpoint:** `POST /screenshots`

**Request Body:**
```json
{
  "time_entry_id": "uuid",
  "screenshot_url": "https://cdn.example.com/screenshot.jpg",
  "thumbnail_url": "https://cdn.example.com/thumb.jpg",
  "captured_at": "2025-11-19 10:00:00",
  "blur_level": 25,
  "activity_level": "high",
  "file_size_bytes": 1024000,
  "width": 1920,
  "height": 1080
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "screenshot_id": "uuid",
    "screenshots": [ ... ]
  },
  "message": "Screenshot added successfully"
}
```

---

## 🤖 AI Features

### 1. Predict Task

**Endpoint:** `POST /ai/predict-task`

**Request Body:**
```json
{
  "user_id": "uuid",
  "project_id": "uuid",
  "time_of_day": 14,
  "day_of_week": 2,
  "description": "Frontend work"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prediction": {
      "task_id": "uuid",
      "confidence_score": 0.85,
      "reason": "Based on your activity patterns at this time"
    },
    "task_id": "uuid",
    "confidence": 0.85,
    "reason": "Based on your activity patterns at this time"
  }
}
```

**Or if no data:**
```json
{
  "success": true,
  "data": {
    "prediction": null,
    "message": "Not enough data to make a prediction. Keep tracking time to improve AI suggestions!"
  }
}
```

---

### 2. Estimate Task Duration

**Endpoint:** `POST /ai/estimate-duration`

**Request Body:**
```json
{
  "task_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "estimation": {
      "estimated_hours": 3.5,
      "confidence": 0.8,
      "based_on": "8 previous entries"
    },
    "estimated_hours": 3.5,
    "confidence": 0.8,
    "based_on": "8 previous entries"
  }
}
```

---

### 3. Provide AI Feedback

**Endpoint:** `POST /ai/feedback`

**Request Body:**
```json
{
  "prediction_id": "uuid",
  "actual_task_id": "uuid",
  "feedback": "correct"
}
```

**Feedback Types:** `correct`, `incorrect`, `adjusted`

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback! This helps improve AI accuracy."
}
```

---

### 4. Get Activity Patterns

**Endpoint:** `GET /ai/patterns?user_id={uuid}`

**Response:**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "hour_of_day": 9,
        "day_of_week": 1,
        "avg_activity_level": "high",
        "avg_duration_hours": 2.5,
        "pattern_confidence": 0.85,
        "sample_size": 20
      }
    ],
    "patterns_by_day": {
      "0": [...],
      "1": [...],
      "2": [...]
    },
    "total_patterns": 35
  }
}
```

---

## 📤 Response Format

All API responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## ⚠️ Error Handling

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (no access to company)
- `404` - Not Found
- `500` - Internal Server Error

**Common Errors:**

```json
{
  "success": false,
  "message": "Authorization token required"
}
```

```json
{
  "success": false,
  "message": "Company context required"
}
```

```json
{
  "success": false,
  "message": "Access denied"
}
```

```json
{
  "success": false,
  "message": "Time entry not found"
}
```

---

## 💻 Code Examples

### JavaScript (Fetch API)

```javascript
// Start timer
const startTimer = async (employeeId, projectId, description) => {
  const response = await fetch('https://documentiulia.ro/api/v1/time/timer/start', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Company-ID': companyId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      employee_id: employeeId,
      project_id: projectId,
      description: description,
      is_billable: true
    })
  });

  const data = await response.json();
  console.log('Timer started:', data.data.timer_id);
  return data;
};

// Get AI task prediction
const getPrediction = async (userId, projectId) => {
  const response = await fetch('https://documentiulia.ro/api/v1/time/ai/predict-task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Company-ID': companyId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: userId,
      project_id: projectId
    })
  });

  const data = await response.json();
  if (data.data.prediction) {
    console.log('Suggested task:', data.data.task_id);
    console.log('Confidence:', data.data.confidence);
  }
  return data;
};
```

### PHP

```php
<?php
// Create time entry
$ch = curl_init('https://documentiulia.ro/api/v1/time/entries');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'X-Company-ID: ' . $companyId,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'employee_id' => $employeeId,
    'hours' => 8.0,
    'description' => 'Development work',
    'is_billable' => true
]));

$response = curl_exec($ch);
$data = json_decode($response, true);
curl_close($ch);

echo "Entry created: " . $data['data']['entry_id'];
```

### cURL

```bash
# List time entries
curl -X GET "https://documentiulia.ro/api/v1/time/entries?start_date=2025-11-01&end_date=2025-11-30" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Company-ID: YOUR_COMPANY_ID"

# Start timer
curl -X POST "https://documentiulia.ro/api/v1/time/timer/start" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Company-ID: YOUR_COMPANY_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "uuid",
    "project_id": "uuid",
    "description": "Working on feature"
  }'

# Approve time entry
curl -X POST "https://documentiulia.ro/api/v1/time/approvals/approve" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Company-ID: YOUR_COMPANY_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "time_entry_id": "uuid",
    "action": "approve",
    "comments": "Approved"
  }'
```

---

## 📊 Rate Limits

- **Default:** 1000 requests per hour per user
- **Burst:** 100 requests per minute

Exceeded limits return `429 Too Many Requests`.

---

## 🔄 Webhooks (Future)

Coming soon: Real-time webhooks for:
- Timer started/stopped
- Time entry approved/rejected
- Weekly summary ready
- AI suggestions available

---

## 📚 Additional Resources

- **Main Documentation:** `/TIME_TRACKING_MODULE_IMPLEMENTATION_SUMMARY.md`
- **Architecture:** `/ENTERPRISE_MODULES_ARCHITECTURE.md`
- **Service Layer:** `/api/services/TimeEntryService.php`
- **Email Setup:** `/EMAIL_AND_GA4_SETUP_GUIDE.md`

---

**Last Updated:** 2025-11-19
**API Version:** 1.0
**Support:** support@documentiulia.ro

