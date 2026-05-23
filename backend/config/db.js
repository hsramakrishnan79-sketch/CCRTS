const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const dbPath = path.join(__dirname, "../database/ccrts.db");
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA foreign_keys = ON");

// ── ROLES ─────────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS roles (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT UNIQUE NOT NULL
);`);

db.exec(`
INSERT OR IGNORE INTO roles (role_name) VALUES
  ('admin'), ('agent'), ('supervisor'), ('customer'), ('quality');
`);

// ── USERS ─────────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    email    TEXT UNIQUE NOT NULL,
    phone    TEXT,
    password TEXT NOT NULL,
    role_id  INTEGER NOT NULL REFERENCES roles(id)
);
`);

// ── CATEGORIES ────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT UNIQUE NOT NULL
);
`);

db.exec(`
INSERT OR IGNORE INTO categories (category_name) VALUES
  ('Billing Issues'), ('Service Disruption'), ('Product Defects'),
  ('Technical Problems'), ('Delivery Delays'),
  ('Account Issues'), ('Customer Service Complaints');
`);

// ── COMPLAINTS ────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT UNIQUE,
    customer_id  INTEGER REFERENCES users(id),
    category_id  INTEGER REFERENCES categories(id),
    priority     TEXT CHECK(priority IN ('Low','Medium','High','Critical')),
    assigned_to  INTEGER REFERENCES users(id),
    description  TEXT,
    status       TEXT DEFAULT 'Open'
                      CHECK(status IN (
                          'Open','Assigned','In Progress',
                          'Pending Customer Response','Escalated',
                          'Resolved','Closed'
                      )),
    sla_deadline DATETIME,
    resolved_at  DATETIME,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── COMPLAINT HISTORY (audit trail) ──────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS complaint_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT NOT NULL REFERENCES complaints(complaint_id),
    changed_by   INTEGER,
    old_status   TEXT,
    new_status   TEXT NOT NULL,
    note         TEXT,
    changed_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── ATTACHMENTS ───────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS attachments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT NOT NULL REFERENCES complaints(complaint_id),
    file_name    TEXT NOT NULL,
    file_path    TEXT NOT NULL,
    uploaded_by  INTEGER,
    uploaded_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── FEEDBACK ──────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS feedback (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT NOT NULL UNIQUE REFERENCES complaints(complaint_id),
    customer_id  INTEGER,
    rating       INTEGER CHECK(rating BETWEEN 1 AND 5),
    comments     TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── AGENT-CATEGORY MAPPING ────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS agent_categories (
    agent_id    INTEGER NOT NULL REFERENCES users(id),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    PRIMARY KEY (agent_id, category_id)
);
`);

// ── CROSS-CATEGORY ASSIGNMENTS ────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS cross_category_assignments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT     NOT NULL REFERENCES complaints(complaint_id),
    agent_id     INTEGER  NOT NULL REFERENCES users(id),
    category_id  INTEGER  NOT NULL REFERENCES categories(id),
    assigned_by  INTEGER  NOT NULL REFERENCES users(id),
    note         TEXT     NOT NULL,
    assigned_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── REPORTING TABLES (pre-computed analytics, populated by ETL refresh) ───────
db.exec(`
CREATE TABLE IF NOT EXISTS report_sla_summary (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    period           TEXT NOT NULL,
    category         TEXT NOT NULL,
    priority         TEXT NOT NULL,
    total            INTEGER DEFAULT 0,
    compliant        INTEGER DEFAULT 0,
    breached         INTEGER DEFAULT 0,
    compliance_rate  REAL DEFAULT 0,
    refreshed_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period, category, priority)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS report_category_trends (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    period               TEXT NOT NULL,
    category             TEXT NOT NULL,
    total                INTEGER DEFAULT 0,
    resolved             INTEGER DEFAULT 0,
    escalated            INTEGER DEFAULT 0,
    avg_resolution_hours REAL,
    refreshed_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period, category)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS report_agent_performance (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    period          TEXT NOT NULL,
    agent_id        INTEGER NOT NULL,
    agent_name      TEXT NOT NULL,
    total_handled   INTEGER DEFAULT 0,
    avg_rating      REAL,
    sla_compliance  REAL,
    reopened        INTEGER DEFAULT 0,
    score           INTEGER DEFAULT 0,
    refreshed_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period, agent_id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS report_resolution_trends (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    period               TEXT NOT NULL,
    priority             TEXT NOT NULL,
    total_resolved       INTEGER DEFAULT 0,
    avg_resolution_hours REAL,
    min_resolution_hours REAL,
    max_resolution_hours REAL,
    refreshed_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period, priority)
);
`);

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS notifications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    complaint_id TEXT REFERENCES complaints(complaint_id),
    message      TEXT NOT NULL,
    is_read      INTEGER DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── USERS: reset token columns (added Phase 2) ────────────────────────────────
try { db.exec(`ALTER TABLE users ADD COLUMN reset_token TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN reset_token_expires DATETIME`); } catch {}

console.log("Database Connected");

module.exports = db;
