import { useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatXLabel(val) {
  const s = String(val);
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-");
    return `${MONTHS[parseInt(m) - 1]} '${y.slice(2)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [, m, d] = s.split("-");
    return `${MONTHS[parseInt(m) - 1]} ${parseInt(d)}`;
  }
  return s.slice(-5);
}

function lightenHex(hex, amount = 0.55) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((n >> 8)  & 0xff) + (255 - ((n >> 8)  & 0xff)) * amount));
  const b = Math.min(255, Math.round((n & 0xff)          + (255 - (n & 0xff))          * amount));
  return `rgb(${r},${g},${b})`;
}

export function HBar({ label, count, max, color = "#1e3c72", labelWidth = 180 }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
      <span style={{ width: `${labelWidth}px`, fontSize: "13px", color: "#555", flexShrink: 0, textAlign: "right" }}>
        {label}
      </span>
      <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "4px", height: "22px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: "4px", transition: "width 0.4s" }} />
      </div>
      <span style={{ width: "36px", fontWeight: 700, fontSize: "13px", color, textAlign: "right" }}>{count}</span>
    </div>
  );
}

export function VBars({ data, keyX, keyY = "count", labelKey, color = "#1e3c72", height = 180 }) {
  const xKey       = keyX ?? labelKey ?? "month";
  const max        = Math.max(...data.map((d) => d[keyY] ?? 0), 1);
  const barAreaH   = height - 36;
  const lightColor = lightenHex(color);

  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltip, setTooltip]       = useState(null);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>

      {/* Gridlines at 25 / 50 / 75 / 100% */}
      {[25, 50, 75, 100].map((pct) => (
        <div key={pct} style={{
          position: "absolute",
          bottom: `${20 + (pct / 100) * barAreaH}px`,
          left: 0, right: 0,
          borderTop: pct === 100 ? "1px dashed #d0d3d8" : "1px dashed #e8eaed",
          pointerEvents: "none",
        }} />
      ))}

      {/* Baseline */}
      <div style={{
        position: "absolute", bottom: "20px",
        left: 0, right: 0,
        borderTop: "1.5px solid #d0d3d8",
        pointerEvents: "none",
      }} />

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          background: "#1e3c72", color: "white", borderRadius: "6px",
          padding: "4px 12px", fontSize: "12px", fontWeight: 600,
          pointerEvents: "none", whiteSpace: "nowrap", zIndex: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}>
          {tooltip.label}: {tooltip.val}
        </div>
      )}

      {/* Bars */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height }}>
        {data.map((d, i) => {
          const val      = d[keyY] ?? 0;
          const barH     = (val / max) * barAreaH;
          const isHovered = hoveredIdx === i;

          return (
            <div
              key={d[xKey] ?? i}
              style={{ width: "44px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}
              onMouseEnter={() => { setHoveredIdx(i); setTooltip({ label: formatXLabel(d[xKey]), val }); }}
              onMouseLeave={() => { setHoveredIdx(null); setTooltip(null); }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: val > 0 ? color : "transparent", lineHeight: 1 }}>
                {val > 0 ? val : "·"}
              </span>
              <div style={{
                width: "70%",
                background: `linear-gradient(to bottom, ${color}, ${lightColor})`,
                borderRadius: "4px 4px 0 0",
                height: `${barH}px`, minHeight: val > 0 ? "4px" : "0",
                opacity: isHovered ? 1 : 0.85,
                boxShadow: isHovered ? `0 -3px 10px ${color}55` : "none",
                transition: "opacity 0.15s, box-shadow 0.15s, height 0.4s",
              }} />
              <span style={{ fontSize: "10px", color: "#888", whiteSpace: "nowrap", lineHeight: 1.2 }}>
                {formatXLabel(d[xKey])}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
