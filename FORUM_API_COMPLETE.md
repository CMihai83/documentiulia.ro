# Community Forum API - Complete Implementation Guide

**Created:** 2025-11-21
**Status:** ✅ Production Ready
**Total Endpoints:** 8 API files, 20+ endpoints

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Database Schema](#database-schema)
4. [Backend Services](#backend-services)
5. [Authentication & Authorization](#authentication--authorization)
6. [Reputation System](#reputation-system)
7. [Usage Examples](#usage-examples)
8. [Testing Guide](#testing-guide)

---

## Overview

The Community Forum API provides a complete Stack Overflow-style Q&A and discussion platform integrated with DocumentIulia. Key features include:

- **Thread & Reply System** - Create discussions, post replies, nested comments
- **Voting Mechanism** - Upvote/downvote content with reputation points
- **Reputation System** - 5 ranks (Newbie → Master) with 10+ badges
- **Bookmarking** - Save threads for later reference
- **Moderation Tools** - Flag content, warn users, ban violators
- **Gamification** - Points, ranks, badges, leaderboards

---

## API Endpoints

### 1. Categories API
**File:** `/api/v1/forum/categories.php`

#### GET - List Categories
```http
GET /api/v1/forum/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Legislation & Tax Updates",
      "slug": "legislation-tax",
      "description": "Romanian tax law updates, legislation changes",
      "thread_count": 45,
      "post_count": 234,
      "last_activity_at": "2025-11-20T15:30:00Z"
    }
  ],
  "count": 8
}
```

---

### 2. Threads API
**File:** `/api/v1/forum/threads.php`

#### GET - List Threads
```http
GET /api/v1/forum/threads?category_id=1&sort=recent&limit=20&offset=0
```

**Query Parameters:**
- `category_id` (required) - Filter by category
- `tag` (optional) - Filter by tag
- `is_solved` (optional) - Filter solved/unsolved (true/false)
- `sort` (optional) - Sort order: `recent`, `popular`, `views`, `votes` (default: `recent`)
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category_id": 1,
      "author_id": "uuid",
      "author_name": "John Doe",
      "title": "How to calculate TVA for online services in 2025?",
      "content": "I need help understanding...",
      "tags": ["tva", "online-services", "2025"],
      "view_count": 152,
      "reply_count": 8,
      "upvote_count": 12,
      "is_pinned": false,
      "is_locked": false,
      "is_solved": true,
      "last_activity_at": "2025-11-20T10:00:00Z",
      "created_at": "2025-11-15T08:30:00Z"
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 20,
    "offset": 0
  }
}
```

#### POST - Create Thread
```http
POST /api/v1/forum/threads
Authorization: Bearer <token>
Content-Type: application/json

{
  "category_id": 1,
  "title": "New thread title",
  "content": "Thread content here...",
  "tags": ["tax", "legislation"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "category_id": 1,
    "author_id": "uuid",
    "title": "New thread title",
    "content": "Thread content here...",
    "tags": ["tax", "legislation"],
    "created_at": "2025-11-21T12:00:00Z"
  },
  "message": "Thread created successfully"
}
```

#### PUT - Update Thread
```http
PUT /api/v1/forum/threads
Authorization: Bearer <token>
Content-Type: application/json

{
  "thread_id": "uuid",
  "title": "Updated title",
  "content": "Updated content",
  "tags": ["new", "tags"]
}
```

#### DELETE - Delete Thread
```http
DELETE /api/v1/forum/threads
Authorization: Bearer <token>
Content-Type: application/json

{
  "thread_id": "uuid"
}
```

---

### 3. Replies API
**File:** `/api/v1/forum/replies.php`

#### GET - List Replies
```http
GET /api/v1/forum/replies?thread_id=uuid&sort=oldest&limit=50&offset=0
```

**Query Parameters:**
- `thread_id` (required) - Thread to get replies for
- `sort` (optional) - Sort order: `oldest`, `newest`, `votes` (default: `oldest`)
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "thread_id": "uuid",
      "author_id": "uuid",
      "author_name": "Jane Smith",
      "content": "Here's the answer...",
      "parent_reply_id": null,
      "upvote_count": 5,
      "is_accepted": true,
      "created_at": "2025-11-15T09:00:00Z",
      "updated_at": "2025-11-15T09:30:00Z"
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

#### POST - Create Reply
```http
POST /api/v1/forum/replies
Authorization: Bearer <token>
Content-Type: application/json

{
  "thread_id": "uuid",
  "content": "My reply content...",
  "parent_reply_id": "uuid" // Optional for nested replies
}
```

#### PUT - Update Reply
```http
PUT /api/v1/forum/replies
Authorization: Bearer <token>
Content-Type: application/json

{
  "reply_id": "uuid",
  "content": "Updated reply content..."
}
```

#### DELETE - Delete Reply
```http
DELETE /api/v1/forum/replies
Authorization: Bearer <token>
Content-Type: application/json

{
  "reply_id": "uuid"
}
```

---

### 4. Voting API
**File:** `/api/v1/forum/vote.php`

#### GET - Get User's Vote
```http
GET /api/v1/forum/vote?voteable_type=thread&voteable_id=123
Authorization: Bearer <token>
```

**Query Parameters:**
- `voteable_type` (required) - Type: `thread` or `reply`
- `voteable_id` (required) - ID of thread or reply

**Response:**
```json
{
  "success": true,
  "data": {
    "vote_type": "upvote", // or "downvote", or null if not voted
    "created_at": "2025-11-20T10:00:00Z"
  }
}
```

#### POST - Cast Vote
```http
POST /api/v1/forum/vote
Authorization: Bearer <token>
Content-Type: application/json

{
  "voteable_type": "thread", // or "reply"
  "voteable_id": 123,
  "vote_type": "upvote" // or "downvote"
}
```

**Behavior:**
- If not voted: Creates new vote
- If already voted same type: Removes vote (toggle off)
- If already voted different type: Changes vote

**Response:**
```json
{
  "success": true,
  "data": {
    "vote_type": "upvote"
  },
  "message": "Vote recorded successfully"
}
```

#### DELETE - Remove Vote
```http
DELETE /api/v1/forum/vote
Authorization: Bearer <token>
Content-Type: application/json

{
  "voteable_type": "thread",
  "voteable_id": 123
}
```

---

### 5. Single Thread API
**File:** `/api/v1/forum/thread.php`

#### GET - Get Thread Details
```http
GET /api/v1/forum/thread?id=uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "category_id": 1,
    "category_name": "Legislation & Tax Updates",
    "author_id": "uuid",
    "author_name": "John Doe",
    "author_rank": "expert",
    "title": "Thread title",
    "content": "Thread content...",
    "tags": ["tax", "tva"],
    "view_count": 153, // Incremented automatically
    "reply_count": 8,
    "upvote_count": 12,
    "is_pinned": false,
    "is_locked": false,
    "is_solved": true,
    "accepted_reply_id": "uuid",
    "created_at": "2025-11-15T08:30:00Z",
    "last_activity_at": "2025-11-20T10:00:00Z"
  }
}
```

#### POST - Moderation Actions
**Pin/Unpin Thread** (Moderator only)
```http
POST /api/v1/forum/thread
Authorization: Bearer <token>
Content-Type: application/json

{
  "thread_id": "uuid",
  "action": "pin",
  "is_pinned": true // or false to unpin
}
```

**Lock/Unlock Thread** (Moderator only)
```http
POST /api/v1/forum/thread
Authorization: Bearer <token>
Content-Type: application/json

{
  "thread_id": "uuid",
  "action": "lock",
  "is_locked": true // or false to unlock
}
```

**Mark as Solved** (Author or Moderator)
```http
POST /api/v1/forum/thread
Authorization: Bearer <token>
Content-Type: application/json

{
  "thread_id": "uuid",
  "action": "solve",
  "is_solved": true, // or false to mark unsolved
  "accepted_reply_id": "uuid" // Optional - specific answer
}
```

---

### 6. Reputation API
**File:** `/api/v1/forum/reputation.php`

#### GET - User Reputation
```http
GET /api/v1/forum/reputation?endpoint=user&user_id=uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "total_points": 485,
    "monthly_points": 65,
    "weekly_points": 22,
    "questions_asked": 12,
    "answers_posted": 38,
    "accepted_answers": 15,
    "helpful_votes_received": 92,
    "rank": "trusted", // newbie, contributor, trusted, expert, master
    "rank_level": 3,
    "badges": [
      {
        "id": 1,
        "name": "First Post",
        "slug": "first-post",
        "badge_tier": "bronze",
        "earned_at": "2025-10-01T10:00:00Z"
      },
      {
        "id": 5,
        "name": "Expert",
        "slug": "expert",
        "badge_tier": "gold",
        "earned_at": "2025-11-15T14:30:00Z"
      }
    ],
    "badge_count": 2,
    "next_rank": "expert",
    "points_to_next_rank": 115
  }
}
```

#### GET - Leaderboard
```http
GET /api/v1/forum/reputation?endpoint=leaderboard&period=monthly&limit=50&offset=0
```

**Query Parameters:**
- `period` (optional) - Time period: `all-time`, `monthly`, `weekly` (default: `all-time`)
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "total_points": 1250,
      "monthly_points": 185,
      "rank": "expert",
      "badge_count": 8,
      "leaderboard_position": 1
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

#### GET - Available Badges
```http
GET /api/v1/forum/reputation?endpoint=badges
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "First Post",
      "slug": "first-post",
      "description": "Posted your first forum thread or reply",
      "icon": "fa-comment",
      "badge_tier": "bronze",
      "points_value": 10,
      "criteria": {
        "type": "first_post",
        "count": 1
      }
    }
  ],
  "count": 10
}
```

---

### 7. Bookmarks API
**File:** `/api/v1/forum/bookmarks.php`

#### GET - List Bookmarks
```http
GET /api/v1/forum/bookmarks?limit=50&offset=0
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bookmark_id": "uuid",
      "thread_id": "uuid",
      "thread_title": "How to calculate TVA...",
      "category_name": "Legislation & Tax Updates",
      "bookmarked_at": "2025-11-18T14:00:00Z",
      "thread_last_activity": "2025-11-20T10:00:00Z"
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

