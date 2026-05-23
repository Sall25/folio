// file-node-view.tsx
import { useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Paperclip, X } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { type UploadOptions } from "src/components/tiptap-node/image-upload-node/image-upload-node";
import { useFileUpload } from "../image-upload-node/use-file-upload";
import type { FileAttachment } from "./file-node-extension";
import { isValidPosition } from "src/lib/tiptap-utils";
import "./file-node-view.scss";
import { FileItem } from "./file-item";
import { formatFileSize } from "./utils";

function FileUploadEmptyState({
  onFiles,
  inputRef,
  accept,
  maxSize,
  isUploading,
}: {
  onFiles: (files: File[]) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  maxSize: number;
  isUploading: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div
      onClick={() => !isUploading && inputRef.current?.click()}
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
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: isUploading ? "wait" : "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <Paperclip size={22} style={{ color: "var(--tt-theme-muted)" }} />
      <span
        style={{ fontSize: 13, color: "var(--tt-text-color)", fontWeight: 500 }}
      >
        {isUploading
          ? "Uploading…"
          : dragging
            ? "Drop to attach"
            : "Click or drag files here"}
      </span>
      <span style={{ fontSize: 11, color: "var(--tt-theme-muted)" }}>
        Max {formatFileSize(maxSize)} ·{" "}
        {accept === "*/*" ? "Any file type" : accept}
      </span>
    </div>
  );
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

  const { fileItems, uploadFiles, removeFileItem, clearAllFiles } =
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

    clearAllFiles();
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
  const isEmpty = files.length === 0 && fileItems.length === 0;

  return (
    <NodeViewWrapper as="div" className="file-node" data-type="file">
      {isEmpty ? (
        <FileUploadEmptyState
          onFiles={handleUpload}
          inputRef={inputRef}
          accept={accept}
          maxSize={maxSize}
          isUploading={isUploading}
        />
      ) : (
        <>
          {/* Existing attachments */}
          {files.length > 0 && (
            <div className="file-node__list">
              {files.map((attachment) => (
                <FileItem
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={() => handleRemoveAttachment(attachment.id)}
                />
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
              <Paperclip size={13} className="file-node__icon" />
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

          {/* Add more button */}
          <button
            className="file-node__upload-btn"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            contentEditable={false}
          >
            <Paperclip size={13} />
            <span>Add a file</span>
          </button>
        </>
      )}

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
