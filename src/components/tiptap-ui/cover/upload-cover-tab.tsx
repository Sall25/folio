import { useRef, useState, useEffect } from "react";

// Largest edge we keep on upload. Notion stores the full image and crops at
// display time, so we only shrink oversized files to keep uploads lean.
const MAX_DIMENSION = 2000;

async function processImageForCover(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Preserve the full image and its aspect ratio — no crop, no padding.
      // The banner does the "fit" via object-fit: cover, exactly like Notion.
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: "image/jpeg",
            }),
          );
        },
        "image/jpeg",
        0.9,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };

    img.src = objectUrl;
  });
}

interface UploadCoverTabProps {
  onSelect: (url: string) => void;
}

export function UploadCoverTab({ onSelect }: UploadCoverTabProps) {
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
      // Downscale oversized images before uploading (aspect ratio preserved)
      const processedFile = await processImageForCover(file);

      // Update preview to show the processed result
      setPreview(URL.createObjectURL(processedFile));

      const formData = new FormData();
      formData.append("file", processedFile);

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
        padding: "4px 0",
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
          // Cover previews are wider/landscape oriented
          minHeight: preview ? 0 : 110,
          transition: "border-color 0.15s",
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
              PNG, JPG, WEBP — recommended 1500×500px
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
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
              marginTop: 8,
              maxHeight: 200,
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
                  aspectRatio: "3 / 1",
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
                    objectFit: "cover",
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