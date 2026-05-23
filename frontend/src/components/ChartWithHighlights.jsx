import { VBars } from "./ChartBars";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtLabel(val) {
  const s = String(val);
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-");
    return `${MONTHS_SHORT[parseInt(m) - 1]} '${y.slice(2)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [, m, d] = s.split("-");
    return `${MONTHS_SHORT[parseInt(m) - 1]} ${parseInt(d)}`;
  }
  return String(val);
}

export default function ChartWithHighlights({
  data, keyX = "month", keyY = "count", color = "#1e3c72", height = 180,
}) {
  if (!data || data.length === 0) return null;

  const values    = data.map((d) => d[keyY] ?? 0);
  const total     = values.reduce((s, v) => s + v, 0);
  const avg       = Math.round(total / values.length);
  const peak      = data.reduce((a, b) => ((b[keyY] ?? 0) > (a[keyY] ?? 0) ? b : a));
  const lowest    = data.reduce((a, b) => ((b[keyY] ?? 0) < (a[keyY] ?? 0) ? b : a));
  const recent    = data.slice(-3);
  const recentAvg = Math.round(recent.reduce((s, d) => s + (d[keyY] ?? 0), 0) / recent.length);

  const highlights = [
    { icon: "🏆", label: "Peak",           text: `${fmtLabel(peak[keyX])} — ${peak[keyY]}` },
    { icon: "📉", label: "Lowest",         text: `${fmtLabel(lowest[keyX])} — ${lowest[keyY]}` },
    { icon: "📊", label: "Period avg",     text: `${avg} / period` },
    { icon: "📈", label: "Recent 3 avg",   text: `${recentAvg} / period` },
  ];

  return (
    <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
      <VBars data={data} keyX={keyX} keyY={keyY} color={color} height={height} />
      <div style={{
        borderLeft: "1px solid #f0f0f0", paddingLeft: "28px",
        display: "flex", flexDirection: "column", gap: "14px", paddingTop: "8px",
      }}>
        {highlights.map(({ icon, label, text }) => (
          <div key={label} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "18px", lineHeight: 1.3 }}>{icon}</span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "#bbb", marginBottom: "2px" }}>
                {label}
              </div>
              <div style={{ fontSize: "13px", color: "#333", fontWeight: 500 }}>{text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