#### POST - Add Bookmark
```http
POST /api/v1/forum/bookmarks
Authorization: Bearer <token>
Content-Type: application/json

{
  "thread_id": "uuid"
}
```

#### DELETE - Remove Bookmark
```http
DELETE /api/v1/forum/bookmarks
Authorization: Bearer <token>
Content-Type: application/json

{
  "thread_id": "uuid"
}
```

---

### 8. Moderation API
**File:** `/api/v1/forum/moderation.php`

#### POST - Flag Content
```http
POST /api/v1/forum/moderation
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "flag",
  "flaggable_type": "thread", // or "reply"
  "flaggable_id": "uuid",
  "reason": "spam", // spam, offensive, inappropriate, off-topic, other
  "description": "Additional details..."
}
```

#### GET - Flagged Content (Moderator only)
```http
GET /api/v1/forum/moderation?status=pending&limit=50&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional) - Filter: `pending`, `resolved`, `dismissed` (default: `pending`)
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "flag_id": "uuid",
      "flagger_name": "John Doe",
      "flaggable_type": "thread",
      "flaggable_id": "uuid",
      "thread_title": "Spam thread...",
      "reason": "spam",
      "description": "This is clearly spam",
      "status": "pending",
      "created_at": "2025-11-20T15:00:00Z"
    }
  ],
  "count": 1
}
```

