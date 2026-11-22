import type { JSONContent } from "@tiptap/core";
import type { ID } from "src/types";

// The pages a page links to, read out of its own content.
//
// Folio writes a link as a node: pageLink carries the page's id, and a
// mention of a page carries it as the mention's id. Both are what a person
// means by "this page is connected to that one", which is the thing a graph
// is for — and neither needs a property to exist first.

const LINK_NODES = new Set(["pageLink", "mention"]);

/** Every page this content links to, each one once, in the order met. */
export function pageLinkIds(content: JSONContent | null | undefined): ID[] {
  if (!content) return [];
  const out: ID[] = [];
  const seen = new Set<ID>();
  const walk = (node: JSONContent) => {
    if (LINK_NODES.has(node.type ?? "")) {
      const attrs = (node.attrs ?? {}) as { pageId?: unknown; id?: unknown };
      const id = typeof attrs.pageId === "string" ? attrs.pageId : attrs.id;
      // A mention can be of a person or a date; only a page has an id that
      // points at another page.
      if (typeof id === "string" && id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(content);
  return out;
}
