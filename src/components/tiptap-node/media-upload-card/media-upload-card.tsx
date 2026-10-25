import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "src/components/icons";
import { AlertCircle, ArrowDown, Link2, Upload, X } from "src/components/icons";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
// Same look as the image and file blocks' card.
import "src/components/tiptap-node/image-upload-node/image-upload-card.scss";
import "./media-upload-card.scss";

// The empty video or audio block: upload a file or paste a link. The block
// decides what a link may be (checkLink) and what happens with the result.

export interface MediaUploadOptions {
  /** Stores a file and returns its URL. No Upload tab without it. */
  upload?: (
    file: File,
    onProgress?: (event: { progress: number }) => void,
    signal?: AbortSignal,
  ) => Promise<string>;
  /** Largest upload in bytes (0 = no limit). */
  maxSize: number;
  onError?: (error: Error) => void;
}

export interface MediaUploadCardProps {
  options: MediaUploadOptions;
  /** "video" or "audio": used in the card's sentences. */
  noun: string;
  icon: LucideIcon;
  /** MIME prefix a file must have, e.g. "video/". */
  mimePrefix: string;
  /** Shown as the accepted formats, e.g. "MP4, WEBM or MOV". */
  formats: string;
  /** What to suggest when a file is too big or not accepted. */
  alternative: string;
  linkLabel: string;
  linkPlaceholder: string;
  /** Hint under the link field while it's empty or invalid. */
  linkHint: string;
  /** Shown when the link can't be used. */
  linkInvalid: string;
  /** A short label for a usable link ("YouTube video"), or null. */
  checkLink: (url: string) => string | null;
  onDone: (result: { src: string; fileName?: string | null }) => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / 1024 / 1024;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

interface Uploading {
  file: File;
  progress: number;
  controller: AbortController;
}

export function MediaUploadCard(props: MediaUploadCardProps) {
  const { options, noun, icon: Icon, mimePrefix, formats, alternative } = props;
  const canUpload = !!options.upload;
  const [tab, setTab] = useState<"upload" | "link">(
    canUpload ? "upload" : "link",
  );
  const [uploading, setUploading] = useState<Uploading | null>(null);
  const [error, setError] = useState<{ title: string; body: string } | null>(
    null,
  );
  const [dragDepth, setDragDepth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stop an upload still running when the block goes away.
  const uploadingRef = useRef(uploading);
  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);
  useEffect(() => () => uploadingRef.current?.controller.abort(), []);

  const { onDone } = props;
  const upload = useCallback(
    async (file: File) => {
      setError(null);
      if (!options.upload) return;
      if (!file.type.startsWith(mimePrefix)) {
        setError({
          title: `${file.name} isn't ${noun === "audio" ? "an audio file" : `a ${noun}`}`,
          body: `Use a ${formats} file, or ${alternative}.`,
        });
        return;
      }
      if (options.maxSize > 0 && file.size > options.maxSize) {
        setError({
          title: `${file.name} is ${formatSize(file.size)}`,
          body: `Uploads can be up to ${formatSize(options.maxSize)}. For bigger files, ${alternative}.`,
        });
        return;
      }
      const controller = new AbortController();
      setUploading({ file, progress: 0, controller });
      try {
        const src = await options.upload(
          file,
          ({ progress }) => setUploading((u) => (u ? { ...u, progress } : u)),
          controller.signal,
        );
        onDone({ src, fileName: file.name });
      } catch (err) {
        if (controller.signal.aborted) return;
        const e = err instanceof Error ? err : new Error(String(err));
        options.onError?.(e);
        setError({
          title: `${file.name} couldn't be uploaded`,
          body: `${e.message}. Check your connection and try again.`,
        });
      } finally {
        setUploading(null);
      }
    },
    [options, onDone, mimePrefix, noun, formats, alternative],
  );

  const dragging = dragDepth > 0 && !uploading;

  return (
    <div
      className="image-upload-card media-upload-card"
      tabIndex={-1}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {canUpload && (
        <div className="image-upload-card__head">
          <ButtonGroup
            orientation="horizontal"
            className="image-upload-card__tabs"
            role="tablist"
            aria-label={`Add ${noun === "audio" ? "audio" : `a ${noun}`}`}
          >
            {(
              [
                ["upload", "Upload", Upload],
                ["link", "Link", Link2],
              ] as const
            ).map(([id, label, TabIcon]) => (
              <Button
                key={id}
                type="button"
                role="tab"
                variant="ghost"
                aria-selected={tab === id}
                data-active-state={tab === id ? "on" : "off"}
                className="image-upload-card__tab"
                onClick={() => {
                  setTab(id);
                  setError(null);
                }}
              >
                <TabIcon className="tiptap-button-icon" />
                <span className="tiptap-button-text">{label}</span>
              </Button>
            ))}
          </ButtonGroup>
        </div>
      )}

      {tab === "upload" && (
        <div className="image-upload-card__body">
          {error ? (
            <div className="image-upload-card__error-wrap">
              <div className="image-upload-card__error" role="alert">
                <span className="image-upload-card__error-icon">
                  <AlertCircle size={17} />
                </span>
                <div>
                  <div className="image-upload-card__error-title">
                    {error.title}
                  </div>
                  <div className="image-upload-card__error-body">
                    {error.body}
                  </div>
                </div>
              </div>
              <div className="image-upload-card__actions">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => inputRef.current?.click()}
                >
                  <span className="tiptap-button-text">
                    Choose another file
                  </span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setTab("link");
                  }}
                >
                  <span className="tiptap-button-text">Use a link instead</span>
                </Button>
              </div>
            </div>
          ) : uploading ? (
            <div className="image-upload-card__uploads">
              <div className="image-upload-card__row">
                <span className="image-upload-card__thumb media-upload-card__thumb">
                  <Icon size={22} />
                </span>
                <div className="image-upload-card__row-main">
                  <div className="image-upload-card__row-top">
                    <span className="image-upload-card__row-name">
                      {uploading.file.name}
                    </span>
                    <span className="image-upload-card__row-pct">
                      {uploading.progress}%
                    </span>
                  </div>
                  <div
                    className="image-upload-card__bar"
                    role="progressbar"
                    aria-valuenow={uploading.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Uploading ${uploading.file.name}`}
                  >
                    <div style={{ width: `${uploading.progress}%` }} />
                  </div>
                  <span className="image-upload-card__row-meta">
                    {formatSize(
                      Math.round(
                        (uploading.file.size * uploading.progress) / 100,
                      ),
                    )}{" "}
                    of {formatSize(uploading.file.size)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="Cancel upload"
                  tooltip="Cancel"
                  showTooltip
                  onClick={() => {
                    uploading.controller.abort();
                    setUploading(null);
                  }}
                >
                  <X className="tiptap-button-icon" />
                </Button>
              </div>
              <p className="image-upload-card__hint">
                Keep writing: the {noun} replaces this card when it's ready.
              </p>
            </div>
          ) : (
            <button
              type="button"
              className={`image-upload-card__drop${dragging ? " is-dragging" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragDepth((d) => d + 1);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setDragDepth((d) => Math.max(0, d - 1))}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragDepth(0);
                const file = e.dataTransfer.files?.[0];
                if (file) void upload(file);
              }}
            >
              {dragging ? (
                <>
                  <span className="image-upload-card__drop-icon is-solid">
                    <ArrowDown size={22} />
                  </span>
                  <span className="image-upload-card__drop-title">
                    Drop to add it here
                  </span>
                </>
              ) : (
                <>
                  <span className="image-upload-card__drop-icon">
                    <Icon size={20} />
                  </span>
                  <span className="image-upload-card__drop-title">
                    Drop {noun === "audio" ? "an audio file" : `a ${noun}`}{" "}
                    here, or <u>browse</u>
                  </span>
                  <span className="image-upload-card__drop-meta">
                    {formats}
                    {options.maxSize > 0
                      ? ` · up to ${formatSize(options.maxSize)}`
                      : ""}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {tab === "link" && (
        <LinkPanel {...props} onAdd={(src) => onDone({ src })} />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={`${mimePrefix}*`}
        hidden
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
    </div>
  );
}

function LinkPanel({
  noun,
  linkLabel,
  linkPlaceholder,
  linkHint,
  linkInvalid,
  checkLink,
  onAdd,
}: MediaUploadCardProps & { onAdd: (src: string) => void }) {
  const [value, setValue] = useState("");
  const url = value.trim();
  const label = url ? checkLink(url) : null;
  const invalid = url.length > 0 && !label;
  const add = () => {
    if (label) onAdd(url);
  };

  return (
    <div className="image-upload-card__body image-upload-card__form">
      <label htmlFor={`${noun}-link`} className="image-upload-card__label">
        {linkLabel}
      </label>
      <input
        id={`${noun}-link`}
        className="image-upload-card__input"
        placeholder={linkPlaceholder}
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") add();
        }}
      />
      {invalid && (
        <span className="media-upload-card__invalid">{linkInvalid}</span>
      )}
      <div className="image-upload-card__form-foot">
        <span className="image-upload-card__hint">{label ?? linkHint}</span>
        <Button type="button" variant="primary" disabled={!label} onClick={add}>
          <span className="tiptap-button-text">
            Embed {noun === "audio" ? "audio" : noun}
          </span>
        </Button>
      </div>
    </div>
  );
}
