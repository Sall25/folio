import { useState, useRef, useCallback, useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Link, Loader2, AlertCircle, Video } from "lucide-react";
import type { VideoAttrs } from "./types";
import "./video-node-view.scss";

function VideoEmpty({
  onFile,
  onUrl,
}: {
  onFile: (file: File) => void;
  onUrl: (url: string) => void;
}) {
  const [mode, setMode] = useState<"pick" | "url">("pick");
  const [urlDraft, setUrlDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const handleUrlSubmit = () => {
    const url = urlDraft.trim();
    if (url) onUrl(url);
  };

  if (mode === "url") {
    return (
      <div className="video-empty">
        <div className="video-url-row">
          <input
            className="video-url-input"
            placeholder="Paste video URL…"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") handleUrlSubmit();
              if (e.key === "Escape") setMode("pick");
            }}
            autoFocus
          />
          <button
            className="video-url-submit"
            onClick={handleUrlSubmit}
            disabled={!urlDraft.trim()}
          >
            Embed
          </button>
          <button className="video-url-cancel" onClick={() => setMode("pick")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="video-empty"
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith("video/")) onFile(file);
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <Video style={{ width: 22, height: 22 }} className="video-empty-icon" />
      <span className="video-empty-label">Add video</span>
      <span className="video-empty-sub">
        Drag & drop or <span className="video-empty-link">choose a file</span>
      </span>
      <button
        className="video-embed-btn"
        onClick={(e) => {
          e.stopPropagation();
          setMode("url");
        }}
      >
        <Link style={{ width: 12, height: 12 }} />
        Embed URL
      </button>
    </div>
  );
}

function VideoPlayer({ src, poster }: { src: string; poster: string | null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="video-player">
      {loading && !error && (
        <div className="video-loading">
          <Loader2 className="video-spin" style={{ width: 24, height: 24 }} />
        </div>
      )}
      {error && (
        <div className="video-error">
          <AlertCircle style={{ width: 16, height: 16 }} />
          <span>Could not load video</span>
        </div>
      )}
      <video
        src={src}
        poster={poster ?? undefined}
        controls
        preload="metadata"
        style={{
          width: "100%",
          display: error ? "none" : "block",
          borderRadius: 6,
        }}
        onLoadedMetadata={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}

export function VideoNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as VideoAttrs;
  const blobUrlRef = useRef<string | null>(null);
  const [localSrc, setLocalSrc] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      // revoke previous blob
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      setLocalSrc(url);
      updateAttributes({ fileName: file.name });
    },
    [updateAttributes],
  );

  const handleUrl = useCallback(
    (url: string) => {
      blobUrlRef.current = null;
      setLocalSrc(null);
      updateAttributes({ src: url, fileName: null });
    },
    [updateAttributes],
  );

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const src = localSrc ?? attrs.src;

  return (
    <NodeViewWrapper>
      <div className="video-root" contentEditable={false}>
        {src ? (
          <VideoPlayer src={src} poster={attrs.poster} />
        ) : (
          <VideoEmpty onFile={handleFile} onUrl={handleUrl} />
        )}
        <input
          className="video-caption"
          placeholder="Add a caption…"
          value={attrs.caption}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
    </NodeViewWrapper>
  );
}
