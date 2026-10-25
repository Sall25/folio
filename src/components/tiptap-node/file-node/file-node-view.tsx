import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { AlertCircle, ArrowDown, Paperclip, X } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { isValidPosition } from "src/lib/tiptap-utils";
import type { FileAttachment, FileNodeOptions } from "./file-node-extension";
import { FileIcon, FileItem } from "./file-item";
import { formatFileSize } from "./utils";
import "./file-node-view.scss";
// The empty file block uses the image block's card, so both look the same.
import "src/components/tiptap-node/image-upload-node/image-upload-card.scss";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  controller: AbortController;
}

interface UploadError {
  title: string;
  body: string;
  /** The files to try again, when the upload itself failed. */
  retry?: File[];
}

// Uploads for one file block: progress per file, cancel, and an error to
// show. Resolves with the files that made it.
function useFileBlockUpload(
  options: FileNodeOptions,
  limit: number,
  maxSize: number,
) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState<UploadError | null>(null);

  // Stop any upload still running when the block goes away.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () => itemsRef.current.forEach((it) => it.controller.abort()),
    [],
  );

  const uploadAll = useCallback(
    async (files: File[], room: number): Promise<FileAttachment[]> => {
      setError(null);
      if (room <= 0) {
        setError({
          title: "This block is full",
          body: `A file block holds up to ${limit} files. Add another file block for more.`,
        });
        return [];
      }
      const picked = files.slice(0, room);

      const tooBig = picked.find((f) => maxSize > 0 && f.size > maxSize);
      if (tooBig) {
        setError({
          title: `${tooBig.name} is ${formatFileSize(tooBig.size)}`,
          body: `Files can be up to ${formatFileSize(maxSize)}. Compress it, or share a link to it instead.`,
        });
        return [];
      }

      const batch: UploadItem[] = picked.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        controller: new AbortController(),
      }));
      setItems((prev) => [...prev, ...batch]);

      const failed: File[] = [];
      let lastError: Error | null = null;

      const results = await Promise.all(
        batch.map(async (item): Promise<FileAttachment | null> => {
          try {
            const url = await options.upload(
              item.file,
              ({ progress }) =>
                setItems((prev) =>
                  prev.map((it) =>
                    it.id === item.id ? { ...it, progress } : it,
                  ),
                ),
              item.controller.signal,
            );
            options.onSuccess?.(url);
            return {
              id: crypto.randomUUID(),
              name: item.file.name,
              url,
              size: item.file.size,
              mimeType: item.file.type,
            };
          } catch (err) {
            if (item.controller.signal.aborted) return null;
            lastError = err instanceof Error ? err : new Error(String(err));
            options.onError?.(lastError);
            failed.push(item.file);
            return null;
          } finally {
            setItems((prev) => prev.filter((it) => it.id !== item.id));
          }
        }),
      );

      if (failed.length > 0) {
        setError({
          title:
            failed.length === 1
              ? `${failed[0].name} couldn't be uploaded`
              : `${failed.length} files couldn't be uploaded`,
          body: `${(lastError as Error | null)?.message ?? "Upload failed"}. Check your connection and try again.`,
          retry: failed,
        });
      }

      return results.filter((r): r is FileAttachment => r !== null);
    },
    [options, limit, maxSize],
  );

  const cancel = (id: string) => {
    setItems((prev) => {
      prev.find((it) => it.id === id)?.controller.abort();
      return prev.filter((it) => it.id !== id);
    });
  };

  return { items, error, setError, uploadAll, cancel };
}

