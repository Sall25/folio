/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useRef, useState } from "react";
import type { Page } from "src/types";
import { GRADIENT_PRESETS } from "src/features/pages/cover/gradient-presets";
import { firstImageSrc } from "../utils/first-image";

interface BoardCardCoverProps {
  page: Page | null;
  recordId: string;
  height?: number;
  fit?: "cover" | "contain";
  /** Drag-to-reposition mode — only meaningful for image covers. */
  repositioning?: boolean;
  onPositionChange?: (positionY: number) => void;
  onPositionCommit?: () => void;
}

function getPlaceholderGradient(recordId: string): string {
  let hash = 0;
  for (let i = 0; i < recordId.length; i++) {
    hash = recordId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PRESETS.length;
  return GRADIENT_PRESETS[index].value;
}

function BoardCardCoverImpl({
  page,
  recordId,
  height = 130,
  fit = "cover",
  repositioning = false,
  onPositionChange,
  onPositionCommit,
}: BoardCardCoverProps) {
  const cover = page?.cover;
  const gradient = (cover as any)?.gradient as string | undefined;
  // No cover of its own: the first image in the page, as Notion does.
  const coverImage =
    cover?.coverImage ||
    (gradient ? undefined : (firstImageSrc(page?.content) ?? undefined));

  const persistedY = (cover as { positionY?: number } | null)?.positionY ?? 50;

  // Live drag position. While dragging, this drives the visual every frame
  // (local, no network). When not dragging it's null, so we fall back to the
  // persisted value below. Derived — no effect syncing state.
  const [dragY, setDragY] = useState<number | null>(null);
  const positionY = dragY ?? persistedY;

  const dragRef = useRef<{ startY: number; startPos: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (!repositioning || !onPositionChange) return;
    e.stopPropagation(); // ← keep dnd-kit from starting a card drag
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { startY: e.clientY, startPos: positionY };
    setDragY(positionY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.stopPropagation(); // ← keep the move from reaching dnd-kit too
    const delta = ((e.clientY - drag.startY) / height) * 100;
    const next = Math.min(100, Math.max(0, drag.startPos + delta));
    setDragY(next);
    onPositionChange?.(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    // Flush the debounced write so the persisted value updates immediately,
    // then release local so the (now-current) prop takes over — no snap-back,
    // no effect.
    onPositionCommit?.();
    setDragY(null);
  };

  // Image cover. The wrapper is the positioning context (position: relative)
  // and clips the absolutely-positioned image (overflow: hidden), so a wide
  // natural image can never push the card past its grid track.
  if (coverImage) {
    return (
      <div
        className="db-board-card__cover"
        data-repositioning={repositioning || undefined}
        data-fit={fit}
        style={{
          height,
          position: "relative",
          width: "100%",
          overflow: "hidden",
          cursor: repositioning ? "ns-resize" : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          if (repositioning) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        <img
          src={coverImage}
          alt="cover"
          draggable={false}
          loading="lazy"
          decoding="async"
          className="db-board-card__cover-img"
          style={
            fit === "contain"
              ? {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center top",
                  margin: 0,
                  borderRadius: 0,
                  maxWidth: "none",
                }
              : {
                  position: "absolute",
                  width: "100%",
                  height: "200%",
                  objectFit: "cover",
                  top: `${-(positionY / 100) * 50}%`,
                  left: 0,
                  margin: 0,
                  borderRadius: 0,
                  maxWidth: "none",
                }
          }
        />
      </div>
    );
  }

  if (gradient) {
    return (
      <div
        className="db-board-card__cover"
        style={{ background: gradient, height, width: "100%" }}
      />
    );
  }

  return (
    <div
      className="db-board-card__placeholder"
      style={{
        background: getPlaceholderGradient(recordId),
        height,
        width: "100%",
      }}
    />
  );
}

export const BoardCardCover = memo(BoardCardCoverImpl);