#### POST - Resolve Flag (Moderator only)
```http
POST /api/v1/forum/moderation
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "resolve",
  "flag_id": "uuid",
  "resolution": "resolved", // or "dismissed"
  "moderator_notes": "Content removed and user warned"
}
```

#### POST - Warn User (Moderator only)
```http
POST /api/v1/forum/moderation
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "warn",
  "user_id": "uuid",
  "reason": "Posting spam content",
  "description": "Multiple spam threads created"
}
```

#### POST - Ban User (Admin only)
```http
POST /api/v1/forum/moderation
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "ban",
  "user_id": "uuid",
  "reason": "Repeated violations",
  "duration_days": 30, // or 0 for permanent
  "is_permanent": false
}
```

---

## Database Schema

### Core Tables (15 total)

```sql
-- Forum categories
forum_categories (id, name, slug, description, icon, display_order)

-- Threads
forum_threads (
  id, category_id, author_id, title, content, tags[],
  view_count, reply_count, upvote_count,
  is_pinned, is_locked, is_solved, accepted_reply_id,
  last_activity_at, created_at, updated_at
)

-- Replies
forum_replies (
  id, thread_id, author_id, parent_reply_id, content,
  upvote_count, is_accepted, created_at, updated_at
)

-- Votes
forum_votes (
  id, user_id, voteable_type, voteable_id, vote_type,
  created_at
)

-- User reputation
user_reputation (
  id, user_id, total_points, monthly_points, weekly_points,
  questions_asked, answers_posted, accepted_answers,
  helpful_votes_received, rank, rank_level, badges[], badge_count
)

-- Badges
badges (
  id, name, slug, description, icon, badge_tier,
  points_value, criteria, is_active
)

-- User badges (earned)
user_badges (
  id, user_id, badge_id, earned_at
)

-- Bookmarks
forum_bookmarks (
  id, user_id, thread_id, created_at
)

-- Content flags
content_flags (
  id, flagger_id, flaggable_type, flaggable_id,
  reason, description, status, moderator_id,
  moderator_notes, resolved_at, created_at
)

-- User warnings
user_warnings (
  id, user_id, moderator_id, reason, description,
  created_at
)

-- User bans
user_bans (
  id, user_id, banned_by, reason, ban_start, ban_end,
  is_permanent, is_active, created_at
)
```

