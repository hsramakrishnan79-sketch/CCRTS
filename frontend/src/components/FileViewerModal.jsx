import { useEffect, useState } from "react";

const BASE_URL = "http://127.0.0.1:3001";

export default function FileViewerModal({ file, onClose }) {
  const url = `${BASE_URL}/uploads/${file.file_path}`;
  const ext = file.file_name.split(".").pop().toLowerCase();

  const isImage = ["jpg", "jpeg", "png"].includes(ext);
  const isPdf   = ext === "pdf";
  const isText  = ext === "txt";

  const [textContent, setTextContent] = useState(null);

  useEffect(() => {
    if (isText) {
      fetch(url)
        .then((r) => r.text())
        .then(setTextContent)
        .catch(() => setTextContent("Failed to load file content."));
    }
  }, [url, isText]);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.82)",
        zIndex: 2000,
        display: "flex", flexDirection: "column",
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      tabIndex={-1}
    >
      {/* Header */}
      <div style={{
        background: "#1e3c72", color: "white",
        padding: "14px 20px", flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontWeight: 600, fontSize: "14px" }}>📎 {file.file_name}</span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "white", fontSize: "24px", cursor: "pointer", lineHeight: 1, padding: "0 4px" }}
        >
          ×
        </button>
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>

        {isImage && (
          <img
            src={url}
            alt={file.file_name}
            onContextMenu={(e) => e.preventDefault()}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "6px", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
          />
        )}

        {isPdf && (
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
            title={file.file_name}
            style={{ width: "100%", height: "100%", border: "none", borderRadius: "6px" }}
          />
        )}

        {isText && (
          <pre style={{
            background: "white", padding: "28px", borderRadius: "8px",
            maxWidth: "860px", width: "100%", maxHeight: "100%",
            overflow: "auto", fontSize: "13px", lineHeight: 1.7,
            color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}>
            {textContent ?? "Loading..."}
          </pre>
        )}

        {!isImage && !isPdf && !isText && (
          <div style={{
            background: "white", borderRadius: "12px",
            padding: "48px 60px", textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontSize: "52px", marginBottom: "14px" }}>📄</div>
            <p style={{ color: "#555", fontSize: "14px" }}>
              Preview not available for <strong>.{ext}</strong> files.
            </p>
            <p className="text-muted text-xs" style={{ marginTop: "8px" }}>
              Use the full detail page to manage this attachment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
