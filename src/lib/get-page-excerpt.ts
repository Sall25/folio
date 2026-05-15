/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from "src/components/tiptap-templates/simple/types";

export function getPageExcerpt(page: Page): string {
  try {
    const nodes = (page.content?.content as any[]) ?? [];
    for (const node of nodes) {
      // Skip the title node (always first)
      if (node.type === "title") continue;

      if (node.type === "paragraph" && node.content?.length) {
        const text = node.content
          .filter((n: any) => n.type === "text")
          .map((n: any) => n.text as string)
          .join("");
        if (text.trim()) return text;
      }

      // Also extract from headings
      if (node.type === "heading" && node.content?.length) {
        const text = node.content
          .filter((n: any) => n.type === "text")
          .map((n: any) => n.text as string)
          .join("");
        if (text.trim()) return text;
      }
    }
  } catch {
    // ignore malformed content
  }
  return "";
}
