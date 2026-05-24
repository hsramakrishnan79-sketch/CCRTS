# CCRTS — Customer Complaint Resolution & Tracking System

A full-stack web application for managing customer complaints end-to-end: intake, assignment, SLA tracking, escalation, agent workload monitoring, and reporting.

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19, Vite, React Router, Axios |
| Backend  | Node.js, Express.js v5, JWT auth    |
| Database | SQLite via `better-sqlite3`         |
| Uploads  | Multer (local file storage)         |

---

## Features

- **Complaint lifecycle** — create, assign, status transitions, priority, SLA deadlines
- **Role-based access** — five roles with separate views and permissions
- **Agent workload dashboard** — live capacity overview, priority/category breakdown, skew alerts (admin & supervisor)
- **SLA breach tracking** — auto-flag complaints past due date
- **Escalation dashboard** — view and manage escalated complaints
- **Reports** — complaint trends, agent performance, category summaries
- **User management** — create/edit/deactivate users, assign agent categories
- **Notifications** — in-app alerts on assignment, status change, SLA breach
- **Feedback** — customers rate resolved complaints
- **File attachments** — upload/view files on complaints

---

## Roles

| Role       | Access                                                          |
|------------|-----------------------------------------------------------------|
| admin      | Full access — all dashboards, user management, workload view   |
| supervisor | Assign complaints, view workload, escalation, reports          |
| agent      | Own queue, update status, add notes                            |
| quality    | View-only across all complaints                                |
| customer   | Submit complaints, track own complaints, leave feedback        |

---

## Project Structure

```
CCRTS/
├── backend/
│   ├── config/
│   │   └── db.js                  # SQLite connection + schema init (runs on startup)
│   ├── controllers/               # Route handlers
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT protect + requireRole
│   │   └── upload.js              # Multer file upload config
│   ├── routes/                    # Express routers (one per domain)
│   ├── database/
│   │   └── ccrts.db               # SQLite database file (auto-created)
│   ├── server.js                  # Express app entry point (port 3001)
│   └── seed.js                    # Demo data seed script
│
└── frontend/
    └── src/
        ├── pages/                 # Page-level components
        ├── components/            # Shared UI components
        ├── context/               # ToastContext, AuthContext
        ├── services/
        │   └── api.js             # Axios instance (baseURL: /api)
        └── utils/
            ├── styleHelpers.js    # Status/priority CSS class helpers
            └── agentWorkloadHelpers.js  # Shared priority bar constants & functions
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Run

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm run dev          # uses nodemon

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Demo Data

Seed the database with demo users, complaints, history, and notifications:

```bash
cd backend
node seed.js
```

> **Note:** `seed.js` clears and re-inserts all users, complaints, and related data. The ETL performance table (`report_agent_performance`) is **not** cleared by seed — it holds historical monthly throughput data that persists across reseeds and is used to derive agent capacity limits.

### Demo Accounts

All accounts use password: `Password@123`

| Role       | Email                   | Name            |
|------------|-------------------------|-----------------|
| admin      | admin@ccrts.com         | Ramakrishnan    |
| supervisor | supervisor@ccrts.com    | Ananya Sharma   |
| agent      | agent1@ccrts.com        | Arjun Mehta     |
| agent      | agent2@ccrts.com        | Priya Nair      |
| agent      | agent3@ccrts.com        | Karthik Rajan   |
| quality    | quality@ccrts.com       | Deepa Iyer      |
| customer   | anjali@email.com        | Anjali Verma    |
| customer   | rohit@email.com         | Rohit Sharma    |
| customer   | meena@email.com         | Meena Pillai    |
| customer   | vikram@email.com        | Vikram Nair     |
| customer   | sneha@email.com         | Sneha Reddy     |

---

## ETL / Performance Data

The `report_agent_performance` table stores monthly complaint throughput per agent (used by the Reports page and to derive agent max capacity for the workload dashboard).

To load or refresh ETL data, run the ETL script directly against the database:

```bash
cd backend
node etl/load_performance.js    # adjust path to your ETL script
```

Agent max capacity is set to **5** for all agents — derived from the grand average monthly throughput across all agent-months (≈ 4.4, rounded up).

---

## API

Base URL: `http://localhost:3001/api`

All protected routes require `Authorization: Bearer <token>` header.

| Route prefix         | Description                      |
|----------------------|----------------------------------|
| `/api/auth`          | Login, password reset            |
| `/api/complaints`    | CRUD + status transitions        |
| `/api/users`         | User management                  |
| `/api/workload`      | Agent workload overview          |
| `/api/dashboard`     | Dashboard stats                  |
| `/api/reports`       | Report data                      |
| `/api/notifications` | In-app notifications             |
| `/api/feedback`      | Customer feedback                |
| `/api/agent-categories` | Agent category assignments    |

---

## Environment Variables

Create `backend/.env` if you need to override defaults:

```env
PORT=3001
JWT_SECRET=your_secret_here
```
