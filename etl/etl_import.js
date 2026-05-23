/**
 * ETL Step 2 — Import Pipeline
 * Reads complaints_dataset.csv and feedback_dataset.csv,
 * transforms fields, validates records, and loads into the database.
 *
 * Run: node etl/etl_import.js
 * Safe to re-run — skips records that already exist (idempotent).
 */

const fs   = require("fs");
const path = require("path");
const db   = require("../backend/config/db");

// ── Config ────────────────────────────────────────────────────────────────────
const COMPLAINTS_CSV = path.join(__dirname, "complaints_dataset.csv");
const FEEDBACK_CSV   = path.join(__dirname, "feedback_dataset.csv");

const VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"];
const VALID_STATUSES   = [
  "Open", "Assigned", "In Progress", "Pending Customer Response",
  "Escalated", "Resolved", "Closed",
];

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCsv(filePath) {
  const lines  = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  const header = lines[0].split(",");
  const rows   = [];

  for (let i = 1; i < lines.length; i++) {
    const line   = lines[i];
    const values = [];
    let current  = "";
    let inQuotes = false;

    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { values.push(current); current = ""; continue; }
      current += ch;
    }
    values.push(current);

    const row = {};
    header.forEach((h, idx) => { row[h.trim()] = (values[idx] ?? "").trim(); });
    rows.push(row);
  }
  return rows;
}

// ── Extract ───────────────────────────────────────────────────────────────────
console.log("\n── EXTRACT ──────────────────────────────────────────────────────");
const rawComplaints = parseCsv(COMPLAINTS_CSV);
const rawFeedback   = parseCsv(FEEDBACK_CSV);
console.log(`  Complaints CSV : ${rawComplaints.length} raw records`);
console.log(`  Feedback CSV   : ${rawFeedback.length} raw records`);

// ── Transform ─────────────────────────────────────────────────────────────────
console.log("\n── TRANSFORM ────────────────────────────────────────────────────");

// Build lookup maps from DB
const categoryMap = {};
db.prepare("SELECT id, category_name FROM categories").all()
  .forEach((r) => { categoryMap[r.category_name] = r.id; });

const userMap = {};
db.prepare("SELECT id, email FROM users").all()
  .forEach((r) => { userMap[r.email] = r.id; });

const existingIds = new Set(
  db.prepare("SELECT complaint_id FROM complaints").all().map((r) => r.complaint_id)
);

const transformed = [];
const skipped     = [];

for (const row of rawComplaints) {
  const errors = [];

  // Validate required fields
  if (!row.complaint_id)                      errors.push("missing complaint_id");
  if (!VALID_PRIORITIES.includes(row.priority)) errors.push(`invalid priority: ${row.priority}`);
  if (!VALID_STATUSES.includes(row.status))     errors.push(`invalid status: ${row.status}`);
  if (!row.customer_email)                    errors.push("missing customer_email");
  if (!row.created_at)                        errors.push("missing created_at");

  // Map foreign keys
  const customerId  = userMap[row.customer_email];
  const agentId     = row.agent_email ? userMap[row.agent_email] : null;
  const categoryId  = categoryMap[row.category];

  if (!customerId)  errors.push(`unknown customer: ${row.customer_email}`);
  if (!categoryId)  errors.push(`unknown category: ${row.category}`);
  if (row.agent_email && !agentId) errors.push(`unknown agent: ${row.agent_email}`);

  if (errors.length > 0) {
    skipped.push({ id: row.complaint_id, reasons: errors });
    continue;
  }

  // Skip duplicates (idempotent)
  if (existingIds.has(row.complaint_id)) {
    skipped.push({ id: row.complaint_id, reasons: ["already exists — skipped"] });
    continue;
  }

  transformed.push({
    complaint_id: row.complaint_id,
    customer_id:  customerId,
    category_id:  categoryId,
    priority:     row.priority,
    assigned_to:  agentId ?? null,
    description:  row.description,
    status:       row.status,
    created_at:   row.created_at,
    sla_deadline: row.sla_deadline,
    resolved_at:  row.resolved_at || null,
  });
}

// Transform feedback
const transformedFeedback = [];
for (const row of rawFeedback) {
  const customerId = userMap[row.customer_email];
  const rating     = parseInt(row.rating, 10);
  if (!customerId || isNaN(rating) || rating < 1 || rating > 5) continue;
  if (!existingIds.has(row.complaint_id) && !transformed.find((c) => c.complaint_id === row.complaint_id)) continue;
  transformedFeedback.push({
    complaint_id: row.complaint_id,
    customer_id:  customerId,
    rating,
    submitted_at: row.submitted_at,
  });
}

console.log(`  Valid records   : ${transformed.length}`);
console.log(`  Skipped records : ${skipped.filter((s) => !s.reasons[0].includes("already exists")).length} (validation errors)`);
console.log(`  Duplicates      : ${skipped.filter((s) => s.reasons[0].includes("already exists")).length} (already in DB)`);
console.log(`  Feedback valid  : ${transformedFeedback.length}`);

