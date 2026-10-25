import { useState, useRef, useCallback } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Loader2,
  AlertCircle,
} from "src/components/icons";

import type { AudioAttrs } from "./types";
import type { AudioOptions } from "./audio-node";
import { useAudioPlayer } from "./use-audio-player";
import { MediaUploadCard } from "src/components/tiptap-node/media-upload-card";
import "./audio-node-view.scss";

const FORMATS = "MP3, WAV, M4A or OGG";
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|webm)(?:$|[?#])/i;

// Any web link can be tried; a known audio extension gets a clearer label.
function checkAudioLink(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return AUDIO_EXT.test(u.pathname)
      ? "Audio file"
      : "Link: we'll try to play it";
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────────────────────

interface ProgressBarProps {
  progress: number;
  onSeek: (p: number) => void;
}

function ProgressBar({ progress, onSeek }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(p);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons !== 1) return;
    handleClick(e);
  };

  return (
    <div
      ref={barRef}
      className="audio-progress"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    >
      <div className="audio-progress-track">
        <div
          className="audio-progress-fill"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="audio-progress-thumb"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Volume control
// ─────────────────────────────────────────────────────────────────────────────

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
}

function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const [showSlider, setShowSlider] = useState(false);

  return (
    <div
      className="audio-volume"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <button
        className="audio-icon-btn"
        onClick={onToggleMute}
        aria-label="Toggle mute"
      >
        {isMuted || volume === 0 ? (
          <VolumeX style={{ width: 14, height: 14 }} />
        ) : (
          <Volume2 style={{ width: 14, height: 14 }} />
        )}
      </button>

      {showSlider && (
        <div className="audio-volume-slider-wrap">
          <input
            type="range"
            className="audio-volume-slider"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player — shown when src is set
// ─────────────────────────────────────────────────────────────────────────────

interface AudioPlayerProps {
  src: string;
  fileName: string | null;
  /** Clears the audio so the block shows the upload card again. */
  onReplace?: () => void;
}

function AudioPlayer({ src, fileName, onReplace }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const player = useAudioPlayer(src, audioRef);

  return (
    <div className="audio-player">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Left — play/pause */}
      <button
        className="audio-play-btn"
        onClick={player.toggle}
        aria-label={player.isPlaying ? "Pause" : "Play"}
        disabled={player.hasError}
      >
        {player.isLoading ? (
          <Loader2 style={{ width: 16, height: 16 }} className="audio-spin" />
        ) : player.isPlaying ? (
          <Pause style={{ width: 16, height: 16 }} />
        ) : (
          <Play style={{ width: 16, height: 16 }} />
        )}
      </button>

      {/* Center — filename + progress + time */}
      <div className="audio-center">
        {fileName && <span className="audio-filename">{fileName}</span>}

        {player.hasError ? (
          <div className="audio-error">
            <AlertCircle style={{ width: 13, height: 13 }} />
            <span>Could not load audio</span>
          </div>
        ) : (
          <ProgressBar progress={player.progress} onSeek={player.seek} />
        )}

        <div className="audio-time">
          <span>{player.formattedCurrent}</span>
          <span className="audio-time-sep">/</span>
          <span>{player.formattedDuration}</span>
        </div>
      </div>

      {/* Right — speed, volume, replace */}
      <button
        className="audio-rate-btn"
        onClick={player.cycleRate}
        aria-label={`Playback speed ${player.playbackRate}×, change`}
        title="Playback speed"
      >
        {player.playbackRate}×
      </button>
      <VolumeControl
        volume={player.volume}
        isMuted={player.isMuted}
        onVolumeChange={player.setVolume}
        onToggleMute={player.toggleMute}
      />
      {onReplace && (
        <button className="audio-replace-btn" onClick={onReplace}>
          Replace
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AudioNodeView
// ─────────────────────────────────────────────────────────────────────────────

export function AudioNodeView({
  node,
  updateAttributes,
  extension,
  editor,
}: NodeViewProps) {
  const attrs = node.attrs as AudioAttrs;
  const editable = editor.isEditable;
  const options = extension.options as AudioOptions;

  // Uploads finish before the file goes into the page, so the page never
  // holds a link that only works in this browser.
  const handleDone = useCallback(
    ({ src, fileName }: { src: string; fileName?: string | null }) =>
      updateAttributes({ src, fileName: fileName ?? null }),
    [updateAttributes],
  );

  const handleCaptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateAttributes({ caption: e.target.value });
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper>
      <div className="audio-root" contentEditable={false}>
        {attrs.src ? (
          <AudioPlayer
            src={attrs.src}
            fileName={attrs.fileName}
            onReplace={
              editable
                ? () => updateAttributes({ src: null, fileName: null })
                : undefined
            }
          />
        ) : editable ? (
          <MediaUploadCard
            options={options}
            noun="audio"
            icon={Music}
            mimePrefix="audio/"
            formats={FORMATS}
            alternative="paste a link to it"
            linkLabel="Audio link"
            linkPlaceholder="https://example.com/episode.mp3"
            linkHint={`A link to an ${FORMATS} file`}
            linkInvalid="Paste a full web link, starting with https://"
            checkLink={checkAudioLink}
            onDone={handleDone}
          />
        ) : null}

        {/* Caption */}
        {attrs.src && (editable || attrs.caption) && (
          <input
            className="audio-caption"
            placeholder="Add a caption..."
            value={attrs.caption}
            readOnly={!editable}
            onChange={handleCaptionChange}
            onKeyDown={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}
