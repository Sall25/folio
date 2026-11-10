import type { JSONContent } from "@tiptap/core";

/** A stored description as a document: JSON as is, old text as paragraphs. */
export function descriptionDoc(
  value: JSONContent | string | null | undefined,
): JSONContent | null {
  if (!value) return null;
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return null;
  return {
    type: "doc",
    content: text.split(/\n+/).map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    })),
  };
}

/** Whether a description has anything in it. */
export function hasDescription(
  value: JSONContent | string | null | undefined,
): boolean {
  const doc = descriptionDoc(value);
  if (!doc) return false;
  const walk = (n: JSONContent): boolean =>
    (n.type === "text" && !!n.text?.trim()) ||
    (n.type !== "doc" && n.type !== "paragraph" && n.type !== "text") ||
    (n.content ?? []).some(walk);
  return walk(doc);
}
