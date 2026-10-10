import type { Editor, JSONContent } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";

// The bit of text a notification quotes so it can be understood without
// opening the page: the sentence a mention or a reminder date sits in, or
// the comment a person was mentioned in.

/** Characters kept on each side of the mention. */
const SIDE = 70;
/** Longest quote taken from a comment. */
const COMMENT_MAX = 200;

const collapse = (s: string) => s.replace(/\s+/g, " ");

function shortDate(iso: unknown): string | null {
  if (typeof iso !== "string" || !iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** How a mention reads in text: "@Name", a page's title, or a date. */
function mentionText(attrs: Record<string, unknown>): string {
  const date = shortDate(attrs.date);
  if (date) return date;
  const label = typeof attrs.label === "string" ? attrs.label : "";
  return label ? `@${label}` : "";
}

const leafText = (node: PMNode) =>
  node.type.name === "mention"
    ? mentionText(node.attrs)
    : node.type.name === "hardBreak"
      ? " "
      : "";

/** Keeps the last `max` characters, cut at a word, with "…" in front. */
function keepEnd(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(s.length - max);
  const space = cut.indexOf(" ");
  return "…" + (space > 0 && space < 20 ? cut.slice(space + 1) : cut);
}

/** Keeps the first `max` characters, cut at a word, with "…" after. */
function keepStart(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max - 20 ? cut.slice(0, space) : cut) + "…";
}

/**
 * The text around the inline node at `pos` (a mention or a date chip), in
 * its paragraph: up to SIDE characters before and after it. Empty when
 * there's no text around it.
 */
export function textAroundNode(editor: Editor, pos: number): string {
  if (editor.isDestroyed) return "";
  const { doc } = editor.state;
  if (pos < 0 || pos > doc.content.size) return "";
  const node = doc.nodeAt(pos);
  if (!node) return "";
  const $pos = doc.resolve(pos);
  const parent = $pos.parent;
  if (!parent.isTextblock) return "";
  const offset = $pos.parentOffset;

  const before = collapse(
    parent.textBetween(0, offset, " ", leafText),
  ).trimStart();
  const after = collapse(
    parent.textBetween(
      Math.min(offset + node.nodeSize, parent.content.size),
      parent.content.size,
      " ",
      leafText,
    ),
  ).trimEnd();
  if (!before.trim() && !after.trim()) return "";
  return (
    keepEnd(before, SIDE) +
    leafText(node) +
    keepStart(after, SIDE)
  ).trim();
}

/** A comment's text (mentions as "@Name"), shortened for a notification. */
export function commentText(json: JSONContent | null | undefined): string {
  const parts: string[] = [];
  const walk = (node: JSONContent | undefined) => {
    if (!node) return;
    if (node.type === "text" && node.text) parts.push(node.text);
    else if (node.type === "mention") parts.push(mentionText(node.attrs ?? {}));
    else if (node.type === "hardBreak") parts.push(" ");
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
      // Blocks (paragraphs…) read as separate sentences.
      if (node.type !== "doc" && node.type !== "text") parts.push(" ");
    }
  };
  walk(json ?? undefined);
  return keepStart(collapse(parts.join("")).trim(), COMMENT_MAX);
}
