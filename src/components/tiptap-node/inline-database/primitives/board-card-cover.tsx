/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from "src/components/tiptap-templates/simple/types";
import { GRADIENT_PRESETS } from "src/components/tiptap-ui/cover/gradient-presets";

interface BoardCardCoverProps {
  page: Page | null;
  recordId: string;
  height?: number;
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
}: BoardCardCoverProps) {
  const cover = page?.cover;
  const coverImage = cover?.coverImage;
  const gradient = (cover as any)?.gradient as string | undefined;
  const positionY = (cover as any)?.positionY ?? 50;

  // Image cover. The wrapper is the positioning context (position: relative)
  // and clips the absolutely-positioned image (overflow: hidden), so a wide
  // natural image can never push the card past its grid track.
  if (coverImage) {
    return (
      <div
        className="db-board-card__cover"
        style={{
          height,
          position: "relative",
          width: "100%",
          overflow: "hidden",
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

  // Gradient cover
  if (gradient) {
    return (
      <div
        className="db-board-card__cover"
        style={{
          background: gradient,
          height,
          width: "100%",
        }}
      />
    );
  }

  // Placeholder — deterministic gradient from record id
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