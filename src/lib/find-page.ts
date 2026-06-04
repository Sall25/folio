import type { Page } from "src/components/tiptap-templates/simple/types";

export function findPage(pages: Page[], id: number): Page | undefined {
  for (const page of pages) {
    if (page.id === id) return page;
    if (page.children?.length) {
      const found = findPage(page.children, id);
      if (found) return found;
    }
  }
}

export function findPageFlat(list: Page[], id: number): Page | null {
  for (const p of list) {
    if (p.id === id) return p;
    if (p.children?.length) {
      const found = findPageFlat(p.children, id);
      if (found) return found;
    }
  }
  return null;
}
