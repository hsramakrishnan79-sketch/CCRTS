import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const POLL_INTERVAL = 30_000; // 30 seconds

export default function NotificationBell() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [dropBottom, setDropBottom] = useState(0);
  const panelRef  = useRef(null);
  const buttonRef = useRef(null);

  // ── Fetch unread count (lightweight, runs on interval) ───────────────────
  const fetchCount = async () => {
    try {
      const res = await API.get("/notifications/count");
      setCount(res.data.count);
    } catch (_) { /* silent */ }
  };

  // ── Fetch full list (only when panel opens) ──────────────────────────────
  const fetchList = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
    } catch (_) { /* silent */ }
  };

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (!open) {
      fetchList();
      const rect = buttonRef.current.getBoundingClientRect();
      setDropBottom(window.innerHeight - rect.top + 6);
    }
    setOpen((v) => !v);
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (_) { /* silent */ }
  };

  const handleClick = async (n) => {
    if (!n.is_read) {
      try {
        await API.put(`/notifications/${n.id}/read`);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x))
        );
        setCount((c) => Math.max(0, c - 1));
      } catch (_) { /* silent */ }
    }
    setOpen(false);
    if (n.complaint_id) navigate(`/complaint/${n.complaint_id}`);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div ref={panelRef} style={{ position: "relative", marginBottom: "6px" }}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title="Notifications"
        style={{
          width: "100%", padding: "11px 14px", border: "none", borderRadius: "8px",
          background: open ? "rgba(255,255,255,0.18)" : "transparent",
          color: "white", display: "flex", alignItems: "center", gap: "10px",
          cursor: "pointer", fontSize: "14px", position: "relative",
        }}
      >
        <span style={{ fontSize: "16px" }}>🔔</span>
        Notifications
        {count > 0 && (
          <span style={{
            marginLeft: "auto", background: "#dc3545", color: "white",
            borderRadius: "10px", padding: "1px 7px", fontSize: "11px", fontWeight: 700,
          }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel — positioned to the right of the sidebar */}
      {open && (
        <div style={{
          position: "fixed", left: "214px", bottom: dropBottom,
          width: "340px", maxHeight: "460px",
          background: "white", borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          overflow: "hidden", zIndex: 1000,
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid #f0f0f0",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <strong style={{ color: "#1e3c72", fontSize: "14px" }}>
              Notifications {count > 0 && <span style={{ color: "#dc3545" }}>({count} unread)</span>}
            </strong>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ background: "none", border: "none", color: "#1e3c72", fontSize: "12px", cursor: "pointer" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }} onWheel={(e) => e.stopPropagation()}>
            {notifications.length === 0 ? (
              <p style={{ padding: "30px", textAlign: "center", color: "#aaa", fontSize: "14px" }}>
                No notifications yet
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding: "12px 16px", borderBottom: "1px solid #f8f8f8",
                    cursor: n.complaint_id ? "pointer" : "default",
                    background: n.is_read ? "white" : "#f0f4ff",
                    display: "flex", gap: "10px", alignItems: "flex-start",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f7fa"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = n.is_read ? "white" : "#f0f4ff"; }}
                >
                  <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "2px" }}>
                    {n.is_read ? "🔔" : "🔴"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#333", lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#aaa" }}>
                      {timeAgo(n.created_at)}
                      {n.complaint_id && (
                        <span style={{ marginLeft: "6px", color: "#1e3c72" }}>→ {n.complaint_id}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