---

## Backend Services

### ForumService.php (900 lines)

**Core Methods:**
- `getCategories()` - List all categories with stats
- `listThreads($categoryId, $filters, $limit, $offset)` - List threads
- `createThread($data)` - Create new thread, award points
- `updateThread($threadId, $userId, $updateData)` - Update thread
- `deleteThread($threadId, $userId)` - Delete thread
- `getThreadById($threadId)` - Get single thread details
- `incrementThreadViews($threadId)` - Track views
- `listReplies($threadId, $sort, $limit, $offset)` - List replies
- `createReply($data)` - Create reply, award points
- `updateReply($replyId, $userId, $content)` - Update reply
- `deleteReply($replyId, $userId)` - Delete reply
- `vote($userId, $voteableType, $voteableId, $voteType)` - Cast vote
- `getUserVote($userId, $voteableType, $voteableId)` - Get user's vote
- `removeVote($userId, $voteableType, $voteableId)` - Remove vote
- `togglePin($threadId, $isPinned)` - Pin/unpin thread
- `toggleLock($threadId, $isLocked)` - Lock/unlock thread
- `markSolved($threadId, $isSolved, $acceptedReplyId)` - Mark solved
- `getUserBookmarks($userId, $limit, $offset)` - List bookmarks
- `addBookmark($userId, $threadId)` - Add bookmark
- `removeBookmark($userId, $threadId)` - Remove bookmark
- `flagContent($data)` - Flag content for moderation
- `getFlaggedContent($status, $limit, $offset)` - List flags
- `resolveFlag($flagId, $moderatorId, $resolution, $notes)` - Resolve flag
- `warnUser($data)` - Issue warning
- `banUser($data)` - Ban user

### ReputationService.php (600 lines)

**Core Methods:**
- `getUserReputation($userId)` - Get reputation details
- `awardPoints($userId, $points, $reason, $referenceId)` - Award points
- `checkAndUpdateRank($userId)` - Auto-update rank based on points
- `checkAndAwardBadges($userId)` - Auto-award badges when criteria met
- `getLeaderboard($period, $limit, $offset)` - Get leaderboard
- `getAllBadges()` - List available badges
- `getUserBadges($userId)` - Get user's earned badges

