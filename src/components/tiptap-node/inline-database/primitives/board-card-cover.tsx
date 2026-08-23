/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useRef, useState } from "react";
import type { Page } from "src/types";
import { GRADIENT_PRESETS } from "src/components/tiptap-ui/cover/gradient-presets";

interface BoardCardCoverProps {
  page: Page | null;
  recordId: string;
  height?: number;
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
  repositioning = false,
  onPositionChange,
  onPositionCommit,
}: BoardCardCoverProps) {
  const cover = page?.cover;
  const coverImage = cover?.coverImage;
  const gradient = (cover as any)?.gradient as string | undefined;

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
          className="db-board-card__cover-img"
          style={{
            position: "absolute",
            width: "100%",
            height: "200%",
            objectFit: "cover",
            top: `${-(positionY / 100) * 50}%`,
            left: 0,
          }}
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
