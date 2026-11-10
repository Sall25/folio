import type { JSONContent } from "@tiptap/core";

/** The first image in a page's content, for a card with no cover of its own
 *  (gallery and board, like other workspace apps do). Skips images still uploading
 *  (blob: addresses only exist on the device that dropped them). Walks
 *  into columns, callouts, toggles… in document order. */
export function firstImageSrc(
  content: JSONContent | null | undefined,
): string | null {
  if (!content) return null;
  const stack: JSONContent[] = [content];
  while (stack.length) {
    const node = stack.shift()!;
    if (node.type === "image") {
      const src = node.attrs?.src;
      if (typeof src === "string" && src && !src.startsWith("blob:")) {
        return src;
      }
    }
    if (node.content?.length) stack.unshift(...node.content);
  }
  return null;
}