**Point System:**
- Thread created: +5 points
- Reply posted: +3 points
- Upvote received: +2 points
- Answer accepted: +15 points
- Downvote received: -1 point

**Rank Thresholds:**
- Newbie: 0-99 points
- Contributor: 100-299 points
- Trusted: 300-599 points
- Expert: 600-999 points
- Master: 1000+ points

---

## Authentication & Authorization

### JWT Token Required
All authenticated endpoints require JWT token in Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Role-Based Access Control

**Public Access (No auth):**
- GET categories
- GET threads list
- GET single thread
- GET replies

**Authenticated Users:**
- POST create thread/reply
- PUT update own thread/reply
- DELETE own thread/reply
- POST vote
- POST/DELETE bookmark
- POST flag content

**Moderators:**
- POST pin/lock threads
- GET flagged content
- POST resolve flags
- POST warn users

**Admins:**
- POST ban users
- All moderator permissions

### Permission Checks
```php
// Author check
if ($thread['author_id'] !== $userData['user_id']) {
    throw new Exception('Only author can update thread');
}

// Moderator check
if (!in_array($userData['role'], ['admin', 'moderator'])) {
    throw new Exception('Insufficient permissions');
}

// Admin check
if ($userData['role'] !== 'admin') {
    throw new Exception('Admin role required');
}
```

---

## Reputation System

### Automatic Point Award

**Thread Created:** +5 points
```php
$this->awardPoints($authorId, 5, 'thread_created', $threadId);
```

**Reply Posted:** +3 points
```php
$this->awardPoints($authorId, 3, 'reply_posted', $replyId);
```

**Upvote Received:** +2 points
```php
if ($voteType === 'upvote') {
    $authorId = $this->getAuthorId($voteableType, $voteableId);
    $this->awardPoints($authorId, 2, 'upvote_received', $voteableId);
}
```

**Answer Accepted:** +15 points
```php
if ($acceptedReplyId) {
    $reply = $this->getReplyById($acceptedReplyId);
    $this->awardPoints($reply['author_id'], 15, 'answer_accepted', $acceptedReplyId);
}
```

### Automatic Rank Updates

Ranks are automatically calculated based on total points:

```php
private const RANKS = [
    'newbie' => ['min' => 0, 'max' => 99, 'next' => 'contributor'],
    'contributor' => ['min' => 100, 'max' => 299, 'next' => 'trusted'],
    'trusted' => ['min' => 300, 'max' => 599, 'next' => 'expert'],
    'expert' => ['min' => 600, 'max' => 999, 'next' => 'master'],
    'master' => ['min' => 1000, 'max' => PHP_INT_MAX, 'next' => null],
];
```

After every point award, rank is checked and updated if threshold crossed.

### Badge Awards

Badges are automatically awarded when criteria are met:

**Available Badges:**
1. **First Post** (Bronze, 10 pts) - Posted first thread or reply
2. **Problem Solver** (Bronze, 15 pts) - Had an answer accepted
3. **Helpful** (Silver, 25 pts) - Received 10 upvotes
4. **Great Question** (Silver, 25 pts) - Thread upvoted 25+ times
5. **Great Answer** (Gold, 50 pts) - Answer upvoted 25+ times
6. **Popular Thread** (Silver, 30 pts) - Thread viewed 1000+ times
7. **Prolific** (Gold, 50 pts) - Posted 100+ replies
8. **Expert** (Gold, 100 pts) - 100 accepted answers
9. **Dedicated** (Silver, 25 pts) - Active 30 consecutive days
10. **Community Leader** (Platinum, 200 pts) - 1000+ reputation points

---

## Usage Examples

### Example 1: Create Thread and Get Replies

