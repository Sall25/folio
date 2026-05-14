/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from "src/components/tiptap-templates/simple/types";
import { getPlaceholderColor } from "../utils";

interface BoardCardCoverProps {
  page: Page | null;
  recordId: string;
}

export function BoardCardCover({ page, recordId }: BoardCardCoverProps) {
  const cover = page?.cover;
  const coverImage = cover?.coverImage;
  const gradient = (cover as any)?.gradient as string | undefined;
  const positionY = (cover as any)?.positionY ?? 50;

  // Image cover
  if (coverImage) {
    return (
      <div className="db-board-card__cover">
        <img
          src={coverImage}
          alt="cover"
          draggable={false}
          className="db-board-card__cover-img"
          style={{
            // Mirror exactly what CoverImage does:
            // height: 200%, top offset by positionY
            top: `${-(positionY / 100) * 50}%`,
          }}
        />
      </div>
    );
  }

  // Gradient cover
  if (gradient) {
    return (
      <div className="db-board-card__cover" style={{ background: gradient }} />
    );
  }

  // Placeholder — deterministic color from record id, matching Notion
  return (
    <div
      className="db-board-card__cover"
      style={{ background: getPlaceholderColor(recordId) }}
    />
  );
}