export function FileNodeView(props: NodeViewProps) {
  const { node, editor, getPos, extension } = props;
  const accept: string = node.attrs.accept ?? "*/*";
  const maxSize: number = node.attrs.maxSize ?? 0;
  const limit: number = node.attrs.limit ?? 10;
  const files: FileAttachment[] = node.attrs.files ?? [];
  const editable = editor.isEditable;

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragDepth, setDragDepth] = useState(0);

  const { items, error, setError, uploadAll, cancel } = useFileBlockUpload(
    extension.options as FileNodeOptions,
    limit,
    maxSize,
  );

  // Always read the node's current files when writing: uploads finish after
  // the render that started them, and other people may have added files.
  const writeFiles = useCallback(
    (update: (current: FileAttachment[]) => FileAttachment[]) => {
      const pos = getPos();
      if (!isValidPosition(pos)) return;
      editor.commands.command(({ tr }) => {
        const current = tr.doc.nodeAt(pos);
        if (!current || current.type.name !== "file") return false;
        tr.setNodeMarkup(pos, undefined, {
          ...current.attrs,
          files: update(current.attrs.files ?? []),
        });
        return true;
      });
    },
    [editor, getPos],
  );

  const addFiles = useCallback(
    async (selected: File[]) => {
      const room = limit - files.length - items.length;
      const added = await uploadAll(selected, room);
      if (added.length > 0) writeFiles((current) => [...current, ...added]);
    },
    [limit, files.length, items.length, uploadAll, writeFiles],
  );

  const removeFile = (id: string) =>
    writeFiles((current) => current.filter((f) => f.id !== id));

  const dropHandlers = editable
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragDepth((d) => d + 1);
        },
        onDragOver: (e: React.DragEvent) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        },
        onDragLeave: () => setDragDepth((d) => Math.max(0, d - 1)),
        onDrop: (e: React.DragEvent) => {
          const dropped = Array.from(e.dataTransfer.files);
          setDragDepth(0);
          if (dropped.length === 0) return;
          e.preventDefault();
          e.stopPropagation();
          void addFiles(dropped);
        },
      }
    : {};

  const dragging = dragDepth > 0;
  const isEmpty = files.length === 0;
  const acceptLabel = accept === "*/*" ? "Any file type" : accept;
  const limits = [
    acceptLabel,
    maxSize > 0 ? `up to ${formatFileSize(maxSize)} each` : null,
    limit > 1 ? `${limit} files max` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const errorPanel = error && (
    <div className="image-upload-card__error-wrap">
      <div className="image-upload-card__error" role="alert">
        <span className="image-upload-card__error-icon">
          <AlertCircle size={17} />
        </span>
        <div>
          <div className="image-upload-card__error-title">{error.title}</div>
          <div className="image-upload-card__error-body">{error.body}</div>
        </div>
      </div>
      <div className="image-upload-card__actions">
        {error.retry ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => void addFiles(error.retry!)}
          >
            <span className="tiptap-button-text">Try again</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={() => inputRef.current?.click()}
          >
            <span className="tiptap-button-text">Choose another file</span>
          </Button>
        )}
        <Button type="button" onClick={() => setError(null)}>
          <span className="tiptap-button-text">Dismiss</span>
        </Button>
      </div>
    </div>
  );

  const uploadRows = items.map((it) => {
    const loaded = Math.round((it.file.size * it.progress) / 100);
    return (
      <div key={it.id} className="image-upload-card__row">
        <span className="image-upload-card__thumb file-node__thumb">
          <FileIcon mimeType={it.file.type} className="file-node__thumb-icon" />
        </span>
        <div className="image-upload-card__row-main">
          <div className="image-upload-card__row-top">
            <span className="image-upload-card__row-name">{it.file.name}</span>
            <span className="image-upload-card__row-pct">{it.progress}%</span>
          </div>
          <div
            className="image-upload-card__bar"
            role="progressbar"
            aria-valuenow={it.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Uploading ${it.file.name}`}
          >
            <div style={{ width: `${it.progress}%` }} />
          </div>
          <span className="image-upload-card__row-meta">
            {formatFileSize(loaded)} of {formatFileSize(it.file.size)}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          aria-label="Cancel upload"
          tooltip="Cancel"
          showTooltip
          onClick={() => cancel(it.id)}
        >
          <X className="tiptap-button-icon" />
        </Button>
      </div>
    );
  });

  return (
    <NodeViewWrapper
      as="div"
      data-type="file"
      className={isEmpty ? "file-node file-node--empty" : "file-node"}
      contentEditable={false}
    >
      {isEmpty ? (
        // ── Empty block: the upload card ──────────────────────────────────
        <div
          className="image-upload-card file-node__card"
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="image-upload-card__body">
            {error ? (
              errorPanel
            ) : items.length > 0 ? (
              <div className="image-upload-card__uploads">
                {uploadRows}
                <p className="image-upload-card__hint">
                  Keep writing: the files show here when they're ready.
                </p>
              </div>
            ) : (
              <button
                type="button"
                className={`image-upload-card__drop${dragging ? " is-dragging" : ""}`}
                onClick={() => editable && inputRef.current?.click()}
                disabled={!editable}
                {...dropHandlers}
              >
                {dragging ? (
                  <>
                    <span className="image-upload-card__drop-icon is-solid">
                      <ArrowDown size={22} />
                    </span>
                    <span className="image-upload-card__drop-title">
                      Drop to attach
                    </span>
                  </>
                ) : (
                  <>
                    <span className="image-upload-card__drop-icon">
                      <Paperclip size={20} />
                    </span>
                    <span className="image-upload-card__drop-title">
                      Drop files here, or <u>browse</u>
                    </span>
                    <span className="image-upload-card__drop-meta">
                      {limits}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        // ── Block with files: the list, uploads, and "Add a file" ─────────
        <div
          className={`file-node__filled${dragging ? " is-dragging" : ""}`}
          {...dropHandlers}
        >
          <div className="file-node__list">
            {files.map((attachment) => (
              <FileItem
                key={attachment.id}
                attachment={attachment}
                editable={editable}
                onRemove={() => removeFile(attachment.id)}
              />
            ))}
          </div>

          {items.length > 0 && (
            <div className="image-upload-card__uploads file-node__uploads">
              {uploadRows}
            </div>
          )}

          {errorPanel}

          {editable && (
            <button
              type="button"
              className="file-node__upload-btn"
              onClick={() => inputRef.current?.click()}
              disabled={files.length + items.length >= limit}
            >
              <Paperclip size={13} />
              <span>
                {dragging
                  ? "Drop to attach"
                  : files.length + items.length >= limit
                    ? `${limit} files max`
                    : "Add a file"}
              </span>
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={limit > 1}
        hidden
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (selected.length > 0) void addFiles(selected);
        }}
      />
    </NodeViewWrapper>
  );
}