```javascript
// 1. Login to get token
const loginResponse = await fetch('https://documentiulia.ro/api/v1/auth/login.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const { token } = await loginResponse.json();

// 2. Create new thread
const threadResponse = await fetch('https://documentiulia.ro/api/v1/forum/threads.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    category_id: 1,
    title: 'How to calculate TVA for online services?',
    content: 'I need help understanding the new TVA rules...',
    tags: ['tva', 'online-services', '2025']
  })
});
const { data: thread } = await threadResponse.json();

// 3. Get thread replies
const repliesResponse = await fetch(
  `https://documentiulia.ro/api/v1/forum/replies.php?thread_id=${thread.id}&sort=votes`
);
const { data: replies } = await repliesResponse.json();
```

### Example 2: Vote and Track Reputation

```javascript
// 1. Upvote a thread
await fetch('https://documentiulia.ro/api/v1/forum/vote.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    voteable_type: 'thread',
    voteable_id: threadId,
    vote_type: 'upvote'
  })
});

// 2. Check my reputation
const repResponse = await fetch(
  `https://documentiulia.ro/api/v1/forum/reputation.php?endpoint=user&user_id=${userId}`
);
const { data: reputation } = await repResponse.json();

console.log(`Rank: ${reputation.rank}`);
console.log(`Total Points: ${reputation.total_points}`);
console.log(`Badges: ${reputation.badge_count}`);
```

### Example 3: Bookmark Thread

```javascript
// 1. Bookmark a thread
await fetch('https://documentiulia.ro/api/v1/forum/bookmarks.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    thread_id: threadId
  })
});

// 2. Get my bookmarks
const bookmarksResponse = await fetch(
  'https://documentiulia.ro/api/v1/forum/bookmarks.php',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const { data: bookmarks } = await bookmarksResponse.json();
```

### Example 4: Moderation Workflow

```javascript
// 1. Flag inappropriate content
await fetch('https://documentiulia.ro/api/v1/forum/moderation.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'flag',
    flaggable_type: 'reply',
    flaggable_id: replyId,
    reason: 'spam',
    description: 'This reply contains spam links'
  })
});

// 2. Moderator: Get flagged content
const flagsResponse = await fetch(
  'https://documentiulia.ro/api/v1/forum/moderation.php?status=pending',
  {
    headers: { 'Authorization': `Bearer ${moderatorToken}` }
  }
);
const { data: flags } = await flagsResponse.json();

// 3. Moderator: Resolve flag
await fetch('https://documentiulia.ro/api/v1/forum/moderation.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${moderatorToken}`
  },
  body: JSON.stringify({
    action: 'resolve',
    flag_id: flags[0].flag_id,
    resolution: 'resolved',
    moderator_notes: 'Spam reply deleted and user warned'
  })
});

// 4. Moderator: Warn user
await fetch('https://documentiulia.ro/api/v1/forum/moderation.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${moderatorToken}`
  },
  body: JSON.stringify({
    action: 'warn',
    user_id: spamUserId,
    reason: 'Posting spam content',
    description: 'User posted spam links in multiple threads'
  })
});
```

---

## Testing Guide

### 1. Test Categories Endpoint
```bash
curl -X GET "https://documentiulia.ro/api/v1/forum/categories.php"
```

### 2. Test Thread Creation
```bash
# Login first
TOKEN=$(curl -X POST "https://documentiulia.ro/api/v1/auth/login.php" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  | jq -r '.token')

# Create thread
curl -X POST "https://documentiulia.ro/api/v1/forum/threads.php" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "category_id": 1,
    "title": "Test Thread",
    "content": "This is a test thread",
    "tags": ["test", "demo"]
  }'
```

### 3. Test Reply Creation
```bash
# Get thread ID from previous response
THREAD_ID="uuid-from-previous-step"

curl -X POST "https://documentiulia.ro/api/v1/forum/replies.php" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "thread_id": "'$THREAD_ID'",
    "content": "This is a test reply"
  }'
```

### 4. Test Voting
```bash
curl -X POST "https://documentiulia.ro/api/v1/forum/vote.php" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "voteable_type": "thread",
    "voteable_id": 123,
    "vote_type": "upvote"
  }'
```

### 5. Test Reputation
```bash
curl -X GET "https://documentiulia.ro/api/v1/forum/reputation.php?endpoint=user&user_id=uuid" \
  -H "Authorization: Bearer $TOKEN"

