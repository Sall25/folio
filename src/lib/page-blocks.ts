import type { JSONContent } from "@tiptap/core";

// The shared block and its neighbours, read from a page's content JSON —
// for the chat's block side view.

export interface BlockContext {
  /** Nearest non-empty block before it (null at the start). */
  before: string | null;
  /** The block's current text; null when it's no longer on the page. */
  text: string | null;
  /** Nearest non-empty block after it. */
  after: string | null;
}

interface FlatBlock {
  id: string | null;
  text: string;
}

function allText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  const children = node.content ?? [];
  const inline = children.some(
    (c) => c.type === "text" || c.type === "hardBreak",
  );
  // Inline children join directly; block children get a space between them.
  return children.map(allText).join(inline ? "" : " ");
}

function hasInlineChildren(node: JSONContent): boolean {
  return (node.content ?? []).some(
    (c) => c.type === "text" || c.type === "hardBreak",
  );
}

// Reading-order list of blocks. A node with its own id is one block (its
// children belong to it); other text blocks are included for context.
function flatten(doc: JSONContent | undefined): FlatBlock[] {
  const out: FlatBlock[] = [];
  const walk = (node: JSONContent) => {
    const ownId =
      typeof node.attrs?.id === "string" ? (node.attrs.id as string) : null;
    if (ownId || hasInlineChildren(node)) {
      const text = allText(node).replace(/\s+/g, " ").trim();
      if (text || ownId) out.push({ id: ownId, text });
      return;
    }
    for (const child of node.content ?? []) walk(child);
  };
  if (doc) walk(doc);
  return out;
}

export function blockContext(
  doc: JSONContent | undefined,
  blockId: string,
): BlockContext {
  const blocks = flatten(doc);
  const i = blocks.findIndex((b) => b.id === blockId);
  if (i === -1) return { before: null, text: null, after: null };

  let before: string | null = null;
  for (let j = i - 1; j >= 0; j--) {
    if (blocks[j].text) {
      before = blocks[j].text;
      break;
    }
  }
  let after: string | null = null;
  for (let j = i + 1; j < blocks.length; j++) {
    if (blocks[j].text) {
      after = blocks[j].text;
      break;
    }
  }
  return { before, text: blocks[i].text, after };
}
