import type { Page } from "src/components/tiptap-templates/simple/types";
import { flattenPages } from "./flatten-pages";

export function buildBreadcrumb(activePage: Page, pages: Page[]): Page[] {
  const flatPages = flattenPages(pages);
  const trail: Page[] = [];

  let current: Page | undefined = activePage;
  while (current) {
    trail.unshift(current);
    current = current.parentId
      ? flatPages.find((p) => String(p.id) === String(current!.parentId))
      : undefined;
  }

  return trail;
}
