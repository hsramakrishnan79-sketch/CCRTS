export function HBar({ label, count, max, color = "#1e3c72", labelWidth = 180 }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
      <span style={{ width: `${labelWidth}px`, fontSize: "13px", color: "#555", flexShrink: 0, textAlign: "right" }}>{label}</span>
      <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "22px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.4s" }} />
      </div>
      <span style={{ width: "30px", fontWeight: 700, fontSize: "13px", color }}>{count}</span>
    </div>
  );
}

// keyX / labelKey  — field name for x-axis label
// keyY             — field name for bar height (defaults to "count")
export function VBars({ data, keyX, keyY = "count", labelKey, color = "#1e3c72", height = 120 }) {
  const xKey = keyX ?? labelKey ?? "month";
  const max   = Math.max(...data.map((d) => d[keyY] ?? 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height }}>
      {data.map((d, i) => (
        <div key={d[xKey] ?? i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#555" }}>
            {(d[keyY] ?? 0) > 0 ? d[keyY] : ""}
          </span>
          <div style={{
            width: "100%", background: color, borderRadius: "4px 4px 0 0",
            height: `${((d[keyY] ?? 0) / max) * (height - 30)}px`,
            minHeight: (d[keyY] ?? 0) > 0 ? "4px" : "0",
          }} />
          <span style={{ fontSize: "10px", color: "#aaa", whiteSpace: "nowrap" }}>
            {String(d[xKey]).slice(-5)}
          </span>
        </div>
      ))}
    </div>
  );
}
