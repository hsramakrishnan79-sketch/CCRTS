import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

const BG = { success: "#28a745", error: "#dc3545", info: "#1e3c72" };

function Toast({ message, type, onClose }) {
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
      background: BG[type] ?? BG.error, color: "white",
      padding: "14px 20px", borderRadius: "10px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      fontSize: "14px", maxWidth: "400px",
      display: "flex", alignItems: "center", gap: "14px",
      animation: "slideIn 0.2s ease",
    }}>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: 0, opacity: 0.8 }}
      >
        ×
      </button>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
