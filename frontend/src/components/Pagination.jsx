export default function Pagination({ total, page, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  // Build page number range: always show first, last, current ±1, with ellipsis
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const btn = (label, target, disabled = false) => (
    <button
      key={label}
      onClick={() => !disabled && typeof target === "number" && onPageChange(target)}
      disabled={disabled || typeof target !== "number"}
      style={{
        padding: "5px 11px", borderRadius: "6px", border: "1px solid #dee2e6",
        background: target === page ? "#1e3c72" : "white",
        color: target === page ? "white" : disabled ? "#aaa" : "#333",
        fontWeight: target === page ? 700 : 400,
        fontSize: "13px", cursor: disabled || typeof target !== "number" ? "default" : "pointer",
        minWidth: "34px",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", flexWrap: "wrap", gap: "8px" }}>
      <span style={{ fontSize: "13px", color: "#888" }}>
        Showing {start}–{end} of {total}
      </span>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {btn("‹ Prev", page - 1, page === 1)}
        {pages.map((p, i) => btn(p, p, false))}
        {btn("Next ›", page + 1, page === totalPages)}
      </div>
    </div>
  );
}
