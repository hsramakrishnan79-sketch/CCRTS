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
