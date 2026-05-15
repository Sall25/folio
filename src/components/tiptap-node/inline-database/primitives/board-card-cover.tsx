/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from "src/components/tiptap-templates/simple/types";
import { getPlaceholderColor } from "../utils";

interface BoardCardCoverProps {
  page: Page | null;
  recordId: string;
  height?: number;
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

  // Image cover
  if (coverImage) {
    return (
      <div className="db-board-card__cover" style={{ height }}>
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
        style={{ background: gradient, height }}
      />
    );
  }

  console.log("recordId:", recordId, "color:", getPlaceholderColor(recordId));

  // Placeholder — deterministic color from record id, matching Notion
  return (
    <div
      className="db-board-card__placeholder"
      style={{ background: getPlaceholderColor(recordId), height }}
    />
  );
}
