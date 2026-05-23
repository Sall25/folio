import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { BookmarkAttrs } from "./bookmark-node-extension";
import "./bookmark-node-view.scss";

function BookmarkEmpty({ onUrl }: { onUrl: (url: string) => void }) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const url = draft.trim();
    if (!url) return;
    onUrl(url);
  };

  return (
    <div className="bookmark-empty">
      <i className="ti ti-link bookmark-empty-icon" aria-hidden="true" />
      <div className="bookmark-url-row">
        <input
          ref={inputRef}
          className="bookmark-url-input"
          placeholder="Paste a URL to create a bookmark…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") handleSubmit();
          }}
        />
        <button
          className="bookmark-url-btn"
          onClick={handleSubmit}
          disabled={!draft.trim()}
        >
          Bookmark
        </button>
      </div>
    </div>
  );
}

function BookmarkCard({
  attrs,
  onCaptionChange,
}: {
  attrs: BookmarkAttrs;
  onCaptionChange: (v: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const hostname = attrs.url
    ? new URL(attrs.url).hostname.replace("www.", "")
    : "";

  return (
    <div className="bookmark-card-wrap">
      <a
        className="bookmark-card"
        href={attrs.url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="bookmark-card-left">
          <div className="bookmark-card-title">{attrs.title ?? attrs.url}</div>
          {attrs.description && (
            <div className="bookmark-card-desc">{attrs.description}</div>
          )}
          <div className="bookmark-card-url">
            {!faviconError && attrs.favicon && (
              <img
                src={attrs.favicon}
                className="bookmark-favicon"
                alt=""
                onError={() => setFaviconError(true)}
              />
            )}
            <span>{hostname}</span>
          </div>
        </div>

        {attrs.image && !imgError && (
          <div className="bookmark-card-image">
            <img
              src={attrs.image}
              alt={attrs.title ?? ""}
              onError={() => setImgError(true)}
            />
          </div>
        )}
      </a>

      <input
        className="bookmark-caption"
        placeholder="Add a caption…"
        value={attrs.caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function BookmarkNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as BookmarkAttrs;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchMetadata = async (url: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `http://localhost:3000/api/bookmark?url=${encodeURIComponent(url)}`,
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      updateAttributes({
        url,
        title: data.title,
        description: data.description,
        image: data.image,
        favicon: data.favicon,
      });
    } catch {
      // still save the URL even if metadata fails
      updateAttributes({ url });
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if URL is set but no title yet (e.g. inserted via paste rule)
  useEffect(() => {
    if (attrs.url && !attrs.title && !loading) {
      fetchMetadata(attrs.url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs.url]);

  return (
    <NodeViewWrapper>
      <div className="bookmark-root" contentEditable={false}>
        {!attrs.url && <BookmarkEmpty onUrl={(url) => fetchMetadata(url)} />}
        {attrs.url && loading && (
          <div className="bookmark-loading">
            <i className="ti ti-loader-2 bookmark-spin" aria-hidden="true" />
            <span>Fetching bookmark…</span>
          </div>
        )}
        {attrs.url && !loading && (
          <BookmarkCard
            attrs={attrs}
            onCaptionChange={(v) => updateAttributes({ caption: v })}
          />
        )}
        {error && (
          <div className="bookmark-error">
            Could not fetch metadata —{" "}
            <a
              href={attrs.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              {attrs.url}
            </a>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
