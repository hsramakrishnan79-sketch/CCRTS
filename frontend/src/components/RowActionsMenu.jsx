import { useEffect, useRef, useState } from "react";

export default function RowActionsMenu({ actions }) {
  const [pos, setPos] = useState(null);
  const menuRef       = useRef(null);

  useEffect(() => {
    if (!pos) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pos]);

  const handleToggle = (e) => {
    if (pos) { setPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  return (
    <>
      <button onClick={handleToggle} className="btn btn-ghost btn-xs" style={{ fontSize: "16px" }} title="Actions">
        ⋮
      </button>
      {pos && (
        <div
          ref={menuRef}
          style={{
            position: "fixed", top: pos.top, right: pos.right, zIndex: 500,
            background: "white", borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            minWidth: "130px", overflow: "hidden",
          }}
        >
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => { setPos(null); a.onClick(); }}
              style={{
                display: "block", width: "100%", padding: "10px 16px",
                background: "none", border: "none", textAlign: "left",
                cursor: "pointer", fontSize: "13px", color: a.color ?? "#555", fontWeight: 600,
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
