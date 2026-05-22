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
        COALESCE(cat.category_name, 'Uncategorised') AS category,
        COUNT(*) AS count
      FROM complaints c
      LEFT JOIN categories cat ON cat.id = c.category_id
      GROUP BY c.category_id
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
        u.name                                               AS agent,
        COUNT(*)                                             AS total,
        SUM(c.status IN ('Resolved','Closed'))               AS resolved,
        SUM(c.status = 'Escalated')                          AS escalated,
        ROUND(AVG(
          CASE WHEN c.resolved_at IS NOT NULL
          THEN (julianday(c.resolved_at) - julianday(c.created_at)) * 24 END
        ), 1)                                                AS avgResolutionHours
      FROM complaints c
      JOIN users u ON u.id = c.assigned_to
      WHERE c.assigned_to IS NOT NULL
      GROUP BY c.assigned_to, u.name
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

    // ── Cross-category assignments ────────────────────────────────────────────
    const crossTotal = db.prepare(
      "SELECT COUNT(*) AS total FROM cross_category_assignments"
    ).get().total;

    const crossByCategory = db.prepare(`
      SELECT cat.category_name AS category, COUNT(*) AS count
      FROM cross_category_assignments cca
      JOIN categories cat ON cat.id = cca.category_id
      GROUP BY cca.category_id
      ORDER BY count DESC
    `).all();

    const crossByAgent = db.prepare(`
      SELECT u.name AS agent, COUNT(*) AS count
      FROM cross_category_assignments cca
      JOIN users u ON u.id = cca.agent_id
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
      ORDER BY cca.assigned_at DESC
      LIMIT 20
    `).all();

    res.status(200).json({
      overview: { ...overview, slaCompliance },
      byCategory,
      byPriority,
      byMonth,
      agentPerformance,
      satisfaction: { ...satisfactionAvg, distribution: satisfactionDist },
      crossAssignments: { total: crossTotal, byCategory: crossByCategory, byAgent: crossByAgent, recent: crossRecent },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getReports };
