# Campus Notifier & Logging Middleware

A complete full-stack notification application containing a real-time Priority Inbox and a self-healing logging middleware system.

## Repository Structure

```
2300321530023/
├── .gitignore
├── README.md
├── notification_system_design.md
├── logging_middleware/
│   ├── .env (ignored)
│   ├── index.js
│   └── logger.js
├── notification_app_be/
│   ├── .env (ignored)
│   ├── index.js
│   └── minHeap.js
└── notification_app_fe/
    ├── index.html
    ├── src/
    │   ├── App.tsx
    │   ├── index.css
    │   ├── logger.ts
    │   └── main.tsx
    ├── tsconfig.json
    └── vite.config.ts
```

## Setup and Running Instructions

### 1. Logging Middleware
1. Navigate to `logging_middleware/`.
2. Configure credentials in `.env` (email, name, rollNo, accessCode, clientId, clientSecret, accessToken).
3. Install dependencies: `npm install`.
4. Run server: `npm start` (Runs on Port 3000).

### 2. Notification Backend (`notification_app_be`)
1. Navigate to `notification_app_be/`.
2. Configure credentials in `.env` (port=5000, email, name, rollNo, accessCode, clientId, clientSecret, accessToken).
3. Install dependencies: `npm install`.
4. Run server: `npm start` (Runs on Port 5000).

### 3. Notification Frontend (`notification_app_fe`)
1. Navigate to `notification_app_fe/`.
2. Install dependencies: `npm install`.
3. Run development server: `npm run dev` (Runs on Port 3000 by default, or auto-configures).
