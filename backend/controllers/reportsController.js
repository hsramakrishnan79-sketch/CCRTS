const db  = require("../config/db");
const etl = require("../../etl/etl_refresh_reports");

// Build a SQL date-range clause based on query params
// mode: "monthly" (month=YYYY-MM) | "yearly" (year=YYYY) | "custom" (from, to) | "" (all time)
// Maps query params to a WHERE clause on the period (YYYY-MM) column
// used by reporting tables
const QUARTER_MONTHS = {
  Q1: ["01","02","03"], Q2: ["04","05","06"],
  Q3: ["07","08","09"], Q4: ["10","11","12"],
};

function buildPeriodFilter(query) {
  const { mode, month, year, quarter, from, to } = query;
  if (mode === "monthly" && month)
    return `period = '${month}'`;
  if (mode === "yearly" && year)
    return `period LIKE '${year}-%'`;
  if (mode === "quarterly" && year && quarter && QUARTER_MONTHS[quarter]) {
    const list = QUARTER_MONTHS[quarter].map((m) => `'${year}-${m}'`).join(",");
    return `period IN (${list})`;
  }
  if (mode === "custom" && from && to)
    return `period >= '${from.slice(0, 7)}' AND period <= '${to.slice(0, 7)}'`;
  return null; // all time
}

const QUARTER_RANGES = {
  Q1: ["01-01", "03-31"], Q2: ["04-01", "06-30"],
  Q3: ["07-01", "09-30"], Q4: ["10-01", "12-31"],
};

function buildDateFilter(query) {
  const { mode, month, year, quarter, from, to } = query;

  if (mode === "monthly" && month) {
    const [y, m] = month.split("-");
    const next = m === "12" ? `${Number(y) + 1}-01` : `${y}-${String(Number(m) + 1).padStart(2, "0")}`;
    return { clause: `created_at >= '${month}-01' AND created_at < '${next}-01'`, trendGroup: "day" };
  }
  if (mode === "quarterly" && year && quarter && QUARTER_RANGES[quarter]) {
    const [start, end] = QUARTER_RANGES[quarter];
    return { clause: `created_at >= '${year}-${start}' AND created_at <= '${year}-${end} 23:59:59'`, trendGroup: "month" };
  }
  if (mode === "yearly" && year) {
    return { clause: `created_at >= '${year}-01-01' AND created_at < '${Number(year) + 1}-01-01'`, trendGroup: "month" };
  }
  if (mode === "custom" && from && to) {
    return { clause: `created_at >= '${from}' AND created_at <= '${to} 23:59:59'`, trendGroup: "month" };
  }
  return { clause: null, trendGroup: "month" };
}

