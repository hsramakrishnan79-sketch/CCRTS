export default function EmptyState({ icon, message, hint, success = false }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "36px 24px", gap: "10px",
    }}>
      <div style={{ fontSize: "36px", opacity: 0.25, lineHeight: 1 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: success ? "#28a745" : "#aaa" }}>
        {message}
      </p>
      {hint && (
        <p style={{ margin: 0, fontSize: "12px", color: "#bbb", textAlign: "center" }}>{hint}</p>
      )}
    </div>
  );
}
