import { useEffect, useState } from "react";
import { marked } from "marked";
import type { FileAttachment } from "./file-node-extension";
import { getPreviewType } from "./utils";
import { PdfPreview } from "./pdf-preview";

export function FilePreview({ attachment }: { attachment: FileAttachment }) {
  const type = getPreviewType(attachment.mimeType, attachment.name);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(type !== "pdf");

  useEffect(() => {
    if (type === "pdf") return;

    fetch(attachment.url)
      .then((r) => r.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [attachment.url, type]);

  if (type === "pdf") {
    return <PdfPreview url={attachment.url} />;
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "12px 0",
          fontSize: 13,
          color: "var(--tt-theme-muted)",
        }}
      >
        Loading preview…
      </div>
    );
  }

  if (!content) return null;

  if (type === "markdown") {
    return (
      <div
        className="file-node__preview-markdown"
        dangerouslySetInnerHTML={{ __html: marked(content) as string }}
        style={{ fontSize: 14, lineHeight: 1.7, color: "var(--tt-text-color)" }}
      />
    );
  }

  const ext = attachment.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    <pre
      style={{
        margin: 0,
        padding: "12px 14px",
        fontSize: 12,
        fontFamily: "var(--tt-font-mono, monospace)",
        background: "var(--tt-card-bg-color)",
        borderRadius: 4,
        overflowX: "auto",
        color: "var(--tt-text-color)",
        maxHeight: 400,
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      <code className={type === "code" ? `language-${ext}` : undefined}>
        {content}
      </code>
    </pre>
  );
}
