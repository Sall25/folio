import type { Editor, JSONContent } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";

// Finding a pinned block by its id (UniqueID), in a saved page or in the open
// editor, and making a copy of one to put in another page.

/** The block with this id in a saved document, or null. */
export function findBlock(
  doc: JSONContent | null | undefined,
  id: string,
): JSONContent | null {
  if (!doc) return null;
  const walk = (node: JSONContent): JSONContent | null => {
    if (node.attrs?.id === id) return node;
    for (const child of node.content ?? []) {
      const hit = walk(child);
      if (hit) return hit;
    }
    return null;
  };
  return walk(doc);
}

/** The block with this id in the open editor, with its position. */
export function findLive(
  editor: Editor,
  id: string,
): { node: PMNode; pos: number } | null {
  let found: { node: PMNode; pos: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.attrs.id === id) {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found;
}

/** A copy to insert: without the ids (UniqueID gives new ones, so the copy
 *  never takes the original's place in pins) and without the pins. */
export function asCopy(json: JSONContent): JSONContent {
  const strip = (node: JSONContent): JSONContent => {
    const out: JSONContent = { ...node };
    if (node.attrs) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, pinSide: _side, pinTop: _top, ...rest } = node.attrs;
      out.attrs = rest;
    }
    if (node.content) out.content = node.content.map(strip);
    return out;
  };
  return strip(json);
}
