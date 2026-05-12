import { useState, useRef, useCallback, useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Link,
  Loader2,
  AlertCircle,
} from "lucide-react";

import type { AudioAttrs } from "./types";
import { useAudioPlayer } from "./use-audio-player";
import "./audio-node-view.scss";

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
}

function AudioPlayer({ src, fileName }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const player = useAudioPlayer(src, audioRef);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return; // guard against edge cases (StrictMode double-invoke, unmount race, etc.)

    // safe to use audio here
  }, [src]);

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

      {/* Right — volume */}
      <VolumeControl
        volume={player.volume}
        isMuted={player.isMuted}
        onVolumeChange={player.setVolume}
        onToggleMute={player.toggleMute}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state — upload or URL
// ─────────────────────────────────────────────────────────────────────────────

interface AudioEmptyProps {
  onFile: (file: File) => void;
  onUrl: (url: string) => void;
}

function AudioEmpty({ onFile, onUrl }: AudioEmptyProps) {
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
      <div className="audio-empty">
        <div className="audio-url-row">
          <input
            className="audio-url-input"
            placeholder="Paste audio URL..."
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
            className="audio-url-submit"
            onClick={handleUrlSubmit}
            disabled={!urlDraft.trim()}
          >
            Embed
          </button>
          <button className="audio-url-cancel" onClick={() => setMode("pick")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="audio-empty"
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith("audio/")) onFile(file);
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <Music style={{ width: 22, height: 22 }} className="audio-empty-icon" />
      <span className="audio-empty-label">Add audio</span>
      <span className="audio-empty-sub">
        Drag & drop or <span className="audio-empty-link">choose a file</span>
      </span>

      <button
        className="audio-embed-btn"
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

// ─────────────────────────────────────────────────────────────────────────────
// AudioNodeView
// ─────────────────────────────────────────────────────────────────────────────

export function AudioNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as AudioAttrs;

  const handleFile = useCallback(
    (file: File) => {
      // Create a local object URL — in production you'd upload and get a real URL
      const url = URL.createObjectURL(file);
      updateAttributes({ src: url, fileName: file.name });
    },
    [updateAttributes],
  );

  const handleUrl = useCallback(
    (url: string) => {
      updateAttributes({ src: url, fileName: null });
    },
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
          <AudioPlayer src={attrs.src} fileName={attrs.fileName} />
        ) : (
          <AudioEmpty onFile={handleFile} onUrl={handleUrl} />
        )}

        {/* Caption */}
        <input
          className="audio-caption"
          placeholder="Add a caption..."
          value={attrs.caption}
          onChange={handleCaptionChange}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
    </NodeViewWrapper>
  );
}
