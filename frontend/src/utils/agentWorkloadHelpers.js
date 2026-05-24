/* Shared constants and helpers for agent workload display.
   Used by AgentWorkload.jsx and ComplaintSidePanel.jsx. */

export const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export const PRI_COLORS = {
  Critical: "#dc3545",
  High:     "#fd7e14",
  Medium:   "#ffc107",
  Low:      "#28a745",
};

export const PRI_BADGE = {
  Critical: { background: "#f8d7da", color: "#721c24" },
  High:     { background: "#fce5cd", color: "#7d3c00" },
  Medium:   { background: "#fff3cd", color: "#856404" },
  Low:      { background: "#d4edda", color: "#155724" },
};

export function agentUsed(w) {
  return Object.values(w.categories).reduce((s, v) => s + v, 0);
}

export function agentPct(w) {
  return w.max > 0 ? Math.round((agentUsed(w) / w.max) * 100) : 0;
}

export function loadColor(p) {
  return p >= 85 ? "#dc3545" : p >= 70 ? "#fd7e14" : "#28a745";
}

export function loadLabel(p) {
  return p >= 85 ? "Near Full" : p >= 70 ? "Busy" : p >= 50 ? "Available" : "Lightest";
}

export function makeStripGradient(w) {
  if (!w || agentUsed(w) === 0) return "#e0e0e0";
  let pos = 0, stops = [];
  PRIORITIES.forEach(pr => {
    const n = w.priority[pr] || 0;
    if (!n) return;
    const end = pos + (n / w.max) * 100;
    stops.push(`${PRI_COLORS[pr]} ${pos.toFixed(1)}%`, `${PRI_COLORS[pr]} ${end.toFixed(1)}%`);
    pos = end;
  });
  if (pos < 100) stops.push(`#e0e0e0 ${pos.toFixed(1)}%`, `#e0e0e0 100%`);
  return `linear-gradient(to right, ${stops.join(", ")})`;
}
