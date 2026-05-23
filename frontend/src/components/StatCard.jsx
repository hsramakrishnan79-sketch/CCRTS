export default function StatCard({ label, value, icon, gradient, light, onClick, sub }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "16px", padding: "24px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        textAlign: "center", background: gradient, color: light ? "#333" : "white",
        cursor: onClick ? "pointer" : "default", transition: "transform 0.15s",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
    >
      {icon}
      <h3 style={{ margin: "10px 0 4px", fontSize: "13px" }}>{label}</h3>
      <h1 style={{ margin: 0, fontSize: "34px" }}>{value ?? "—"}</h1>
      {sub && <p style={{ margin: "4px 0 0", fontSize: "11px", opacity: 0.8 }}>{sub}</p>}
    </div>
  );
}
