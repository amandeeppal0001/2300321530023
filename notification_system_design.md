# Campus Notifier Notification System Design

This document details the architectural and algorithmic design of the **Campus Notifier** application, answering all stage requirements from the evaluation criteria.

---

# Stage 1: REST API Design

To support the campus notification system, the backend exposes standard REST endpoints using predictable, clean naming conventions. Real-time updates are designed to be streamed to the client using **Server-Sent Events (SSE)**.

## 1.1 Core API Contracts

### A. Get All Notifications
*   **Endpoint**: `GET /api/notifications`
*   **Headers**: 
    *   `Authorization: Bearer <token>`
    *   `Accept: application/json`
*   **Request Params**: None
*   **Response (200 OK)**:
    ```json
    {
      "notifications": [
        {
          "ID": "891e9424-1702-4f9e-8173-8d2554d55c91",
          "Type": "Placement",
          "Message": "Google is hiring Software Engineering Interns.",
          "Timestamp": "2026-06-09 12:00:00"
        }
      ]
    }
    ```

### B. Get Priority Inbox
*   **Endpoint**: `GET /api/notifications/priority`
*   **Headers**:
    *   `Authorization: Bearer <token>`
    *   `Accept: application/json`
*   **Request Params**:
    *   `limit` (Optional, Integer, default: 10)
*   **Response (200 OK)**:
    ```json
    {
      "notifications": [
        {
          "ID": "891e9424-1702-4f9e-8173-8d2554d55c91",
          "Type": "Placement",
          "Message": "Google is hiring Software Engineering Interns.",
          "Timestamp": "2026-06-09 12:00:00"
        }
      ]
    }
    ```

### C. Create Notification (Trigger Live)
*   **Endpoint**: `POST /api/notifications`
*   **Headers**:
    *   `Authorization: Bearer <token>`
    *   `Content-Type: application/json`
*   **Request Body**:
    ```json
    {
      "type": "Placement",
      "message": "Microsoft interview scheduling starts tomorrow."
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "ID": "f78d249a-7299-4392-a3a2-846c22b63ff5",
      "Type": "Placement",
      "Message": "Microsoft interview scheduling starts tomorrow.",
      "Timestamp": "2026-06-09 12:05:30"
    }
    ```

### D. Mark Notification as Read
*   **Endpoint**: `POST /api/notifications/:id/read`
*   **Headers**:
    *   `Authorization: Bearer <token>`
*   **Request Params**:
    *   `id` (String, UUID of the notification)
*   **Response (200 OK)**:
    ```json
    {
      "success": true
    }
    ```

---

## 1.2 Real-time Notification Mechanism

To deliver real-time notifications to connected clients without the overhead of WebSockets, we use **Server-Sent Events (SSE)**.
*   **Endpoint**: `GET /api/notifications/stream`
*   **Headers**:
    *   `Content-Type: text/event-stream`
    *   `Cache-Control: no-cache`
    *   `Connection: keep-alive`
*   **Flow**: When a client connects, the server keeps the HTTP connection open. When a new notification is posted via `POST /api/notifications`, the server broadcasts the new notification payload to all active SSE connections instantly.

---

# Stage 2: Database Storage Choice & Schema

## 2.1 Database Choice: Relational Database (PostgreSQL)

We recommend using **PostgreSQL** for persistent storage due to:
1.  **ACID Compliance**: Ensures read/write operations and relational states (e.g., student notification states) remain fully consistent.
2.  **Relational Joining & Indexing**: Easily models the relationship between students and notifications via join tables, utilizing composite indexes to keep retrieval latencies low under heavy querying.
3.  **Support for JSONB**: Facilitates storage of flexible external notification metadata if needed, while keeping core fields strictly schema-validated.

---

## 2.2 Database Schema Design

```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type notification_type NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_notifications (
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMP NULL,
    PRIMARY KEY (student_id, notification_id)
);
```

---

