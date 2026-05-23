export const statusClass = (status) => {
  const map = {
    "Open":                      "badge status-open",
    "Assigned":                  "badge status-assigned",
    "In Progress":               "badge status-in-progress",
    "Pending Customer Response": "badge status-pending-customer",
    "Escalated":                 "badge status-escalated",
    "Resolved":                  "badge status-resolved",
    "Closed":                    "badge status-closed",
  };
  return map[status] ?? "badge";
};

export const priorityClass = (priority) => {
  const map = {
    Low:      "priority-low",
    Medium:   "priority-medium",
    High:     "priority-high",
    Critical: "priority-critical",
  };
  return map[priority] ?? "";
};

export const isSlaBreached = (c) =>
  c.sla_deadline &&
  !["Resolved", "Closed"].includes(c.status) &&
  new Date(c.sla_deadline) < new Date();

export const roleBadgeClass = (role) => {
  const map = {
    admin:      "role-badge role-admin",
    supervisor: "role-badge role-supervisor",
    agent:      "role-badge role-agent",
    customer:   "role-badge role-customer",
    quality:    "role-badge role-quality",
  };
  return map[role] ?? "role-badge";
};

export const PRIORITY_COLOR = {
  Critical: "#dc3545", High: "#fd7e14", Medium: "#ffc107", Low: "#28a745",
};

export const STATUS_COLOR = {
  "Open": "#6c757d", "Assigned": "#004085", "In Progress": "#0c5460",
  "Pending Customer Response": "#856404", "Escalated": "#721c24",
  "Resolved": "#155724", "Closed": "#383d41",
};

export const STATUS_DOT_COLOR = {
  "Open": "#383d41", "Assigned": "#004085", "In Progress": "#0c5460",
  "Pending Customer Response": "#856404", "Escalated": "#721c24",
  "Resolved": "#155724", "Closed": "#6c757d",
};

export const SCORE_COLOR = (s) =>
  s >= 80 ? "#28a745" : s >= 60 ? "#fd7e14" : "#dc3545";

export const overdueBy = (dateStr) => {
  if (!dateStr) return "—";
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  return h < 24 ? `${h}h overdue` : `${Math.floor(h / 24)}d overdue`;
};
