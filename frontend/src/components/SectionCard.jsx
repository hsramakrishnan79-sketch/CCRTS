export default function SectionCard({ title, children }) {
  return (
    <div className="card mb-24">
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        borderBottom: "1px solid #f0f0f0", paddingBottom: "12px", marginBottom: "20px",
      }}>
        <div style={{ width: "3px", height: "20px", background: "#1e3c72", borderRadius: "2px", flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e3c72" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