## 2.3 Scaling Strategy (Data Volume Increase)

As the database grows (e.g., 50,000 students and 5,000,000 notifications yielding 250 billion potential read state mappings):
*   **Problem**: Indexes on the join table become too large to fit in memory, slowing down `is_read = false` scans.
*   **Solutions**:
    1.  **Table Partitioning**: Partition the `student_notifications` table by hash or list range of `student_id`. This restricts query scanning to specific partition subsets.
    2.  **Partial Indexing**: Build indexes only for unread records (e.g., `CREATE INDEX ON student_notifications (student_id) WHERE is_read = FALSE;`).
    3.  **Archiving Cold Data**: Archive notifications older than 30 days into a compressed cold storage/data lake to keep the operational database lean.

---

## 2.4 SQL Queries

### Fetch all notifications for a student
```sql
SELECT n.id, n.notification_type, n.message, n.timestamp, sn.is_read
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE sn.student_id = 1042
ORDER BY n.timestamp DESC;
```

### Fetch unread priority notifications for a student (Stage 6 Logic)
```sql
SELECT n.id, n.notification_type, n.message, n.timestamp
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE sn.student_id = 1042 AND sn.is_read = FALSE
ORDER BY 
  CASE n.notification_type
    WHEN 'Placement' THEN 3
    WHEN 'Result' THEN 2
    WHEN 'Event' THEN 1
  END DESC,
  n.timestamp DESC
LIMIT 10;
```

### Mark a notification as read
```sql
UPDATE student_notifications
SET is_read = TRUE, read_at = NOW()
WHERE student_id = 1042 AND notification_id = '891e9424-1702-4f9e-8173-8d2554d55c91';
```

---

# Stage 3: Query Optimization & Indexing

## 3.1 Analyzing the Slow Query
*   **Target Query**:
    ```sql
    SELECT * FROM notifications 
    WHERE studentID = 1042 AND isRead = false 
    ORDER BY createdAt ASC;
    ```

### Why is it slow?
1.  **Full Table Scan / Inefficient Indexing**: If there is no index covering `studentID` and `isRead`, the database engine must perform a full scan of the table to filter records matching the query.
2.  **Sort Overhead**: Sorting by `createdAt` forces the database to perform a filesort operation in-memory or on-disk, which becomes extremely slow as row counts grow.

### Optimization Fix
We create a composite index that covers all parts of the filter and sort criteria:
```sql
CREATE INDEX idx_notifications_student_unread_created 
ON student_notifications (student_id, is_read, notification_id);
```
Additionally, for filtering and sorting directly on the main notification parameters, we create:
```sql
CREATE INDEX idx_notifications_lookup 
ON notifications (timestamp DESC, notification_type);
```

---

## 3.2 Evaluation of Indexing "Every Column"
Adding indexes to every single column is **highly counterproductive**:
1.  **Write Degradation**: Every write (`INSERT`, `UPDATE`, `DELETE`) requires modifying multiple indexes, slowing database updates down.
2.  **Storage Overhead**: Indexes consume significant RAM and disk space, sometimes exceeding the size of the tables themselves.
3.  **Planner Mistakes**: Having too many indexes can cause the query optimizer to make sub-optimal plan decisions.

---

## 3.3 Placement Queries (Last 7 Days)
To find all students who received a `Placement` notification in the last 7 days:
```sql
SELECT DISTINCT sn.student_id
FROM student_notifications sn
JOIN notifications n ON sn.notification_id = n.id
WHERE n.notification_type = 'Placement'
  AND n.timestamp >= NOW() - INTERVAL '7 days';
```

---

# Stage 4: High Fetch Rate Optimization

If notifications fetch on every page load for all students, database resources will saturate. We compare multiple optimization strategies below:

