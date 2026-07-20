/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef } from "react";
import type { Page } from "src/types";
import { GRADIENT_PRESETS } from "src/components/tiptap-ui/cover/gradient-presets";

interface BoardCardCoverProps {
  page: Page | null;
  recordId: string;
  height?: number;
  /** Drag-to-reposition mode — only meaningful for image covers. */
  repositioning?: boolean;
  onPositionChange?: (positionY: number) => void;
}

function getPlaceholderGradient(recordId: string): string {
  let hash = 0;
  for (let i = 0; i < recordId.length; i++) {
    hash = recordId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PRESETS.length;
  return GRADIENT_PRESETS[index].value;
}

export function BoardCardCover({
  page,
  recordId,
  height = 130,
  repositioning = false,
  onPositionChange,
}: BoardCardCoverProps) {
  const cover = page?.cover;
  const coverImage = cover?.coverImage;
  const gradient = (cover as any)?.gradient as string | undefined;
  const positionY = (cover as any)?.positionY ?? 50;

  const dragRef = useRef<{ startY: number; startPos: number } | null>(null);

  // Vertical drag maps 1:1 onto positionY across the cover's height. The image
  // is rendered at 200% height, so the full 0–100 range covers exactly the
  // hidden overflow — dragging the cover's height traverses all of it.
  const onPointerDown = (e: React.PointerEvent) => {
    if (!repositioning || !onPositionChange) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startPos: positionY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !onPositionChange) return;
    const delta = ((e.clientY - drag.startY) / height) * 100;
    onPositionChange(Math.min(100, Math.max(0, drag.startPos + delta)));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
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
