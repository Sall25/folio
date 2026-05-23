/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Youtube, Link } from "lucide-react";
import {
  getEmbedUrlFromYoutubeUrl,
  isValidYoutubeUrl,
} from "@tiptap/extension-youtube";
import "./youtube-node-view.scss";

function YoutubeEmpty({ onUrl }: { onUrl: (url: string) => void }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    const url = draft.trim();
    if (!url) return;
    if (!isValidYoutubeUrl(url)) {
      setError(true);
      return;
    }
    onUrl(url);
  };

  return (
    <div className="youtube-empty">
      <Youtube
        style={{ width: 28, height: 28 }}
        className="youtube-empty-icon"
      />
      <span className="youtube-empty-label">Embed a YouTube video</span>

      <div className="youtube-url-row">
        <input
          className="youtube-url-input"
          placeholder="Paste YouTube URL…"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") handleSubmit();
          }}
          autoFocus
        />
        <button
          className="youtube-url-submit"
          onClick={handleSubmit}
          disabled={!draft.trim()}
        >
          <Link style={{ width: 13, height: 13 }} />
          Embed
        </button>
      </div>

      {error && (
        <span className="youtube-url-error">Not a valid YouTube URL</span>
      )}

      <span className="youtube-empty-sub">
        Supports youtube.com, youtu.be, and YouTube Music links
      </span>
    </div>
  );
}

function YoutubePlayer({
  src,
  width,
  height,
  start,
  options,
}: {
  src: string;
  width: number;
  height: number;
  start: number;
  options: Record<string, any>;
}) {
  const embedUrl = getEmbedUrlFromYoutubeUrl({
    url: src,
    allowFullscreen: options.allowFullscreen,
    autoplay: options.autoplay,
    ccLanguage: options.ccLanguage,
    ccLoadPolicy: options.ccLoadPolicy,
    controls: options.controls,
    disableKBcontrols: options.disableKBcontrols,
    enableIFrameApi: options.enableIFrameApi,
    endTime: options.endTime,
    interfaceLanguage: options.interfaceLanguage,
    ivLoadPolicy: options.ivLoadPolicy,
    loop: options.loop,
    modestBranding: options.modestBranding,
    nocookie: options.nocookie,
    origin: options.origin,
    playlist: options.playlist,
    progressBarColor: options.progressBarColor,
    startAt: start || 0,
    rel: options.rel,
  });

  if (!embedUrl) return null;

  return (
    <div className="youtube-player">
      <iframe
        src={embedUrl}
        width={width}
        height={height}
        allowFullScreen={options.allowFullscreen}
        style={{
          width: "100%",
          border: "none",
          borderRadius: 6,
          display: "block",
        }}
        title="YouTube video"
      />
    </div>
  );
}

export function YoutubeNodeView(props: NodeViewProps) {
  const { node, updateAttributes, extension } = props;
  const { src, width, height, start } = node.attrs;

  const handleUrl = (url: string) => {
    updateAttributes({ src: url });
  };

  const handleClear = () => {
    updateAttributes({ src: null });
  };

  return (
    <NodeViewWrapper>
      <div className="youtube-root" contentEditable={false}>
        {src ? (
          <>
            <YoutubePlayer
              src={src}
              width={width ?? extension.options.width}
              height={height ?? extension.options.height}
              start={start ?? 0}
              options={extension.options}
            />
            <button className="youtube-clear-btn" onClick={handleClear}>
              Change video
            </button>
          </>
        ) : (
          <YoutubeEmpty onUrl={handleUrl} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
