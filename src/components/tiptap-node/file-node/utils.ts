import type { FileAttachment } from "./file-node-extension";

export const PREVIEW_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

export type PreviewType = "pdf" | "code" | "markdown" | "text" | null;

export function getPreviewType(mimeType: string, name: string): PreviewType {
  const ext = name.split(".").pop()?.toLowerCase();

  // Check extension first — more reliable than mimeType
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext ?? ""))
    return null;
  if (ext === "pdf") return "pdf";
  if (
    [
      "js",
      "ts",
      "tsx",
      "jsx",
      "json",
      "css",
      "html",
      "xml",
      "yaml",
      "yml",
    ].includes(ext ?? "")
  )
    return "code";
  if (ext === "md") return "markdown";
  if (ext === "txt") return "text";

  // Fall back to mimeType
  if (mimeType.startsWith("image/")) return null;
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/")) return "text";

  return null;
}

export function canPreview(attachment: FileAttachment): boolean {
  return (
    attachment.size <= PREVIEW_SIZE_LIMIT &&
    getPreviewType(attachment.mimeType, attachment.name) !== null
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function downloadFile(url: string, name: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = name;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
