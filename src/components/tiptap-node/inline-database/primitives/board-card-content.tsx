import type { Page } from "src/types";
import { getPageExcerpt } from "src/lib/get-page-excerpt";

interface BoardCardContentProps {
  page: Page | null;
}

export function BoardCardContent({ page }: BoardCardContentProps) {
  if (!page) return null;

  const excerpt = getPageExcerpt(page);
  if (!excerpt) return null;

  return <p className="db-board-card__content-preview">{excerpt}</p>;
}
