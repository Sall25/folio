import { useRef } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Paperclip, Trash2, Download } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { useFileUpload } from "../../image-upload-node/use-file-upload";
import type { FileAttachment } from "../../file-node";
import { handleImageUpload, MAX_FILE_SIZE } from "src/lib/tiptap-utils";
import "./file-cell-node-view.scss";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileCellNodeView({
  node,
  updateAttributes,
  getPos,
  editor,
}: NodeViewProps) {
  const files: FileAttachment[] = node.attrs.files ?? [];
  const inputRef = useRef<HTMLInputElement>(null);

  const { fileItems, uploadFiles, removeFileItem } = useFileUpload({
    accept: "*/*",
    maxSize: MAX_FILE_SIZE,
    limit: 10,
    upload: handleImageUpload,
  });

  async function handleUpload(selectedFiles: File[]) {
    const urls = await uploadFiles(selectedFiles);
    if (!urls.length) return;

    const newAttachments: FileAttachment[] = urls.map((url, i) => ({
      id: crypto.randomUUID(),
      name: selectedFiles[i].name,
      url,
      size: selectedFiles[i].size,
      mimeType: selectedFiles[i].type,
    }));

    updateAttributes({ files: [...files, ...newAttachments] });
  }

  function handleRemove(id: string) {
    updateAttributes({ files: files.filter((f) => f.id !== id) });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected?.length) return;
    handleUpload(Array.from(selected));
    e.target.value = "";
  }

  const isUploading = fileItems.some((f) => f.status === "uploading");

  useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);
  if (isHidden)
    return <NodeViewWrapper as={"div"} style={{ display: "none" }} />;

  return (
    <NodeViewWrapper
      as="div"
      className="db-td db-td--file"
      data-type="file-cell"
    >
      <Popover>
        <PopoverTrigger asChild>
          <div className="db-cell-files" contentEditable={false}>
            {files.length > 0 ? (
              files.map((f) => (
                <span key={f.id} className="db-cell-file-chip">
                  <Paperclip size={10} />
                  <span>{f.name}</span>
                </span>
              ))
            ) : (
              <span className="db-cell-files__empty" />
            )}
            {isUploading && (
              <span className="db-cell-file-chip db-cell-file-chip--uploading">
                <Paperclip size={10} />
                <span>Uploading...</span>
              </span>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="start"
          className="file-cell-popover"
        >
          <div className="file-cell-popover__list">
            {files.map((f) => (
              <div key={f.id} className="file-cell-popover__item">
                <Paperclip size={12} className="file-cell-popover__icon" />
                <div className="file-cell-popover__info">
                  <a
                    href={f.url}
                    download={f.name}
                    className="file-cell-popover__name"
                    target="_blank"
                    rel="noopener noreferrer"
                    contentEditable={false}
                  >
                    {f.name}
                  </a>
                  <span className="file-cell-popover__size">
                    {formatFileSize(f.size)}
                  </span>
                </div>
                <div className="file-cell-popover__actions">
                  <a href={f.url} download={f.name} contentEditable={false}>
                    <Button variant="ghost">
                      <Download size={12} />
                    </Button>
                  </a>
                  <Button variant="ghost" onClick={() => handleRemove(f.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}

            {fileItems.map((item) => (
              <div
                key={item.id}
                className="file-cell-popover__item file-cell-popover__item--uploading"
              >
                <div
                  className="file-cell-popover__progress"
                  style={{ width: `${item.progress}%` }}
                />
                <Paperclip size={12} className="file-cell-popover__icon" />
                <div className="file-cell-popover__info">
                  <span className="file-cell-popover__name">
                    {item.file.name}
                  </span>
                  <span className="file-cell-popover__size">
                    {item.progress}%
                  </span>
                </div>
                <Button variant="ghost" onClick={() => removeFileItem(item.id)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            ))}

            {files.length === 0 && fileItems.length === 0 && (
              <span className="file-cell-popover__empty">
                No files attached
              </span>
            )}
          </div>

          <button
            className="file-cell-popover__upload-btn"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip size={12} />
            <span>Upload a file</span>
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleChange}
            style={{ display: "none" }}
            onClick={(e) => e.stopPropagation()}
          />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