curl -X GET "https://documentiulia.ro/api/v1/forum/reputation.php?endpoint=leaderboard&period=monthly&limit=10"
```

### 6. Test Bookmarks
```bash
# Add bookmark
curl -X POST "https://documentiulia.ro/api/v1/forum/bookmarks.php" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "thread_id": "uuid"
  }'

# Get bookmarks
curl -X GET "https://documentiulia.ro/api/v1/forum/bookmarks.php" \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Test Moderation
```bash
# Flag content
curl -X POST "https://documentiulia.ro/api/v1/forum/moderation.php" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "action": "flag",
    "flaggable_type": "thread",
    "flaggable_id": "uuid",
    "reason": "spam",
    "description": "Spam thread"
  }'

# Get flags (moderator)
curl -X GET "https://documentiulia.ro/api/v1/forum/moderation.php?status=pending" \
  -H "Authorization: Bearer $MODERATOR_TOKEN"
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "message": "Error description here"
}
```

**Common HTTP Status Codes:**
- `200` - Success (GET, PUT, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found

**Example Errors:**
```json
{
  "success": false,
  "message": "Authorization required"
}

{
  "success": false,
  "message": "Thread ID required"
}

{
  "success": false,
  "message": "Insufficient permissions. Moderator role required."
}

{
  "success": false,
  "message": "Only thread author or moderators can mark as solved"
}
```

---

## Performance Optimization

### Database Indexes
```sql
-- Thread lookups
CREATE INDEX idx_threads_category ON forum_threads(category_id);
CREATE INDEX idx_threads_author ON forum_threads(author_id);
CREATE INDEX idx_threads_tags ON forum_threads USING GIN(tags);
CREATE INDEX idx_threads_activity ON forum_threads(last_activity_at DESC);

-- Reply lookups
CREATE INDEX idx_replies_thread ON forum_replies(thread_id);
CREATE INDEX idx_replies_author ON forum_replies(author_id);
CREATE INDEX idx_replies_parent ON forum_replies(parent_reply_id);

-- Vote lookups
CREATE INDEX idx_votes_user ON forum_votes(user_id);
CREATE INDEX idx_votes_voteable ON forum_votes(voteable_type, voteable_id);
```

### Caching Strategy
- Cache category list (rarely changes) - 1 hour TTL
- Cache thread view counts (batch update every 5 minutes)
- Cache leaderboard (update every 10 minutes)
- Cache badge list (rarely changes) - 24 hour TTL

### Query Optimization
- Use `LIMIT` and `OFFSET` for pagination
- Use indexes for filtering and sorting
- Eager load author names in thread/reply lists
- Batch reputation point updates

---

## Next Steps

### Forum Frontend Development (5 pages)

1. **ForumHomePage.tsx** - Category list with stats
2. **ForumCategoryPage.tsx** - Thread list with filters
3. **ForumThreadPage.tsx** - Thread detail with replies
4. **ForumNewThreadPage.tsx** - Create new thread form
5. **UserProfilePage.tsx** - Reputation, badges, activity

### Additional Features (Future)

- Real-time notifications for replies/votes
- Search functionality across threads
- Tag cloud and tag filtering
- User mention system (@username)
- Private messaging between users
- Thread subscription for email notifications
- Export thread to PDF
- Rich text editor with markdown support

---

## Conclusion

The Community Forum API is production-ready with comprehensive features:

✅ **8 API files**, 20+ endpoints
✅ **15 database tables** with proper indexes
✅ **2 backend services** (ForumService, ReputationService)
✅ **Reputation system** with automatic point awards
✅ **Badge system** with automatic criteria matching
✅ **Moderation tools** for community management
✅ **Role-based access control** (user, moderator, admin)
✅ **Complete CRUD operations** for threads and replies
✅ **Voting mechanism** with reputation integration

**Ready for frontend development!**

---

**Document Version:** 1.0
**Last Updated:** 2025-11-21
**Status:** ✅ Complete
