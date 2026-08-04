import { useState } from "react";
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
} from "lucide-react";
import { type FileAttachment } from "./file-node-extension";
import {
  canPreview,
  downloadFile,
  formatFileSize,
  getPreviewType,
  PREVIEW_SIZE_LIMIT,
} from "./utils";
import { FilePreview } from "./file-preview";

function FileIcon({
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
}: {
  attachment: FileAttachment;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
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
            onClick={(e) => {
              e.stopPropagation();
              downloadFile(attachment.url, attachment.name);
            }}
          >
            <Download size={13} />
          </Button>
          <Button
            variant="ghost"
            className="file-node__action-btn file-node__action-btn--danger"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 size={13} />
          </Button>
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
          <FilePreview attachment={attachment} />
        </div>
      )}
    </div>
  );
}
