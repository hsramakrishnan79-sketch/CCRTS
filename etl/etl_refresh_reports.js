/**
 * ETL Step 3 — Reporting Tables Refresh
 * Truncates and repopulates all four reporting tables from the operational
 * complaints table. Safe to re-run at any time (idempotent via DELETE+INSERT).
 *
 * Run: node etl/etl_refresh_reports.js
 * API: POST /api/reports/refresh  (triggers this logic server-side)
 */

const db  = require("../backend/config/db");
const now = new Date().toISOString().replace("T", " ").slice(0, 19);

function refresh() {
  console.log(`\n── ETL REPORTING REFRESH — ${now} ───────────────────────────`);

  db.exec("BEGIN TRANSACTION");
  try {
    refreshSlaSummary();
    refreshCategoryTrends();
    refreshAgentPerformance();
    refreshResolutionTrends();
    db.exec("COMMIT");
    console.log("\n✅ All reporting tables refreshed.\n");
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Refresh failed, rolled back:", err.message);
    throw err;
  }
}

// ── 1. report_sla_summary ─────────────────────────────────────────────────────
function refreshSlaSummary() {
  db.exec("DELETE FROM report_sla_summary");

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', c.created_at)                                     AS period,
      COALESCE(cat.category_name, 'Uncategorised')                        AS category,
      c.priority,
      COUNT(*)                                                             AS total,
      SUM(CASE WHEN c.resolved_at IS NOT NULL AND c.sla_deadline IS NOT NULL
               AND c.resolved_at <= c.sla_deadline THEN 1 ELSE 0 END)    AS compliant,
      SUM(CASE WHEN c.resolved_at IS NOT NULL AND c.sla_deadline IS NOT NULL
               AND c.resolved_at > c.sla_deadline  THEN 1 ELSE 0 END)    AS breached
    FROM complaints c
    LEFT JOIN categories cat ON cat.id = c.category_id
    WHERE c.status IN ('Resolved', 'Closed')
      AND c.resolved_at IS NOT NULL
      AND c.sla_deadline IS NOT NULL
    GROUP BY period, category, c.priority
    ORDER BY period, category, c.priority
  `).all();

  const ins = db.prepare(`
    INSERT OR REPLACE INTO report_sla_summary
      (period, category, priority, total, compliant, breached, compliance_rate, refreshed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  rows.forEach((r) => {
    const rate = r.total > 0 ? Math.round((r.compliant / r.total) * 1000) / 10 : 0;
    ins.run(r.period, r.category, r.priority, r.total, r.compliant, r.breached, rate, now);
  });

  console.log(`  report_sla_summary        : ${rows.length} rows`);
}

// ── 2. report_category_trends ─────────────────────────────────────────────────
function refreshCategoryTrends() {
  db.exec("DELETE FROM report_category_trends");

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', c.created_at)                                       AS period,
      COALESCE(cat.category_name, 'Uncategorised')                          AS category,
      COUNT(*)                                                               AS total,
      SUM(c.status IN ('Resolved', 'Closed'))                               AS resolved,
      SUM(c.status = 'Escalated')                                           AS escalated,
      ROUND(AVG(
        CASE WHEN c.resolved_at IS NOT NULL
        THEN (julianday(c.resolved_at) - julianday(c.created_at)) * 24
        END
      ), 1)                                                                  AS avg_resolution_hours
    FROM complaints c
    LEFT JOIN categories cat ON cat.id = c.category_id
    GROUP BY period, category
    ORDER BY period, category
  `).all();

  const ins = db.prepare(`
    INSERT OR REPLACE INTO report_category_trends
      (period, category, total, resolved, escalated, avg_resolution_hours, refreshed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  rows.forEach((r) => {
    ins.run(r.period, r.category, r.total, r.resolved, r.escalated, r.avg_resolution_hours, now);
  });

  console.log(`  report_category_trends    : ${rows.length} rows`);
}

// ── 3. report_agent_performance ───────────────────────────────────────────────
function refreshAgentPerformance() {
  db.exec("DELETE FROM report_agent_performance");

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', c.created_at)                                       AS period,
      u.id                                                                   AS agent_id,
      u.name                                                                 AS agent_name,
      COUNT(DISTINCT c.id)                                                   AS total_handled,
      ROUND(AVG(f.rating), 1)                                               AS avg_rating,
      SUM(CASE WHEN c.resolved_at IS NOT NULL AND c.sla_deadline IS NOT NULL
               AND c.resolved_at <= c.sla_deadline THEN 1 ELSE 0 END)      AS on_time,
      SUM(CASE WHEN c.resolved_at IS NOT NULL
               AND c.sla_deadline IS NOT NULL THEN 1 ELSE 0 END)           AS total_resolved
    FROM complaints c
    JOIN users u ON u.id = c.assigned_to
    LEFT JOIN feedback f ON f.complaint_id = c.complaint_id
    WHERE c.assigned_to IS NOT NULL
    GROUP BY period, u.id, u.name
    ORDER BY period, u.name
  `).all();

  // Reopen counts per agent per month
  const reopenRows = db.prepare(`
    SELECT
      strftime('%Y-%m', ch.changed_at)  AS period,
      c.assigned_to                      AS agent_id,
      COUNT(DISTINCT ch.complaint_id)    AS reopened
    FROM complaint_history ch
    JOIN complaints c ON c.complaint_id = ch.complaint_id
    WHERE ch.old_status = 'Closed' AND ch.new_status = 'Assigned'
      AND c.assigned_to IS NOT NULL
    GROUP BY period, c.assigned_to
  `).all();

  const reopenMap = {};
  reopenRows.forEach((r) => {
    reopenMap[`${r.period}|${r.agent_id}`] = r.reopened;
  });

  const ins = db.prepare(`
    INSERT OR REPLACE INTO report_agent_performance
      (period, agent_id, agent_name, total_handled, avg_rating,
       sla_compliance, reopened, score, refreshed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  rows.forEach((r) => {
    const reopened      = reopenMap[`${r.period}|${r.agent_id}`] ?? 0;
    const slaCompliance = r.total_resolved > 0
      ? Math.round((r.on_time / r.total_resolved) * 1000) / 10 : null;
    const ratingScore   = r.avg_rating    != null ? (r.avg_rating    / 5)   * 50 : 25;
    const slaScore      = slaCompliance   != null ? (slaCompliance   / 100) * 30 : 15;
    const reopenRate    = r.total_handled > 0 ? reopened / r.total_handled  : 0;
    const reopenScore   = (1 - Math.min(reopenRate, 1)) * 20;
    const score         = Math.round(ratingScore + slaScore + reopenScore);

    ins.run(
      r.period, r.agent_id, r.agent_name, r.total_handled,
      r.avg_rating, slaCompliance, reopened, score, now
    );
  });

  console.log(`  report_agent_performance  : ${rows.length} rows`);
}

// ── 4. report_resolution_trends ───────────────────────────────────────────────
function refreshResolutionTrends() {
  db.exec("DELETE FROM report_resolution_trends");

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', c.created_at)                                         AS period,
      c.priority,
      COUNT(*)                                                                 AS total_resolved,
      ROUND(AVG((julianday(c.resolved_at) - julianday(c.created_at)) * 24), 1) AS avg_resolution_hours,
      ROUND(MIN((julianday(c.resolved_at) - julianday(c.created_at)) * 24), 1) AS min_resolution_hours,
      ROUND(MAX((julianday(c.resolved_at) - julianday(c.created_at)) * 24), 1) AS max_resolution_hours
    FROM complaints c
    WHERE c.resolved_at IS NOT NULL
      AND c.status IN ('Resolved', 'Closed')
    GROUP BY period, c.priority
    ORDER BY period, c.priority
  `).all();

  const ins = db.prepare(`
    INSERT OR REPLACE INTO report_resolution_trends
      (period, priority, total_resolved, avg_resolution_hours,
       min_resolution_hours, max_resolution_hours, refreshed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  rows.forEach((r) => {
    ins.run(
      r.period, r.priority, r.total_resolved,
      r.avg_resolution_hours, r.min_resolution_hours, r.max_resolution_hours, now
    );
  });

  console.log(`  report_resolution_trends  : ${rows.length} rows`);
}

// ── Run if called directly ────────────────────────────────────────────────────
if (require.main === module) {
  refresh();
}

module.exports = { refresh };
