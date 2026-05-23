const db = require("../config/db");

// ── Admin: month-wise complaint volume (last 12 months) ──────────────────────
const getAdminDashboard = (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*)                                                    AS total,
        SUM(status = 'Open')                                        AS open,
        SUM(status = 'In Progress')                                 AS inProgress,
        SUM(status = 'Escalated')                                   AS escalated,
        SUM(status = 'Resolved')                                    AS resolved,
        SUM(status = 'Closed')                                      AS closed,
        SUM(
          sla_deadline IS NOT NULL AND sla_deadline < datetime('now')
          AND status NOT IN ('Resolved','Closed')
        )                                                           AS slaBreaches,
        (SELECT COUNT(DISTINCT complaint_id) FROM complaint_history
         WHERE old_status = 'Closed' AND new_status = 'Assigned')  AS reopened,
        ROUND(AVG(
          CASE WHEN resolved_at IS NOT NULL
          THEN (julianday(resolved_at) - julianday(created_at)) * 24 END
        ), 1)                                                       AS avgResolutionHours
      FROM complaints
    `).get();

    const monthlyTrend = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at)           AS month,
        COUNT(*)                                AS total,
        SUM(status IN ('Resolved','Closed'))    AS resolved,
        SUM(status = 'Escalated')               AS escalated
      FROM complaints
      WHERE created_at >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();

    const byCategory = db.prepare(`
      SELECT COALESCE(cat.category_name, 'Uncategorised') AS category, COUNT(*) AS count
      FROM complaints c
      LEFT JOIN categories cat ON cat.id = c.category_id
      GROUP BY c.category_id
      ORDER BY count DESC
    `).all();

    res.json({ stats, monthlyTrend, byCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── Supervisor: day-wise complaint volume (last 14 days) + agent workload ─────
const getSupervisorDashboard = (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        SUM(status = 'Open')        AS open,
        SUM(status = 'In Progress') AS inProgress,
        SUM(status = 'Escalated')   AS escalated,
        SUM(
          sla_deadline IS NOT NULL AND sla_deadline < datetime('now')
          AND status NOT IN ('Resolved','Closed')
        )                           AS slaBreaches,
        (SELECT COUNT(DISTINCT complaint_id) FROM complaint_history
         WHERE old_status = 'Closed' AND new_status = 'Assigned') AS reopened
      FROM complaints
    `).get();

    const dailyTrend = db.prepare(`
      SELECT
        date(created_at)            AS day,
        COUNT(*)                    AS total,
        SUM(status = 'Escalated')   AS escalated,
        SUM(
          sla_deadline IS NOT NULL AND sla_deadline < datetime('now')
          AND status NOT IN ('Resolved','Closed')
        )                           AS slaBreaches
      FROM complaints
      WHERE created_at >= date('now', '-14 days')
      GROUP BY day
      ORDER BY day ASC
    `).all();

    const agentWorkload = db.prepare(`
      SELECT
        u.name                                  AS agent,
        COUNT(*)                                AS total,
        SUM(c.status = 'Assigned')              AS assigned,
        SUM(c.status = 'In Progress')           AS inProgress,
        SUM(c.status = 'Escalated')             AS escalated,
        SUM(c.status IN ('Resolved','Closed'))  AS resolved
      FROM complaints c
      JOIN users u ON u.id = c.assigned_to
      WHERE c.assigned_to IS NOT NULL
        AND c.status NOT IN ('Closed')
      GROUP BY c.assigned_to, u.name
      ORDER BY total DESC
    `).all();

    res.json({ stats, dailyTrend, agentWorkload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── Quality: day-wise feedback trend + satisfaction + SLA + cross-category ───
const getQualityDashboard = (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        ROUND((SELECT AVG(rating) FROM feedback), 1)      AS avgRating,
        (SELECT COUNT(*) FROM feedback)                   AS totalFeedback,
        (SELECT COUNT(DISTINCT complaint_id)
         FROM complaint_history
         WHERE old_status = 'Closed' AND new_status = 'Assigned') AS reopened,
        (SELECT COUNT(*) FROM cross_category_assignments) AS crossCategoryCount,
        ROUND(
          100.0 * (SELECT SUM(resolved_at <= sla_deadline)
                   FROM complaints
                   WHERE status IN ('Resolved','Closed')
                     AND sla_deadline IS NOT NULL AND resolved_at IS NOT NULL)
          / MAX((SELECT COUNT(*) FROM complaints
                 WHERE status IN ('Resolved','Closed')
                   AND sla_deadline IS NOT NULL AND resolved_at IS NOT NULL), 1)
        , 1)                                              AS slaComplianceRate,
        (SELECT COUNT(*) FROM complaints
         WHERE status = 'Resolved'
           AND resolved_at <= date('now', '-7 days')
           AND complaint_id NOT IN (SELECT complaint_id FROM feedback))
                                                          AS pendingFeedback
      FROM complaints LIMIT 1
    `).get();

    const dailyFeedback = db.prepare(`
      SELECT
        date(submitted_at)          AS day,
        ROUND(AVG(rating), 1)       AS avgRating,
        COUNT(*)                    AS count
      FROM feedback
      WHERE submitted_at >= date('now', '-14 days')
      GROUP BY day
      ORDER BY day ASC
    `).all();

    const ratingDistribution = db.prepare(`
      SELECT rating, COUNT(*) AS count
      FROM feedback
      GROUP BY rating
      ORDER BY rating DESC
    `).all();

    const slaByCategory = db.prepare(`
      SELECT
        COALESCE(cat.category_name, 'Uncategorised') AS category,
        COUNT(*)                                      AS total,
        SUM(c.resolved_at <= c.sla_deadline)          AS onTime,
        ROUND(100.0 * SUM(c.resolved_at <= c.sla_deadline) / MAX(COUNT(*), 1), 1) AS complianceRate
      FROM complaints c
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.status IN ('Resolved','Closed')
        AND c.sla_deadline IS NOT NULL AND c.resolved_at IS NOT NULL
      GROUP BY c.category_id
      ORDER BY complianceRate ASC
    `).all();

    res.json({ stats, dailyFeedback, ratingDistribution, slaByCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ── Shared score formula ──────────────────────────────────────────────────────
function computeScore(avgRating, slaCompliance, reopened, totalHandled) {
  const ratingScore = avgRating    != null ? (avgRating    / 5)   * 50 : 25;
  const slaScore    = slaCompliance != null ? (slaCompliance / 100) * 30 : 15;
  const reopenRate  = totalHandled  > 0    ? reopened / totalHandled   : 0;
  const reopenScore = (1 - Math.min(reopenRate, 1)) * 20;
  return Math.round(ratingScore + slaScore + reopenScore);
}

// ── Agent performance ranking (admin + quality) ───────────────────────────────
const getAgentPerformance = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        u.id,
        u.name                                                            AS agent,
        COUNT(DISTINCT c.id)                                              AS totalHandled,
        ROUND(AVG(f.rating), 1)                                           AS avgRating,
        SUM(CASE WHEN c.resolved_at IS NOT NULL AND c.sla_deadline IS NOT NULL
                  AND c.resolved_at <= c.sla_deadline THEN 1 ELSE 0 END) AS onTime,
        SUM(CASE WHEN c.resolved_at IS NOT NULL
                  AND c.sla_deadline IS NOT NULL THEN 1 ELSE 0 END)      AS totalResolved
      FROM complaints c
      JOIN users u ON u.id = c.assigned_to
      LEFT JOIN feedback f ON f.complaint_id = c.complaint_id
      WHERE c.assigned_to IS NOT NULL
        AND c.created_at >= date('now', '-30 days')
      GROUP BY u.id, u.name
      HAVING totalHandled > 0
    `).all();

    const reopenedMap = {};
    db.prepare(`
      SELECT c.assigned_to AS agentId, COUNT(DISTINCT ch.complaint_id) AS count
      FROM complaint_history ch
      JOIN complaints c ON c.complaint_id = ch.complaint_id
      WHERE ch.old_status = 'Closed' AND ch.new_status = 'Assigned'
        AND ch.changed_at >= date('now', '-30 days')
      GROUP BY c.assigned_to
    `).all().forEach((r) => { reopenedMap[r.agentId] = r.count; });

    const agents = rows.map((r) => {
      const reopened      = reopenedMap[r.id] ?? 0;
      const slaCompliance = r.totalResolved > 0
        ? Math.round((r.onTime / r.totalResolved) * 100) : null;
      const score = computeScore(r.avgRating, slaCompliance, reopened, r.totalHandled);
      return { id: r.id, agent: r.agent, totalHandled: r.totalHandled,
               avgRating: r.avgRating, slaCompliance, reopened, score };
    });

    agents.sort((a, b) => b.score - a.score);
    res.json({ agents, period: "Last 30 Days" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getAdminDashboard, getSupervisorDashboard, getQualityDashboard, getAgentPerformance,
};
