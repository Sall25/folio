import { useCallback, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { AlertCircle, Loader2, Video } from "src/components/icons";
import { Button } from "src/components/tiptap-ui-primitive/button";
import type { VideoAttrs } from "./types";
import type { VideoOptions } from "./video-node";
import { parseVideoUrl, videoSourceOf } from "./video-embed";
import { MediaUploadCard } from "src/components/tiptap-node/media-upload-card";
import "./video-node-view.scss";

const FORMATS = "MP4, WEBM or MOV";
const PROVIDERS = "YouTube, Vimeo or Loom";
const PROVIDER_LABEL = {
  youtube: "YouTube video",
  vimeo: "Vimeo video",
  loom: "Loom video",
  file: "Video file",
} as const;

// ── Filled block: the player ────────────────────────────────────────────────

function VideoFile({ src, poster }: { src: string; poster: string | null }) {
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
          <span>Could not load this video</span>
        </div>
      )}
      <video
        src={src}
        poster={poster ?? undefined}
        controls
        preload="metadata"
        playsInline
        style={{ display: error ? "none" : "block" }}
        onLoadedMetadata={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}

export function VideoNodeView({
  node,
  updateAttributes,
  extension,
  editor,
}: NodeViewProps) {
  const attrs = node.attrs as VideoAttrs;
  const editable = editor.isEditable;
  const options = extension.options as VideoOptions;

  const onDone = useCallback(
    (next: { src: string; fileName?: string | null }) => updateAttributes(next),
    [updateAttributes],
  );

  if (!attrs.src) {
    return (
      <NodeViewWrapper className="video-node" contentEditable={false}>
        {editable ? (
          <MediaUploadCard
            options={options}
            noun="video"
            icon={Video}
            mimePrefix="video/"
            formats={FORMATS}
            alternative={`put it on ${PROVIDERS} and paste the link`}
            linkLabel="Video link"
            linkPlaceholder="https://www.youtube.com/watch?v=…"
            linkHint={`${PROVIDERS}, or a link to an ${FORMATS} file`}
            linkInvalid={`That link isn't a video we can play. Use a ${PROVIDERS} link, or a direct link to an ${FORMATS} file.`}
            checkLink={(url) => {
              const parsed = parseVideoUrl(url);
              return parsed ? PROVIDER_LABEL[parsed.provider] : null;
            }}
            onDone={onDone}
          />
        ) : null}
      </NodeViewWrapper>
    );
  }

  const source = videoSourceOf(attrs.src);

  return (
    <NodeViewWrapper className="video-node" contentEditable={false}>
      <div className="video-frame">
        {source.provider === "file" ? (
          <VideoFile src={source.src} poster={attrs.poster} />
        ) : (
          <div className="video-embed">
            <iframe
              src={source.src}
              title={attrs.caption || `${source.provider} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
            />
          </div>
        )}

        {editable && (
          <div className="video-actions">
            <Button
              type="button"
              variant="ghost"
              size="small"
              className="video-actions__btn"
              onClick={() =>
                updateAttributes({ src: null, fileName: null, poster: null })
              }
            >
              <span className="tiptap-button-text">Replace</span>
            </Button>
          </div>
        )}
      </div>

      {(editable || attrs.caption) && (
        <input
          className="video-caption"
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
