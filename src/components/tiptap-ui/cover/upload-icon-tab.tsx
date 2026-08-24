import { useRef, useState, useEffect } from "react";

interface UploadIconTabProps {
  onSelect: (url: string) => void;
}

export function UploadIconTab({ onSelect }: UploadIconTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string[]>([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/uploads")
      .then((r) => r.json())
      .then((files) => setPrevious(files.map((f: { url: string }) => f.url)))
      .catch(() => {});
  }, []);

  const processFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("File must be an image.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { url } = await response.json();
      setPrevious((prev) => [url, ...prev]);
      onSelect(url);
    } catch {
      setError("Upload failed. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "4px 0px",
      }}
    >
      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: "1.5px dashed var(--tt-border-color)",
          borderRadius: "var(--tt-radius-lg)",
          background: "var(--tt-card-bg-color)",
          padding: preview ? 0 : "20px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: uploading ? "wait" : "pointer",
          overflow: "hidden",
          minHeight: preview ? 0 : 90,
          transition: "border-color 0.15s",
          margin: 4,
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            style={{
              width: "100%",
              height: 80,
              objectFit: "contain",
              display: "block",
              padding: 8,
            }}
          />
        ) : (
          <>
            <svg
              width="22"
              height="22"
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
              {uploading ? "Uploading…" : "Click or drag image here"}
            </span>
            <span style={{ fontSize: 11, color: "var(--tt-theme-muted)" }}>
              PNG, JPG, SVG, WEBP
            </span>
          </>
        )}
      </div>

      {preview && !uploading && (
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

      {/* Previously uploaded */}
      {previous.length > 0 && (
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--tt-theme-muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Previously uploaded
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 6,
              marginTop: 8,
              maxHeight: 160,
              overflowY: "auto",
            }}
          >
            {previous.map((url) => (
              <button
                key={url}
                onClick={() => onSelect(url)}
                style={{
                  padding: 0,
                  border: "2px solid transparent",
                  borderRadius: 6,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "var(--tt-card-bg-color)",
                  transition: "border-color 0.15s",
                  aspectRatio: "1",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor =
                    "var(--tt-brand-color-500)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "transparent")
                }
              >
                <img
                  src={url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