| Strategy | Tradeoffs | Best Use Case |
| :--- | :--- | :--- |
| **Short Polling** | **High DB load.** Trivial to implement, but requests flood the server even when no notifications exist. | Small prototype apps. |
| **Long Polling** | **Medium server load.** Connection remains open until a message arrives. Avoids spam but consumes connection sockets. | Legacy environments lacking SSE support. |
| **Server-Sent Events (SSE)** | **Low server load.** Unidirectional HTTP connection keeps client updated in real-time. Extremely efficient. | Real-time notification streams. |
| **Redis Cache-Aside** | **Low database query latency.** Reduces queries to DB by storing lists in memory. Adds cache invalidation logic. | High-traffic global notification feeds. |

---

# Stage 5: High Load Reliability & Redesign

## 5.1 Shortcomings of the Initial Code
The initial script runs the notification process synchronously:
1.  **Blocks Execution**: If calling the Email API takes 500ms, processing 50,000 students will take over 6 hours, crashing the connection or timing out the server.
2.  **No Transaction Safety**: If the server fails midway (e.g., student #200), some students receive notifications while others are left pending.
3.  **Single Point of Failure**: Third-party email API timeouts or rate limits halt the database insertions and push updates.

---

## 5.2 Decoupled Redesign Pseudocode

We decouple the database write from external API delivery by introducing a **Message Queue** (like RabbitMQ or Redis-based BullMQ) and running asynchronous workers:

```javascript
// Server route handler (Immediate response)
async function notify_all_api(req, res) {
    const { message, type } = req.body;
    
    // 1. Save main notification to database
    const notification = await db.save_notification({ type, message, timestamp: new Date() });
    
    // 2. Publish broadcast job to worker queue
    await messageQueue.publish("broadcast-notifications", {
        notificationId: notification.id,
        message: message
    });
    
    return res.status(202).json({ success: true, message: "Notification queued for broadcast." });
}

// Background Worker processing broadcast job
async function process_broadcast_job(job) {
    const { notificationId, message } = job.data;
    const students = await db.get_all_student_ids();
    
    // Chunk students to prevent memory spikes
    const chunkSize = 1000;
    for (let i = 0; i < students.length; i += chunkSize) {
        const chunk = students.slice(i, i + chunkSize);
        
        const dbOperations = chunk.map(studentId => {
            return db.create_student_notification_state(studentId, notificationId);
        });
        await Promise.all(dbOperations);
        
        // Queue individual tasks for email & push delivery to fail/retry independently
        for (const studentId of chunk) {
            await messageQueue.publish("send-email-task", { studentId, message });
            await messageQueue.publish("push-notification-task", { studentId, message });
        }
    }
}

// Low-level worker for Emails with retries and exponential backoff
async function process_email_task(job) {
    const { studentId, message } = job.data;
    try {
        await emailAPI.send(studentId, message);
    } catch (error) {
        if (job.attempts < 5) {
            throw error; // Triggers automatic queue retry with exponential backoff
        } else {
            await db.log_failed_broadcast(studentId, job.id, error.message);
        }
    }
}
```

---

# Stage 6: Min-Heap Priority Queue Engine

To serve the priority list in real-time, the backend maintains a **Min-Heap (Priority Queue)** of size $N$ (default: 10) in-memory or dynamically on API call.

## 6.1 Priority Matrix & Tie-Breaker
*   **Placement**: 3 (Highest)
*   **Result**: 2 (Medium)
*   **Event**: 1 (Lowest)
*   **Tie-Breaker**: Newer timestamp takes precedence (newer is more important, which means the older notification remains closer to the root of the Min-Heap for removal).

## 6.2 Complexity
*   **Comparison**: $O(1)$ against root.
*   **Insertion/Extraction**: $O(\log N)$.
*   **Overall Complexity**: For $M$ active unread notifications, processing them through a bounded heap of size $N$ takes $O(M \log N)$ time, which is highly performant.

## 6.3 Integration
The backend is integrated directly with the evaluation service. It fetches active records from `http://4.224.186.213/evaluation-service/notifications` and processes them using this Min-Heap logic.
