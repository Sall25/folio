import { useState } from "react";

interface UrlTabProps {
  onSelect: (url: string) => void;
}

export function UrlTab({ onSelect }: UrlTabProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const handleApply = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    // Validate by loading the image
    const img = new Image();
    img.onload = () => {
      setStatus("ok");
      onSelect(trimmed);
    };
    img.onerror = () => setStatus("error");
    img.src = trimmed;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleApply();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--tt-theme-muted)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Image URL
      </span>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          autoFocus
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setStatus("idle");
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com/image.jpg"
          style={{
            flex: 1,
            padding: "6px 10px",
            border: `1px solid ${status === "error" ? "var(--tt-danger-color, #ef4444)" : "var(--tt-border-color)"}`,
            borderRadius: "var(--tt-radius-lg)",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            background: "var(--tt-card-bg-color)",
            color: "var(--tt-text-color)",
            minHeight: 35,
          }}
        />
        <button
          onClick={handleApply}
          disabled={!input.trim()}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            fontSize: 13,
            cursor: input.trim() ? "pointer" : "not-allowed",
            border: "none",
            background: "var(--tt-brand-color-500)",
            color: "#fff",
            opacity: input.trim() ? 1 : 0.5,
            transition: "opacity 0.15s",
          }}
        >
          Apply
        </button>
      </div>

      {status === "error" && (
        <p
          style={{
            fontSize: 12,
            color: "var(--tt-danger-color, #ef4444)",
            margin: 0,
          }}
        >
          Could not load image. Check the URL and try again.
        </p>
      )}

      {status === "ok" && input && (
        <img
          src={input}
          alt="preview"
          style={{
            width: "100%",
            height: 80,
            objectFit: "cover",
            borderRadius: 8,
          }}
        />
      )}
    </div>
  );
}
