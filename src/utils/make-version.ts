import { newId } from "src/lib/id";
import type { Version, Page, ID } from "src/types";
import type { JSONContent } from "@tiptap/core";

export function makeVersion(opts: {
  pageId: ID;
  title: string;
  content: JSONContent | null;
  name?: string;
}): Version {
  return {
    id: newId(),
    pageId: opts.pageId,
    title: opts.title,
    content: opts.content ? structuredClone(opts.content) : null,
    name: opts.name ?? null,
    createdAt: Date.now(),
  };
}

// snapshot a page's current state as a version
export function makeVersionFromPage(
  page: Page,
  opts?: {
    name?: string;
  },
): Version {
  return makeVersion({
    pageId: page.id,
    title: page.title,
    content: page.content,
    name: opts?.name,
  });
}
