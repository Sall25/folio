import type { Page } from "src/components/tiptap-templates/simple/types";

export function flattenPages(pages: Page[]): Page[] {
  return pages.flatMap((p) => [p, ...flattenPages(p.children ?? [])]);
}
