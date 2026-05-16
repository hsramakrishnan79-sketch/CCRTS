const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const dbPath = path.join(__dirname, "../database/ccrts.db");

const db = new DatabaseSync(dbPath);

// USERS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
);
`);

// COMPLAINTS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id TEXT UNIQUE,
    customer_name TEXT,
    email TEXT,
    category TEXT,
    priority TEXT,
    assigned_to TEXT,
    description TEXT,
    status TEXT DEFAULT 'Open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

console.log("Database Connected");

module.exports = db;