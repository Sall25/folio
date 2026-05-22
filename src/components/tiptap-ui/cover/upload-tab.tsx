import { useState } from "react";

// Updated UploadTab signature — move file input ownership to the node view
interface UploadTabProps {
  onSelect: (url: string) => void; // for createObjectURL preview path
  onFiles: (files: File[]) => void; // for real upload path
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function UploadTab({ /*onSelect,*/ onFiles, inputRef }: UploadTabProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("File must be an image.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFiles([file]); // triggers real upload in node view
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
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
        Upload image
      </span>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${dragging ? "var(--tt-brand-color-500)" : "var(--tt-border-color)"}`,
          borderRadius: "var(--tt-radius-lg)",
          background: dragging
            ? "var(--tt-brand-color-50, rgba(99,102,241,0.05))"
            : "var(--tt-card-bg-color)",
          padding: preview ? 0 : "28px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s",
          overflow: "hidden",
          minHeight: preview ? 0 : 110,
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            style={{
              width: "100%",
              height: 120,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--tt-theme-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span
              style={{
                fontSize: 13,
                color: "var(--tt-text-color)",
                fontWeight: 500,
              }}
            >
              {dragging ? "Drop to upload" : "Click or drag image here"}
            </span>
            <span style={{ fontSize: 11, color: "var(--tt-theme-muted)" }}>
              PNG, JPG, GIF, WEBP
            </span>
          </>
        )}
      </div>

      {preview && (
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
            border: "1px solid var(--tt-border-color)",
            background: "var(--tt-card-bg-color)",
            color: "var(--tt-text-color)",
            alignSelf: "flex-start",
          }}
        >
          Replace
        </button>
      )}

      {error && (
        <p
          style={{
            fontSize: 12,
            color: "var(--tt-danger-color, #ef4444)",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
