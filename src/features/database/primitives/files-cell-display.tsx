import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Download,
  ExternalLink,
  PencilIcon,
  Trash2,
} from "src/components/icons";
import { ImageLightbox } from "src/components/tiptap-node/image-node/image-lightbox";
import {
  downloadFile,
  formatFileSize,
} from "src/components/tiptap-node/file-node/utils";
import { localCopy, uploadFile, UPLOADS_MAX_BYTES } from "src/api/uploads";
import type { FileValue } from "src/types";
import "./files-cell-display.scss";

// A Files & media cell: uploads and links, in order. Closed, images show as
// thumbnails and other files as chips (the first few, then "+N"); files
// dropped on the cell are added straight away. Open (a click), a card to
// upload (choose, drop or paste), add a link, open, download, rename,
// reorder (drag) or remove each. Images open in the editor's lightbox.

const SHOWN_IMAGES = 3;
const SHOWN_FILES = 2;

const isImage = (f: FileValue) =>
  f.mimeType?.startsWith("image/") ||
  /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(f.url);

/** "PDF", "DOCX", "ZIP"… from the name, for a file's little label. */
const extOf = (f: FileValue) => {
  if (f.kind === "link") return "";
  const m = /\.([a-z0-9]{1,5})$/i.exec(f.name);
  return m ? m[1].toUpperCase() : "FILE";
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

interface Uploading {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

export interface FilesCellDisplayProps {
  value: FileValue[];
  onChange: (value: FileValue[]) => void;
  readonly?: boolean;
  /** A grid of bigger thumbnails (the record's page panel). */
  large?: boolean;
}

export function FilesCellDisplay({
  value,
  onChange,
  readonly,
  large,
}: FilesCellDisplayProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<FileValue | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // The latest value, for uploads that finish after others changed it.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const files = value ?? [];

  async function addFiles(list: File[]) {
    for (const file of list) {
      const id = crypto.randomUUID();
      if (file.size > UPLOADS_MAX_BYTES) {
        setUploading((u) => [
          ...u,
          {
            id,
            name: file.name,
            progress: 0,
            error: t("database.files.tooBig", {
              max: formatFileSize(UPLOADS_MAX_BYTES),
            }),
          },
        ]);
        continue;
      }
      setUploading((u) => [...u, { id, name: file.name, progress: 0 }]);
      try {
        const url = await uploadFile(file, "content", {
          onProgress: ({ progress }) =>
            setUploading((u) =>
              u.map((x) => (x.id === id ? { ...x, progress } : x)),
            ),
        });
        onChange([
          ...(valueRef.current ?? []),
          {
            id,
            name: file.name,
            url,
            kind: "upload",
            size: file.size,
            mimeType: file.type || undefined,
          },
        ]);
        setUploading((u) => u.filter((x) => x.id !== id));
      } catch (error) {
        setUploading((u) =>
          u.map((x) =>
            x.id === id
              ? {
                  ...x,
                  error:
                    error instanceof Error ? error.message : String(error),
                }
              : x,
          ),
        );
      }
    }
  }

  function addLink() {
    const raw = link.trim();
    if (!raw) return;
    const url = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    onChange([
      ...files,
      { id: crypto.randomUUID(), name: hostOf(url), url, kind: "link" },
    ]);
    setLink("");
  }

  const remove = (id: string) => onChange(files.filter((f) => f.id !== id));
  const rename = (id: string, name: string) => {
    const next = name.trim();
    if (next) {
      onChange(files.map((f) => (f.id === id ? { ...f, name: next } : f)));
    }
    setRenaming(null);
  };
  const moveBefore = (id: string, beforeId: string) => {
    if (id === beforeId) return;
    const moving = files.find((f) => f.id === id);
    if (!moving) return;
    const rest = files.filter((f) => f.id !== id);
    const at = rest.findIndex((f) => f.id === beforeId);
    rest.splice(at < 0 ? rest.length : at, 0, moving);
    onChange(rest);
  };

  const openFile = (f: FileValue) => {
    if (isImage(f)) setLightbox(f);
    else window.open(f.url, "_blank", "noopener");
  };

  // ── Closed: thumbnails and chips ──
  const images = files.filter(isImage);
  const others = files.filter((f) => !isImage(f));
  const shownImages = large ? images : images.slice(0, SHOWN_IMAGES);
  const shownOthers = large ? others : others.slice(0, SHOWN_FILES);
  const hidden =
    images.length - shownImages.length + (others.length - shownOthers.length);

  const summary =
    files.length === 0 ? (
      <span className="db-files__empty">{t("database.person.empty")}</span>
    ) : (
      <>
        {shownImages.map((f) => (
          <img
            key={f.id}
            className="db-files__thumb"
            src={localCopy(f.url) ?? f.url}
            alt={f.name}
            loading="lazy"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(f);
            }}
          />
        ))}
        {shownOthers.map((f) => (
          <span key={f.id} className="db-files__chip" title={f.name}>
            <span className="db-files__chip-kind">
              {f.kind === "link" ? "↗" : extOf(f)}
            </span>
            <span className="db-files__chip-name">{f.name}</span>
          </span>
        ))}
        {hidden > 0 && <span className="db-files__more">+{hidden}</span>}
      </>
    );

  const dropHandlers = readonly
    ? {}
    : {
        onDragOver: (e: React.DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        },
        onDragLeave: () => setOver(false),
        onDrop: (e: React.DragEvent) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          void addFiles(Array.from(e.dataTransfer.files));
        },
      };

  const trigger = (
    <div
      className={`db-files${large ? " db-files--large" : ""}`}
      data-over={over || undefined}
      role={readonly ? undefined : "button"}
      tabIndex={readonly ? undefined : 0}
      onClick={() => !readonly && setOpen(true)}
      onKeyDown={(e) => {
        if (!readonly && e.key === "Enter") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      {...dropHandlers}
    >
      {summary}
      {uploading.some((u) => !u.error) && (
        <span className="db-files__more">…</span>
      )}
    </div>
  );

  const lightboxEl = lightbox && (
    <ImageLightbox
      src={localCopy(lightbox.url) ?? lightbox.url}
      alt={lightbox.name}
      caption={lightbox.name}
      onClose={() => setLightbox(null)}
    />
  );

  if (readonly || !open) {
    return (
      <>
        {trigger}
        {lightboxEl}
      </>
    );
  }

  return (
    <>
      <Popover open onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent side="bottom" align="start">
          <Card
            className="db-files-card"
            onPaste={(e: React.ClipboardEvent) => {
              const pasted = Array.from(e.clipboardData.files);
              if (pasted.length) {
                e.preventDefault();
                void addFiles(pasted);
              }
            }}
          >
            <div className="db-files-card__tabs" role="tablist">
              {(["upload", "link"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  className="db-files-card__tab"
                  onClick={() => setTab(k)}
                >
                  {t(`database.files.${k}`)}
                </button>
              ))}
            </div>

            {tab === "upload" ? (
              <div
                className="db-files-card__drop"
                data-over={over || undefined}
                onClick={() => inputRef.current?.click()}
                {...dropHandlers}
              >
                <b>{t("database.files.choose")}</b>{" "}
                {t("database.files.orDrop")}
                <small>
                  {t("database.files.limit", {
                    max: formatFileSize(UPLOADS_MAX_BYTES),
                  })}
                </small>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    void addFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
              </div>
            ) : (
              <form
                className="db-files-card__link"
                onSubmit={(e) => {
                  e.preventDefault();
                  addLink();
                }}
              >
                <input
                  autoFocus
                  className="db-person-search"
                  placeholder={t("database.files.linkPlaceholder")}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
                <Button type="submit" variant="primary" disabled={!link.trim()}>
                  <span className="tiptap-button-text">
                    {t("database.files.addLink")}
                  </span>
                </Button>
              </form>
            )}

            {(files.length > 0 || uploading.length > 0) && (
              <ul className="db-files-card__list">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="db-files-card__row"
                    draggable={renaming !== f.id}
                    data-dragging={dragId === f.id || undefined}
                    onDragStart={(e) => {
                      setDragId(f.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      e.stopPropagation();
                      moveBefore(dragId, f.id);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                  >
                    {isImage(f) ? (
                      <img
                        className="db-files-card__thumb"
                        src={localCopy(f.url) ?? f.url}
                        alt=""
                        draggable={false}
                      />
                    ) : (
                      <span className="db-files-card__kind">
                        {f.kind === "link" ? "↗" : extOf(f)}
                      </span>
                    )}
                    {renaming === f.id ? (
                      <input
                        autoFocus
                        className="db-files-card__rename"
                        defaultValue={f.name}
                        onBlur={(e) => rename(f.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            rename(f.id, e.currentTarget.value);
                          } else if (e.key === "Escape") {
                            e.stopPropagation();
                            setRenaming(null);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="db-files-card__name"
                        onClick={() => openFile(f)}
                      >
                        <span>{f.name}</span>
                        <small>
                          {f.kind === "link"
                            ? hostOf(f.url)
                            : f.size
                              ? formatFileSize(f.size)
                              : ""}
                        </small>
                      </button>
                    )}
                    <span className="db-files-card__actions">
                      <Button
                        type="button"
                        variant="ghost"
                        tooltip={t("database.files.rename")}
                        aria-label={t("database.files.rename")}
                        onClick={() => setRenaming(f.id)}
                      >
                        <PencilIcon className="tiptap-button-icon" />
                      </Button>
                      {f.kind === "upload" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          tooltip={t("database.files.download")}
                          aria-label={t("database.files.download")}
                          onClick={() => void downloadFile(f.url, f.name)}
                        >
                          <Download className="tiptap-button-icon" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          tooltip={t("database.files.open")}
                          aria-label={t("database.files.open")}
                          onClick={() => openFile(f)}
                        >
                          <ExternalLink className="tiptap-button-icon" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        tooltip={t("database.files.remove")}
                        aria-label={t("database.files.remove")}
                        onClick={() => remove(f.id)}
                      >
                        <Trash2 className="tiptap-button-icon" />
                      </Button>
                    </span>
                  </li>
                ))}
                {uploading.map((u) => (
                  <li
                    key={u.id}
                    className="db-files-card__row"
                    data-error={u.error ? true : undefined}
                  >
                    <span className="db-files-card__kind">
                      {u.error ? "!" : `${Math.round(u.progress)}%`}
                    </span>
                    <span className="db-files-card__name db-files-card__name--static">
                      <span>{u.name}</span>
                      <small>{u.error ?? t("database.files.uploading")}</small>
                    </span>
                    {u.error && (
                      <span className="db-files-card__actions">
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={t("database.files.remove")}
                          onClick={() =>
                            setUploading((list) =>
                              list.filter((x) => x.id !== u.id),
                            )
                          }
                        >
                          <Trash2 className="tiptap-button-icon" />
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </PopoverContent>
      </Popover>
      {lightboxEl}
    </>
  );
}
