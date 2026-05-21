const db = require("../config/db");

const getReports = (req, res) => {
  try {
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
    `).get();

    // SLA compliance among resolved
    const slaCompliance = db.prepare(`
      SELECT
        COUNT(*) AS totalResolved,
        SUM(resolved_at <= sla_deadline) AS onTime
      FROM complaints
      WHERE status IN ('Resolved','Closed')
        AND sla_deadline IS NOT NULL
        AND resolved_at IS NOT NULL
    `).get();

    // ── By Category ───────────────────────────────────────────────────────────
    const byCategory = db.prepare(`
      SELECT
        COALESCE(category, 'Uncategorised') AS category,
        COUNT(*) AS count
      FROM complaints
      GROUP BY category
      ORDER BY count DESC
    `).all();

    // ── By Priority ───────────────────────────────────────────────────────────
    const byPriority = db.prepare(`
      SELECT
        COALESCE(priority, 'Unknown') AS priority,
        COUNT(*) AS count
      FROM complaints
      GROUP BY priority
      ORDER BY CASE priority
        WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
        WHEN 'Medium'   THEN 3 WHEN 'Low'  THEN 4 ELSE 5 END
    `).all();

    // ── Monthly trend (last 6 months) ─────────────────────────────────────────
    const byMonth = db.prepare(`
      SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
      FROM complaints
      WHERE created_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();

    // ── Agent performance ─────────────────────────────────────────────────────
    const agentPerformance = db.prepare(`
      SELECT
        assigned_to                                             AS agent,
        COUNT(*)                                               AS total,
        SUM(status IN ('Resolved','Closed'))                   AS resolved,
        SUM(status = 'Escalated')                              AS escalated,
        ROUND(AVG(
          CASE WHEN resolved_at IS NOT NULL
          THEN (julianday(resolved_at) - julianday(created_at)) * 24 END
        ), 1)                                                  AS avgResolutionHours
      FROM complaints
      WHERE assigned_to IS NOT NULL AND assigned_to != ''
      GROUP BY assigned_to
      ORDER BY total DESC
    `).all();

    // ── Customer satisfaction ─────────────────────────────────────────────────
    const satisfactionDist = db.prepare(`
      SELECT rating, COUNT(*) AS count
      FROM feedback
      GROUP BY rating
      ORDER BY rating DESC
    `).all();

    const satisfactionAvg = db.prepare(`
      SELECT ROUND(AVG(rating), 1) AS avgRating, COUNT(*) AS total
      FROM feedback
    `).get();

    res.status(200).json({
      overview: { ...overview, slaCompliance },
      byCategory,
      byPriority,
      byMonth,
      agentPerformance,
      satisfaction: { ...satisfactionAvg, distribution: satisfactionDist },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getReports };
