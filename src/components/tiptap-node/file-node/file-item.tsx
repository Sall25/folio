import { useEffect, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Download,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image,
  Paperclip,
  Trash2,
} from "src/components/icons";
import { type FileAttachment } from "./file-node-extension";
import {
  canPreview,
  downloadFile,
  formatFileSize,
  getPreviewType,
  PREVIEW_SIZE_LIMIT,
} from "./utils";
import { FilePreview } from "./file-preview";
import { MediaSaveButton } from "src/components/tiptap-ui/media-save-button";
import {
  autoSaveMedia,
  openSavedMedia,
  useMediaSaveState,
  useMediaSrc,
} from "src/lib/media-cache";

export function FileIcon({
  mimeType,
  className,
}: {
  mimeType: string;
  className?: string;
}) {
  if (mimeType.startsWith("image/")) return <Image className={className} />;
  if (mimeType === "application/pdf") return <File className={className} />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className={className} />;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <FileText className={className} />;
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return <FileArchive className={className} />;
  return <Paperclip className={className} />;
}

export function FileItem({
  attachment,
  onRemove,
  editable = true,
}: {
  attachment: FileAttachment;
  onRemove: () => void;
  /** Read-only pages can download a file but not remove it. */
  editable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // Saved on this computer (desktop app): previewed and downloaded from the
  // file, and its name opens it in the computer's own app.
  const fileUrl = useMediaSrc(attachment.url);
  const isSaved = useMediaSaveState(attachment.url).kind === "saved";
  useEffect(() => autoSaveMedia(attachment.url, "other"), [attachment.url]);
  const previewable = canPreview(attachment);
  const type = getPreviewType(attachment.mimeType, attachment.name);

  return (
    <div className="file-node__item-wrap" contentEditable={false}>
      <div className="file-node__item">
        <span
          style={{
            width: 16,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            cursor: previewable ? "pointer" : "default",
            //opacity: previewable ? 1 : 0.3,
            color: "var(--tt-text-color)",
            transition: "transform 0.18s ease",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (previewable) setExpanded((v) => !v);
          }}
          title={
            previewable
              ? expanded
                ? "Collapse preview"
                : "Expand preview"
              : attachment.size > PREVIEW_SIZE_LIMIT
                ? "File too large to preview"
                : "No preview available"
          }
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            style={{ display: "block" }}
          >
            <polygon
              points={expanded ? "0,0 8,0 4,8" : "0,0 8,4 0,8"}
              fill="currentColor"
            />
          </svg>
        </span>

        <FileIcon mimeType={attachment.mimeType} className="file-node__icon" />

        <div className="file-node__info">
          <a
            href={attachment.url}
            onClick={(e) => {
              if (!isSaved) return;
              e.preventDefault();
              void openSavedMedia(attachment.url);
            }}
            download={attachment.name}
            className="file-node__name"
            target="_blank"
            rel="noopener noreferrer"
          >
            {attachment.name}
          </a>
          <span className="file-node__size">
            {formatFileSize(attachment.size)}
            {type && (
              <span
                style={{
                  marginLeft: 6,
                  opacity: 0.6,
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                {type}
              </span>
            )}
            {attachment.size > PREVIEW_SIZE_LIMIT && (
              <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 10 }}>
                — too large to preview
              </span>
            )}
          </span>
        </div>

        <div className="file-node__actions">
          <Button
            variant="ghost"
            className="file-node__action-btn"
            tooltip="Download"
            showTooltip
            aria-label={`Download ${attachment.name}`}
            onClick={(e) => {
              e.stopPropagation();
              void downloadFile(fileUrl, attachment.name);
            }}
          >
            <Download size={13} />
          </Button>
          <MediaSaveButton
            url={attachment.url}
            className="file-node__action-btn"
          />
          {editable && (
            <Button
              variant="ghost"
              className="file-node__action-btn file-node__action-btn--danger"
              tooltip="Remove"
              showTooltip
              aria-label={`Remove ${attachment.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 size={13} />
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div
          className="file-node__preview"
          style={{
            borderTop: "0.5px solid var(--tt-border-color)",
            padding: "10px 0 4px 28px",
          }}
        >
          <FilePreview attachment={{ ...attachment, url: fileUrl }} />
        </div>
      )}
    </div>
  );
}
