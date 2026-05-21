const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const dbPath = path.join(__dirname, "../database/ccrts.db");
const db = new DatabaseSync(dbPath);

// ── USERS ────────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    email    TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role     TEXT NOT NULL CHECK(role IN ('admin','agent','supervisor','customer','quality'))
);
`);

// ── COMPLAINTS ───────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id   TEXT UNIQUE,
    customer_name  TEXT,
    email          TEXT,
    phone          TEXT,
    category       TEXT,
    priority       TEXT CHECK(priority IN ('Low','Medium','High','Critical')),
    assigned_to    TEXT,
    description    TEXT,
    status         TEXT DEFAULT 'Open'
                        CHECK(status IN (
                            'Open','Assigned','In Progress',
                            'Pending Customer Response','Escalated',
                            'Resolved','Closed'
                        )),
    sla_deadline   DATETIME,
    resolved_at    DATETIME,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Migrate existing DB: add columns that may not exist yet
const migrateColumn = (table, column, definition) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (_) {
    // column already exists — skip
  }
};

migrateColumn("complaints", "phone",        "TEXT");
migrateColumn("complaints", "sla_deadline", "DATETIME");
migrateColumn("complaints", "resolved_at",  "DATETIME");

// ── COMPLAINT HISTORY (audit trail) ─────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS complaint_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT NOT NULL,
    changed_by   INTEGER,
    old_status   TEXT,
    new_status   TEXT NOT NULL,
    note         TEXT,
    changed_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── ATTACHMENTS ──────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS attachments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT NOT NULL,
    file_name    TEXT NOT NULL,
    file_path    TEXT NOT NULL,
    uploaded_by  INTEGER,
    uploaded_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── FEEDBACK ─────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS feedback (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT NOT NULL,
    customer_id  INTEGER,
    rating       INTEGER CHECK(rating BETWEEN 1 AND 5),
    comments     TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ── NOTIFICATIONS ────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS notifications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    complaint_id TEXT,
    message      TEXT NOT NULL,
    is_read      INTEGER DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

console.log("Database Connected");

module.exports = db;
