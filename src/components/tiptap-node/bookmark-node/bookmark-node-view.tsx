import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  AlertCircle,
  Globe,
  LayoutList,
  LayoutPanelTop,
  Link2,
  Pencil,
  RefreshCw,
} from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { fetchLinkPreview } from "src/api/link-preview";
import type { BookmarkAttrs } from "./bookmark-node-extension";
import "./bookmark-node-view.scss";

// "example.com/page" → "https://example.com/page"; anything that isn't a
// web address → null.
function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ── Empty block: paste a link ───────────────────────────────────────────────

function BookmarkEmpty({
  initial = "",
  onSubmit,
  onCancel,
}: {
  initial?: string;
  onSubmit: (url: string) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = normalizeUrl(draft);
  const invalid = draft.trim().length > 0 && !url;

  // A frame later: the editor takes focus back right after inserting the
  // block from the slash menu.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="bookmark-empty">
      <Link2 size={16} className="bookmark-empty__icon" aria-hidden />
      <input
        ref={inputRef}
        className="bookmark-empty__input"
        placeholder="Paste a link to make a bookmark…"
        value={draft}
        aria-invalid={invalid}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && url) onSubmit(url);
          if (e.key === "Escape") onCancel?.();
        }}
      />
      {onCancel && (
        <Button type="button" variant="ghost" size="small" onClick={onCancel}>
          <span className="tiptap-button-text">Cancel</span>
        </Button>
      )}
      <Button
        type="button"
        variant="primary"
        size="small"
        disabled={!url}
        onClick={() => url && onSubmit(url)}
      >
        <span className="tiptap-button-text">Create bookmark</span>
      </Button>
      {invalid && (
        <span className="bookmark-empty__hint">
          That doesn't look like a web address.
        </span>
      )}
    </div>
  );
}

// ── Loading: the card's shape, shimmering ──────────────────────────────────

function BookmarkSkeleton({
  layout,
  url,
}: {
  layout: BookmarkAttrs["layout"];
  url: string;
}) {
  return (
    <div
      className={`bookmark-card bookmark-card--${layout} is-loading`}
      aria-busy="true"
      aria-label={`Loading a preview of ${url}`}
    >
      <div className="bookmark-card__main">
        <span className="bookmark-skel bookmark-skel--title" />
        {layout === "card" && (
          <>
            <span className="bookmark-skel bookmark-skel--line" />
            <span className="bookmark-skel bookmark-skel--line short" />
          </>
        )}
        <span className="bookmark-card__host">
          <Globe size={12} aria-hidden />
          {hostnameOf(url)}
        </span>
      </div>
      {layout === "card" && (
        <span className="bookmark-skel bookmark-skel--image" />
      )}
    </div>
  );
}

// ── Filled block ────────────────────────────────────────────────────────────

function BookmarkCard({
  attrs,
  failed,
}: {
  attrs: BookmarkAttrs & { url: string };
  failed: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const host = hostnameOf(attrs.url);
  const layout = attrs.layout ?? "card";

  return (
    <a
      className={`bookmark-card bookmark-card--${layout}`}
      href={attrs.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bookmark-card__main">
        <div className="bookmark-card__title">{attrs.title || host}</div>
        {layout === "card" && (attrs.description || failed) && (
          <div className="bookmark-card__desc">
            {failed && !attrs.description ? (
              <span className="bookmark-card__failed">
                <AlertCircle size={13} aria-hidden />
                No preview for this page. The link still works.
              </span>
            ) : (
              attrs.description
            )}
          </div>
        )}
        <div className="bookmark-card__host">
          {attrs.favicon && !faviconError ? (
            <img
              src={attrs.favicon}
              className="bookmark-card__favicon"
              alt=""
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe size={12} aria-hidden />
          )}
          <span>{layout === "compact" ? host : attrs.url}</span>
        </div>
      </div>

      {layout === "card" && attrs.image && !imgError && (
        <div className="bookmark-card__image">
          <img
            src={attrs.image}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      )}
    </a>
  );
}

export function BookmarkNodeView({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const attrs = node.attrs as BookmarkAttrs;
  const editable = editor.isEditable;
  const layout = attrs.layout ?? "card";

  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);

  // Ignore a preview that arrives after the link changed again.
  const requestRef = useRef(0);

  const load = useCallback(
    async (url: string) => {
      const request = ++requestRef.current;
      setLoading(true);
      setFailed(false);
      try {
        const data = await fetchLinkPreview(url);
        if (request !== requestRef.current) return;
        updateAttributes({
          url,
          title: data.title,
          description: data.description,
          image: data.image,
          favicon: data.favicon,
        });
      } catch {
        if (request !== requestRef.current) return;
        // Keep the link: it still opens, it just has no preview.
        updateAttributes({ url });
        setFailed(true);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [updateAttributes],
  );

  // A link with no preview yet (pasted, or from before previews worked):
  // fetch it once. Only in an editable page, so readers don't each ask.
  useEffect(() => {
    if (editable && attrs.url && !attrs.title) void load(attrs.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.url]);

  const submit = (url: string) => {
    setEditing(false);
    if (url === attrs.url && attrs.title) return;
    updateAttributes({
      url,
      title: null,
      description: null,
      image: null,
      favicon: null,
    });
    void load(url);
  };

  if (!attrs.url || editing) {
    return (
      <NodeViewWrapper className="bookmark-node" contentEditable={false}>
        {editable ? (
          <BookmarkEmpty
            initial={attrs.url ?? ""}
            onSubmit={submit}
            onCancel={attrs.url ? () => setEditing(false) : undefined}
          />
        ) : null}
      </NodeViewWrapper>
    );
  }

  const url = attrs.url;

  return (
    <NodeViewWrapper className="bookmark-node" contentEditable={false}>
      <div className="bookmark-frame">
        {loading ? (
          <BookmarkSkeleton layout={layout} url={url} />
        ) : (
          <BookmarkCard attrs={{ ...attrs, url }} failed={failed} />
        )}

        {editable && (
          <div
            className="bookmark-actions"
            role="toolbar"
            aria-label="Bookmark"
          >
            <Button
              type="button"
              variant="ghost"
              size="small"
              tooltip={layout === "card" ? "Show as one line" : "Show as card"}
              showTooltip
              aria-label={
                layout === "card" ? "Show as one line" : "Show as card"
              }
              onClick={() =>
                updateAttributes({
                  layout: layout === "card" ? "compact" : "card",
                })
              }
            >
              {layout === "card" ? (
                <LayoutList className="tiptap-button-icon" />
              ) : (
                <LayoutPanelTop className="tiptap-button-icon" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="small"
              tooltip="Refresh preview"
              showTooltip
              aria-label="Refresh preview"
              disabled={loading}
              onClick={() => void load(url)}
            >
              <RefreshCw
                className={`tiptap-button-icon${loading ? " bookmark-spin" : ""}`}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="small"
              tooltip="Edit link"
              showTooltip
              aria-label="Edit link"
              onClick={() => setEditing(true)}
            >
              <Pencil className="tiptap-button-icon" />
            </Button>
          </div>
        )}
      </div>

      {editable && failed && !loading && attrs.title && (
        <div className="bookmark-note" role="status">
          Couldn't refresh the preview, so this is the last one we got.
        </div>
      )}

      {(editable || attrs.caption) && (
        <input
          className="bookmark-caption"
          placeholder="Add a caption…"
          value={attrs.caption}
          readOnly={!editable}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
    </NodeViewWrapper>
  );
}
