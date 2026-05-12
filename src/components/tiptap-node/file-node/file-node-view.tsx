// file-node-view.tsx
import { useRef } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Download, Paperclip, Trash2, X } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { type UploadOptions } from "src/components/tiptap-node/image-upload-node/image-upload-node";
import { useFileUpload } from "../image-upload-node/use-file-upload";
import type { FileAttachment } from "./file-node-extension";
import { isValidPosition } from "src/lib/tiptap-utils";
import "./file-node-view.scss";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "🗜";
  return "📎";
}

export function FileNodeView(props: NodeViewProps) {
  const { node, editor, getPos, extension } = props;
  const { accept, maxSize, limit } = node.attrs;
  const files: FileAttachment[] = node.attrs.files ?? [];
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadOptions: UploadOptions = {
    accept,
    maxSize,
    limit,
    upload: extension.options.upload,
    onError: extension.options.onError,
    onSuccess: extension.options.onSuccess,
  };

  const { fileItems, uploadFiles, removeFileItem } =
    useFileUpload(uploadOptions);

  async function handleUpload(selectedFiles: File[]) {
    const urls = await uploadFiles(selectedFiles);
    if (!urls.length) return;

    const pos = getPos();
    if (!isValidPosition(pos)) return;

    const newAttachments: FileAttachment[] = urls.map((url, i) => ({
      id: crypto.randomUUID(),
      name: selectedFiles[i].name,
      url,
      size: selectedFiles[i].size,
      mimeType: selectedFiles[i].type,
    }));

    editor.commands.command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        files: [...files, ...newAttachments],
      });
      return true;
    });
  }

  function handleRemoveAttachment(id: string) {
    const pos = getPos();
    if (!isValidPosition(pos)) return;

    editor.commands.command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        files: files.filter((f) => f.id !== id),
      });
      return true;
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected?.length) return;
    handleUpload(Array.from(selected));
    e.target.value = "";
  }

  const isUploading = fileItems.some((f) => f.status === "uploading");

  return (
    <NodeViewWrapper as="div" className="file-node" data-type="file">
      {/* Existing attachments */}
      {files.length > 0 && (
        <div className="file-node__list">
          {files.map((attachment) => (
            <div key={attachment.id} className="file-node__item">
              <span className="file-node__icon">
                {fileIcon(attachment.mimeType)}
              </span>
              <div className="file-node__info">
                <a
                  href={attachment.url}
                  download={attachment.name}
                  className="file-node__name"
                  target="_blank"
                  rel="noopener noreferrer"
                  contentEditable={false}
                >
                  {attachment.name}
                </a>
                <span className="file-node__size">
                  {formatFileSize(attachment.size)}
                </span>
              </div>
              <div className="file-node__actions" contentEditable={false}>
                <a href={attachment.url} download={attachment.name}>
                  <Button variant="ghost" className="file-node__action-btn">
                    <Download size={13} />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  className="file-node__action-btn file-node__action-btn--danger"
                  onClick={() => handleRemoveAttachment(attachment.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploading items */}
      {fileItems.map((item) => (
        <div
          key={item.id}
          className="file-node__item file-node__item--uploading"
        >
          <div
            className="file-node__progress"
            style={{ width: `${item.progress}%` }}
          />
          <span className="file-node__icon">📎</span>
          <div className="file-node__info">
            <span className="file-node__name">{item.file.name}</span>
            <span className="file-node__size">
              {item.status === "uploading"
                ? `${item.progress}%`
                : formatFileSize(item.file.size)}
            </span>
          </div>
          <Button
            variant="ghost"
            className="file-node__action-btn"
            onClick={() => removeFileItem(item.id)}
          >
            <X size={13} />
          </Button>
        </div>
      ))}

      {/* Upload button */}
      <button
        className="file-node__upload-btn"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        contentEditable={false}
      >
        <Paperclip size={13} />
        <span>Add a file</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={limit > 1}
        onChange={handleChange}
        style={{ display: "none" }}
        onClick={(e) => e.stopPropagation()}
      />
    </NodeViewWrapper>
  );
}
