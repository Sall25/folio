import type { JSONContent } from "@tiptap/react";

// The first version of a page created on this device.
//
// Such a page opens before the server answers, against an empty document,
// and used to be given a skeleton ([title, empty paragraph]) so there was a
// title to type into offline. But the page's real content is seeded by the
// collab server, and the two meet in one of two ways:
//   • the skeleton arrives first, so the server finds a document that isn't
//     empty and never seeds — the page's blocks are lost for good;
//   • both are written, and the copies merge — every block twice.
// A title and empty paragraphs survive both (an extra title is dropped by
// the single-title rule, an empty paragraph is invisible), so the skeleton
// is written only for a page whose stored content holds nothing else.
// Anything more — a database block on a database's own page — waits for
// the server's copy.

export interface DocLike {
  childCount: number;
  firstChild: { type: { name: string }; content: { size: number } } | null;
}

/** Nothing in it yet: no content from the server, none from this device
 *  (an empty document is one empty paragraph, or nothing at all). */
export function isBlankDoc(doc: DocLike): boolean {
  if (doc.childCount === 0) return true;
  if (doc.childCount > 1) return false;
  const only = doc.firstChild;
  return (
    !!only && only.type.name === "paragraph" && only.content.size === 0
  );
}

const isEmptyBlock = (node: JSONContent): boolean => {
  if (node.type === "title") return true;
  if (node.type !== "paragraph") return false;
  return !node.content?.some((c) => (c.text ?? "").length > 0 || c.type !== "text");
};

/** Whether writing the skeleton can't lose or double anything: the page's
 *  stored content is a title and empty paragraphs, nothing else. */
export function canWriteSkeleton(content: JSONContent | null | undefined) {
  const blocks = content?.content;
  if (!blocks || blocks.length === 0) return true;
  return blocks.every(isEmptyBlock);
}

/** The skeleton: a title to type into, and a line under it. */
export function skeletonContent(title: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "title",
        content: title ? [{ type: "text", text: title }] : [],
      },
      { type: "paragraph" },
    ],
  };
}