if (skipped.some((s) => !s.reasons[0].includes("already exists"))) {
  console.log("\n  Validation errors:");
  skipped
    .filter((s) => !s.reasons[0].includes("already exists"))
    .forEach((s) => console.log(`    ${s.id}: ${s.reasons.join(", ")}`));
}

// ── Load ──────────────────────────────────────────────────────────────────────
console.log("\n── LOAD ──────────────────────────────────────────────────────────");

const insertComplaint = db.prepare(`
  INSERT INTO complaints
    (complaint_id, customer_id, category_id, priority, assigned_to,
     description, status, sla_deadline, resolved_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertHistory = db.prepare(`
  INSERT INTO complaint_history (complaint_id, changed_by, old_status, new_status, note, changed_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertFeedback = db.prepare(`
  INSERT OR IGNORE INTO feedback (complaint_id, customer_id, rating, comments, submitted_at)
  VALUES (?, ?, ?, ?, ?)
`);

let loadedComplaints = 0;
let loadedFeedback   = 0;
let loadErrors       = 0;

const assignedAt = (createdAt) =>
  new Date(new Date(createdAt).getTime() + 3_600_000).toISOString().replace("T", " ").slice(0, 19);

try {
  db.exec("BEGIN TRANSACTION");

  for (const c of transformed) {
    try {
      insertComplaint.run(
        c.complaint_id, c.customer_id, c.category_id, c.priority,
        c.assigned_to, c.description, c.status,
        c.sla_deadline, c.resolved_at, c.created_at
      );

      // Initial creation history entry
      insertHistory.run(
        c.complaint_id, null, null, "Open",
        "Complaint imported via ETL pipeline.", c.created_at
      );

      // Assignment history entry
      if (c.assigned_to && c.status !== "Open") {
        insertHistory.run(
          c.complaint_id, c.assigned_to, "Open", "Assigned",
          "Assigned to agent during ETL import.", assignedAt(c.created_at)
        );
      }

      // Resolution history entry
      if (c.resolved_at && ["Resolved", "Closed"].includes(c.status)) {
        insertHistory.run(
          c.complaint_id, c.assigned_to, "In Progress", c.status,
          `${c.status} via ETL import.`, c.resolved_at
        );
      }

      loadedComplaints++;
    } catch (err) {
      console.error(`  Error loading ${c.complaint_id}: ${err.message}`);
      loadErrors++;
    }
  }

  for (const f of transformedFeedback) {
    try {
      insertFeedback.run(f.complaint_id, f.customer_id, f.rating, null, f.submitted_at);
      loadedFeedback++;
    } catch (err) {
      console.error(`  Error loading feedback for ${f.complaint_id}: ${err.message}`);
    }
  }

  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Transaction failed, rolled back:", err.message);
  process.exit(1);
}

// ── Summary ───────────────────────────────────────────────────────────────────
const totalComplaints = db.prepare("SELECT COUNT(*) AS n FROM complaints").get().n;
const totalFeedback   = db.prepare("SELECT COUNT(*) AS n FROM feedback").get().n;

console.log(`  Complaints loaded : ${loadedComplaints} (${loadErrors} errors)`);
console.log(`  Feedback loaded   : ${loadedFeedback}`);
console.log(`\n── RESULT ───────────────────────────────────────────────────────`);
console.log(`  Total complaints in DB : ${totalComplaints}`);
console.log(`  Total feedback in DB   : ${totalFeedback}`);

// Quick analytics snapshot
const stats = db.prepare(`
  SELECT
    COUNT(*)                                                            AS total,
    SUM(priority = 'Critical')                                          AS critical,
    SUM(priority = 'High')                                              AS high,
    SUM(priority = 'Medium')                                            AS medium,
    SUM(priority = 'Low')                                               AS low,
    SUM(status IN ('Resolved','Closed'))                                AS resolved_closed,
    SUM(sla_deadline IS NOT NULL AND resolved_at IS NOT NULL
        AND resolved_at > sla_deadline
        AND status IN ('Resolved','Closed'))                            AS sla_breached,
    ROUND(AVG(CASE WHEN resolved_at IS NOT NULL
              THEN (julianday(resolved_at) - julianday(created_at)) * 24 END), 1) AS avg_resolution_h
  FROM complaints
`).get();

console.log(`\n── DB ANALYTICS SNAPSHOT ────────────────────────────────────────`);
console.log(`  Priority   : Critical ${stats.critical} | High ${stats.high} | Medium ${stats.medium} | Low ${stats.low}`);
console.log(`  Resolved/Closed : ${stats.resolved_closed} of ${stats.total}`);
console.log(`  SLA Breaches    : ${stats.sla_breached}`);
console.log(`  Avg Resolution  : ${stats.avg_resolution_h}h`);
console.log(`\n✅ ETL pipeline complete.\n`);