const getReports = (req, res) => {
  try {
    const { clause, trendGroup } = buildDateFilter(req.query);
    const where = clause ? `WHERE ${clause}` : "";
    const andWhere = clause ? `AND ${clause}` : "";

    // ── Overview ──────────────────────────────────────────────────────────────
    const overview = db.prepare(`
      SELECT
        COUNT(*)                                                   AS total,
        SUM(status IN ('Resolved','Closed'))                       AS resolved,
        ROUND(
          100.0 * SUM(status IN ('Resolved','Closed')) / MAX(COUNT(*), 1)
        , 1)                                                       AS resolutionRate,
        ROUND(AVG(
          CASE WHEN resolved_at IS NOT NULL
          THEN (julianday(resolved_at) - julianday(created_at)) * 24 END
        ), 1)                                                      AS avgResolutionHours,
        SUM(
          sla_deadline IS NOT NULL
          AND sla_deadline < datetime('now')
          AND status NOT IN ('Resolved','Closed')
        )                                                          AS activeSlaBreaches
      FROM complaints
      ${where}
    `).get();

    const slaCompliance = db.prepare(`
      SELECT
        COUNT(*) AS totalResolved,
        SUM(resolved_at <= sla_deadline) AS onTime
      FROM complaints
      WHERE status IN ('Resolved','Closed')
        AND sla_deadline IS NOT NULL
        AND resolved_at IS NOT NULL
        ${andWhere}
    `).get();

    // ── By Category (from reporting table) ───────────────────────────────────
    const periodFilter  = buildPeriodFilter(req.query);
    const periodWhere   = periodFilter ? `WHERE ${periodFilter}` : "";
    const byCategory = db.prepare(`
      SELECT category, SUM(total) AS count
      FROM report_category_trends
      ${periodWhere}
      GROUP BY category
      ORDER BY count DESC
    `).all();

    // ── By Priority ───────────────────────────────────────────────────────────
    const byPriority = db.prepare(`
      SELECT
        COALESCE(priority, 'Unknown') AS priority,
        COUNT(*) AS count
      FROM complaints
      ${where}
      GROUP BY priority
      ORDER BY CASE priority
        WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
        WHEN 'Medium'   THEN 3 WHEN 'Low'  THEN 4 ELSE 5 END
    `).all();

    // ── Trend (daily or monthly depending on filter mode) ─────────────────────
    const trendFmt   = trendGroup === "day" ? "%Y-%m-%d" : "%Y-%m";
    const trendLabel = trendGroup === "day" ? "day" : "month";
    const trendRange = clause
      ? `WHERE ${clause.replace(/created_at/g, "created_at")}`
      : "WHERE created_at >= date('now', '-12 months')";

    const byTrend = db.prepare(`
      SELECT strftime('${trendFmt}', created_at) AS ${trendLabel}, COUNT(*) AS count
      FROM complaints
      ${trendRange}
      GROUP BY ${trendLabel}
      ORDER BY ${trendLabel} ASC
    `).all();

    // ── Agent performance (from reporting table) ──────────────────────────────
    const agentPerformance = db.prepare(`
      SELECT
        agent_name      AS agent,
        total_handled   AS total,
        avg_rating      AS avgRating,
        sla_compliance  AS slaCompliance,
        reopened,
        score
      FROM report_agent_performance
      ${periodWhere}
      GROUP BY agent_id, agent_name
      ORDER BY score DESC
    `).all();

    // ── SLA compliance analysis (from reporting table) ───────────────────────
    const slaByCategory = db.prepare(`
      SELECT
        category,
        SUM(total)     AS total,
        SUM(compliant) AS compliant,
        SUM(breached)  AS breached,
        ROUND(100.0 * SUM(compliant) / MAX(SUM(total), 1), 1) AS complianceRate
      FROM report_sla_summary
      ${periodWhere}
      GROUP BY category
      ORDER BY complianceRate DESC
    `).all();

    const slaByPriority = db.prepare(`
      SELECT
        priority,
        SUM(total)     AS total,
        SUM(compliant) AS compliant,
        SUM(breached)  AS breached,
        ROUND(100.0 * SUM(compliant) / MAX(SUM(total), 1), 1) AS complianceRate
      FROM report_sla_summary
      ${periodWhere}
      GROUP BY priority
      ORDER BY CASE priority
        WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
        WHEN 'Medium'   THEN 3 WHEN 'Low'  THEN 4 ELSE 5 END
    `).all();

    // ── Resolution time trends (from reporting table) ─────────────────────────
    const resolutionByPriority = db.prepare(`
      SELECT
        priority,
        SUM(total_resolved)                                          AS total,
        ROUND(AVG(avg_resolution_hours), 1)                         AS avgHours,
        ROUND(MIN(min_resolution_hours), 1)                         AS minHours,
        ROUND(MAX(max_resolution_hours), 1)                         AS maxHours
      FROM report_resolution_trends
      ${periodWhere}
      GROUP BY priority
      ORDER BY CASE priority
        WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
        WHEN 'Medium'   THEN 3 WHEN 'Low'  THEN 4 ELSE 5 END
    `).all();

    const resolutionByPeriod = db.prepare(`
      SELECT period, priority, avg_resolution_hours AS avgHours, total_resolved AS total
      FROM report_resolution_trends
      ${periodWhere}
      ORDER BY period ASC,
        CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 ELSE 5 END
    `).all();

    // ── Customer satisfaction ─────────────────────────────────────────────────
    const fbJoin = clause
      ? `JOIN complaints c ON c.complaint_id = f.complaint_id WHERE ${clause.replace(/created_at/g, "c.created_at")}`
      : "";

    const satisfactionDist = db.prepare(`
      SELECT rating, COUNT(*) AS count
      FROM feedback f
      ${fbJoin}
      GROUP BY rating
      ORDER BY rating DESC
    `).all();

    const satisfactionAvg = db.prepare(`
      SELECT ROUND(AVG(rating), 1) AS avgRating, COUNT(*) AS total
      FROM feedback f
      ${fbJoin}
    `).get();

    // ── Cross-category assignments ────────────────────────────────────────────
    const ccaWhere = clause
      ? `WHERE ${clause.replace(/created_at/g, "cca.assigned_at")}`
      : "";
    const ccaAnd = clause
      ? `AND ${clause.replace(/created_at/g, "cca.assigned_at")}`
      : "";

    const crossTotal = db.prepare(
      `SELECT COUNT(*) AS total FROM cross_category_assignments cca ${ccaWhere}`
    ).get().total;

    const crossByCategory = db.prepare(`
      SELECT cat.category_name AS category, COUNT(*) AS count
      FROM cross_category_assignments cca
      JOIN categories cat ON cat.id = cca.category_id
      ${ccaWhere}
      GROUP BY cca.category_id
      ORDER BY count DESC
    `).all();

    const crossByAgent = db.prepare(`
      SELECT u.name AS agent, COUNT(*) AS count
      FROM cross_category_assignments cca
      JOIN users u ON u.id = cca.agent_id
      ${ccaWhere}
      GROUP BY cca.agent_id
      ORDER BY count DESC
    `).all();

    const crossRecent = db.prepare(`
      SELECT
        cca.assigned_at,
        cca.complaint_id,
        cat.category_name    AS complaint_category,
        u_agent.name         AS agent,
        u_by.name            AS assigned_by,
        cca.note
      FROM cross_category_assignments cca
      JOIN categories cat   ON cat.id   = cca.category_id
      JOIN users u_agent    ON u_agent.id = cca.agent_id
      JOIN users u_by       ON u_by.id  = cca.assigned_by
      ${ccaWhere}
      ORDER BY cca.assigned_at DESC
      LIMIT 20
    `).all();

    res.status(200).json({
      overview: { ...overview, slaCompliance },
      byCategory,
      byPriority,
      byMonth: byTrend,
      trendGroup,
      agentPerformance,
      slaSummary: { byCategory: slaByCategory, byPriority: slaByPriority },
      resolutionTrends: { byPriority: resolutionByPriority, byPeriod: resolutionByPeriod },
      satisfaction: { ...satisfactionAvg, distribution: satisfactionDist },
      crossAssignments: { total: crossTotal, byCategory: crossByCategory, byAgent: crossByAgent, recent: crossRecent },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const refreshReports = (req, res) => {
  try {
    etl.refresh();
    res.status(200).json({ message: "Reporting tables refreshed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "ETL refresh failed.", detail: error.message });
  }
};

module.exports = { getReports, refreshReports };
