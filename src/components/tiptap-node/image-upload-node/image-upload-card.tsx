import { useCallback, useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import {
  AlertCircle,
  ArrowDown,
  CloudOff,
  Image as ImageIcon,
  Link2,
  Search,
  Upload,
  X,
} from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { listUploads } from "src/api/uploads";
import { searchPhotos } from "src/api/photos";
import { isNetworkError, isOfflineNow } from "src/lib/sync-status";
import "./image-upload-card.scss";

// The card an empty image block shows: upload (click, drop or paste), pick a
// recent upload, add from a link, or search free photos.

type Tab = "upload" | "link" | "photos";

export interface InsertedImage {
  src: string;
  alt?: string;
  caption?: string;
}

export interface ImageUploadCardProps {
  accept: string;
  limit: number;
  maxSize: number;
  upload?: (
    file: File,
    onProgress: (event: { progress: number }) => void,
    signal: AbortSignal,
  ) => Promise<string>;
  onError?: (error: Error) => void;
  /** Replace the card with these images. */
  onInsert: (images: InsertedImage[]) => void;
  /** Shown as a close button (and on Escape) when set, e.g. while replacing. */
  onCancel?: () => void;
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  controller: AbortController;
}

interface CardError {
  title: string;
  body: string;
  /** The files to try again, when the upload itself failed. */
  retry?: File[];
  /** No connection: the files upload by themselves once it's back. */
  waiting?: boolean;
}

// Offline (or the server can't be reached): keep the files and upload them
// when the connection is back, while this page stays open.
function waitingError(files: File[]): CardError {
  return {
    title:
      files.length === 1
        ? `${files[0].name} will upload when you're back online`
        : `${files.length} images will upload when you're back online`,
    body: "You're offline. Keep this page open and the image is added as soon as the connection is back.",
    retry: files,
    waiting: true,
  };
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const FORMATS = "PNG, JPG, GIF, WEBP or SVG";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / 1024 / 1024;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

const baseName = (name: string) => name.replace(/\.[^/.]+$/, "");

export function ImageUploadCard({
  accept,
  limit,
  maxSize,
  upload,
  onError,
  onInsert,
  onCancel,
}: ImageUploadCardProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState<CardError | null>(null);
  const [dragDepth, setDragDepth] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the card so Ctrl+V works right after the block is added.
  // A frame later: the editor takes focus back right after inserting the
  // block (e.g. from the Replace button).
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      rootRef.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  const uploadAll = useCallback(
    async (files: File[]) => {
      if (!upload) {
        onError?.(new Error("Upload function is not defined"));
        return;
      }
      setError(null);
      const picked = files.slice(0, Math.max(1, limit));

      // Check every file before uploading any.
      for (const file of picked) {
        if (!file.type.startsWith("image/")) {
          setError({
            title: `${file.name} isn't an image`,
            body: `Use a ${FORMATS} file.`,
          });
          return;
        }
        if (maxSize > 0 && file.size > maxSize) {
          setError({
            title: `${file.name} is ${formatSize(file.size)}`,
            body: `Images can be up to ${formatSize(maxSize)}. Export a smaller version, or add it from a link.`,
          });
          return;
        }
      }

      if (isOfflineNow()) {
        setError(waitingError(picked));
        return;
      }

      const batch: UploadItem[] = picked.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        controller: new AbortController(),
      }));
      setItems(batch);

      const unreachable: File[] = [];
      const results = await Promise.all(
        batch.map(async (item) => {
          try {
            const src = await upload(
              item.file,
              ({ progress }) =>
                setItems((prev) =>
                  prev.map((it) =>
                    it.id === item.id ? { ...it, progress } : it,
                  ),
                ),
              item.controller.signal,
            );
            return { src, alt: baseName(item.file.name) } as InsertedImage;
          } catch (err) {
            if (item.controller.signal.aborted) return null;
            if (isNetworkError(err)) {
              unreachable.push(item.file);
              return null;
            }
            const e = err instanceof Error ? err : new Error(String(err));
            onError?.(e);
            setError({
              title: `${item.file.name} couldn't be uploaded`,
              body: `${e.message}. Check your connection and try again.`,
              retry: [item.file],
            });
            return null;
          }
        }),
      );

      setItems([]);
      if (unreachable.length) setError(waitingError(unreachable));
      const done = results.filter((r): r is InsertedImage => r !== null);
      if (done.length > 0) onInsert(done);
    },
    [upload, limit, maxSize, onError, onInsert],
  );

  // Waiting for the connection: upload as soon as it's back.
  useEffect(() => {
    if (!error?.waiting || !error.retry) return;
    const files = error.retry;
    const onOnline = () => void uploadAll(files);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [error, uploadAll]);

  const cancel = (id: string) => {
    setItems((prev) => {
      prev.find((it) => it.id === id)?.controller.abort();
      return prev.filter((it) => it.id !== id);
    });
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    setTab("upload");
    void uploadAll(files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragDepth(0);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) void uploadAll(files);
  };

  const dragging = dragDepth > 0 && items.length === 0;
  const uploading = items.length > 0;

  return (
    <div
      ref={rootRef}
      className="image-upload-card"
      tabIndex={-1}
      onPaste={onPaste}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" && onCancel) {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="image-upload-card__head">
        <ButtonGroup
          orientation="horizontal"
          className="image-upload-card__tabs"
          role="tablist"
          aria-label="Add an image"
        >
          {(
            [
              ["upload", "Upload", Upload],
              ["link", "Link", Link2],
              ["photos", "Photos", ImageIcon],
            ] as const
          ).map(([id, label, Icon]) => (
            <Button
              key={id}
              type="button"
              role="tab"
              variant="ghost"
              aria-selected={tab === id}
              data-active-state={tab === id ? "on" : "off"}
              className="image-upload-card__tab"
              onClick={() => setTab(id)}
            >
              <Icon className="tiptap-button-icon" />
              <span className="tiptap-button-text">{label}</span>
            </Button>
          ))}
        </ButtonGroup>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            className="image-upload-card__cancel"
            tooltip="Keep the current image"
            showTooltip
            aria-label="Cancel"
            onClick={onCancel}
          >
            <X className="tiptap-button-icon" />
          </Button>
        )}
      </div>

      {tab === "upload" && (
        <div className="image-upload-card__body">
          {error ? (
            <ErrorPanel
              error={error}
              onChoose={() => inputRef.current?.click()}
              onRetry={
                error.retry ? () => void uploadAll(error.retry!) : undefined
              }
              onLink={() => {
                setError(null);
                setTab("link");
              }}
            />
          ) : uploading ? (
            <div className="image-upload-card__uploads">
              {items.map((it) => (
                <UploadRow
                  key={it.id}
                  item={it}
                  onCancel={() => cancel(it.id)}
                />
              ))}
              <p className="image-upload-card__hint">
                Keep writing: the image replaces this card when it's ready.
              </p>
            </div>
          ) : (
            <>
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
                onDrop={onDrop}
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
                      <ImageIcon size={20} />
                    </span>
                    <span className="image-upload-card__drop-title">
                      Drop an image here, or <u>browse</u>
                    </span>
                    <span className="image-upload-card__drop-sub">
                      or paste it <kbd>Ctrl</kbd>
                      <kbd>V</kbd>
                    </span>
                    <span className="image-upload-card__drop-meta">
                      {FORMATS}
                      {maxSize > 0 ? ` · up to ${formatSize(maxSize)}` : ""}
                    </span>
                  </>
                )}
              </button>
              <RecentUploads onPick={(src) => onInsert([{ src }])} />
            </>
          )}
        </div>
      )}

      {tab === "link" && <LinkPanel onAdd={(src) => onInsert([{ src }])} />}

      {tab === "photos" && (
        <PhotosPanel onPick={(image) => onInsert([image])} />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={limit > 1}
        hidden
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length > 0) void uploadAll(files);
        }}
      />
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function UploadRow({
  item,
  onCancel,
}: {
  item: UploadItem;
  onCancel: () => void;
}) {
  const [preview] = useState(() => URL.createObjectURL(item.file));
  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);
  const loaded = Math.round((item.file.size * item.progress) / 100);
  return (
    <div className="image-upload-card__row">
      <img src={preview} alt="" className="image-upload-card__thumb" />
      <div className="image-upload-card__row-main">
        <div className="image-upload-card__row-top">
          <span className="image-upload-card__row-name">{item.file.name}</span>
          <span className="image-upload-card__row-pct">{item.progress}%</span>
        </div>
        <div
          className="image-upload-card__bar"
          role="progressbar"
          aria-valuenow={item.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Uploading ${item.file.name}`}
        >
          <div style={{ width: `${item.progress}%` }} />
        </div>
        <span className="image-upload-card__row-meta">
          {formatSize(loaded)} of {formatSize(item.file.size)}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        aria-label="Cancel upload"
        onClick={onCancel}
      >
        <X className="tiptap-button-icon" />
      </Button>
    </div>
  );
}

function ErrorPanel({
  error,
  onChoose,
  onRetry,
  onLink,
}: {
  error: CardError;
  onChoose: () => void;
  onRetry?: () => void;
  onLink: () => void;
}) {
  return (
    <div className="image-upload-card__error-wrap">
      <div
        className={`image-upload-card__error${error.waiting ? " is-waiting" : ""}`}
        role={error.waiting ? "status" : "alert"}
      >
        <span className="image-upload-card__error-icon">
          {error.waiting ? <CloudOff size={17} /> : <AlertCircle size={17} />}
        </span>
        <div>
          <div className="image-upload-card__error-title">{error.title}</div>
          <div className="image-upload-card__error-body">{error.body}</div>
        </div>
      </div>
      <div className="image-upload-card__actions">
        {onRetry ? (
          <Button type="button" variant="primary" onClick={onRetry}>
            <span className="tiptap-button-text">Try again</span>
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={onChoose}>
            <span className="tiptap-button-text">Choose another file</span>
          </Button>
        )}
        <Button type="button" onClick={onLink}>
          <span className="tiptap-button-text">Use a link instead</span>
        </Button>
      </div>
    </div>
  );
}

// The workspace's recent uploads (images only). Hidden when there are none
// or when there's no account (the landing page).
function RecentUploads({ onPick }: { onPick: (src: string) => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    listUploads("content", 40)
      .then((all) => {
        if (alive) setUrls(all.filter((u) => IMAGE_EXT.test(u)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (urls.length === 0) return null;
  const shown = showAll ? urls : urls.slice(0, 5);

  return (
    <div className="image-upload-card__recent">
      <div className="image-upload-card__recent-head">
        <span>Recent in this workspace</span>
        {urls.length > 5 && (
          <button
            type="button"
            className="image-upload-card__link-btn"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show less" : "See all"}
          </button>
        )}
      </div>
      <div className="image-upload-card__recent-grid">
        {shown.map((url, i) => (
          <button
            key={url}
            type="button"
            className="image-upload-card__recent-item"
            aria-label={`Recent image ${i + 1}`}
            onClick={() => onPick(url)}
          >
            <img src={url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

function LinkPanel({ onAdd }: { onAdd: (src: string) => void }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "loaded" | "failed">("idle");
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const url = value.trim();
  const looksLikeUrl = /^https?:\/\/\S+$/i.test(url);

  return (
    <div className="image-upload-card__body image-upload-card__form">
      <label htmlFor="image-upload-link" className="image-upload-card__label">
        Image link
      </label>
      <input
        id="image-upload-link"
        className="image-upload-card__input"
        placeholder="https://example.com/image.jpg"
        value={value}
        autoFocus
        onChange={(e) => {
          setValue(e.target.value);
          setStatus("idle");
          setSize(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && status === "loaded") onAdd(url);
        }}
      />
      {looksLikeUrl && (
        <div
          className={`image-upload-card__preview${status === "loaded" ? " is-loaded" : ""}`}
        >
          <img
            key={url}
            src={url}
            alt=""
            onLoad={(e) => {
              setStatus("loaded");
              setSize({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              });
            }}
            onError={() => setStatus("failed")}
          />
          {status === "loaded" && size && (
            <span className="image-upload-card__preview-tag">
              Preview · {size.w} × {size.h}
            </span>
          )}
          {status === "failed" && (
            <span className="image-upload-card__preview-fail">
              No image found at this link. Use a direct link to the image file.
            </span>
          )}
        </div>
      )}
      <div className="image-upload-card__form-foot">
        <span className="image-upload-card__hint">
          Any direct link to a {FORMATS}
        </span>
        <Button
          type="button"
          variant="primary"
          disabled={status !== "loaded"}
          onClick={() => onAdd(url)}
        >
          <span className="tiptap-button-text">Add image</span>
        </Button>
      </div>
    </div>
  );
}

// ── Photos (Pexels) ─────────────────────────────────────────────────────────

function PhotosPanel({ onPick }: { onPick: (image: InsertedImage) => void }) {
  const [query, setQuery] = useState("nature");
  const [debounced] = useDebounce(query.trim(), 400);

  const {
    data: photos = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["pexels", debounced],
    queryFn: () => searchPhotos(debounced),
    placeholderData: keepPreviousData,
    enabled: debounced.length > 0,
  });

  return (
    <div className="image-upload-card__body image-upload-card__form">
      <label className="image-upload-card__search">
        <Search size={15} aria-hidden="true" />
        <span className="image-upload-card__sr">Search photos</span>
        <input
          value={query}
          autoFocus
          placeholder="Search photos"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {isError ? (
        <p className="image-upload-card__hint">
          Photos couldn't load. Try again in a moment.
        </p>
      ) : (
        <>
          <div
            className={`image-upload-card__photos${isFetching ? " is-fetching" : ""}`}
          >
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className="image-upload-card__photo"
                title={photo.alt || photo.photographer}
                onClick={() =>
                  onPick({
                    src: photo.src.large2x,
                    alt: photo.alt ?? "",
                    caption: `Photo by ${photo.photographer} on Pexels`,
                  })
                }
              >
                <img
                  src={photo.src.medium}
                  alt={photo.alt ?? ""}
                  loading="lazy"
                />
                <span className="image-upload-card__photo-credit">
                  {photo.photographer}
                </span>
              </button>
            ))}
          </div>
          {!isFetching && photos.length === 0 && debounced && (
            <p className="image-upload-card__hint">
              No photos for “{debounced}”.
            </p>
          )}
          <p className="image-upload-card__hint">
            Free photos from{" "}
            <a href="https://www.pexels.com" target="_blank" rel="noreferrer">
              Pexels
            </a>
            . The photographer is credited under the image.
          </p>
        </>
      )}
    </div>
  );
}
