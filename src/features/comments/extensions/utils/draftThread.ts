import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { getSelectedBlocks } from "src/lib/block-selection";
import { commentThreadPluginKey } from "../comment-thread-extension";
import type { ID } from "src/types";
import { newId } from "src/lib/id";

// Start a local draft on the selection — a comment, or a suggested
// replacement for the selected text.
//
// From the block (drag handle) menu the selection is the whole node. For a
// text block (paragraph, heading…) the range is narrowed to the text inside
// it, so the highlight sits on the text and accepting a suggestion replaces
// the text without flattening the block. Suggestions need text to replace:
// they're ignored on non-text blocks (image, database…) and on several
// blocks.
export function draftThread(
  editor: Editor,
  pageId: ID,
  kind: "comment" | "suggestion" = "comment",
) {
  const { selection } = editor.state;
  let { from, to } = selection;

  if (selection instanceof NodeSelection) {
    const node = selection.node;
    if (node.isTextblock) {
      from += 1;
      to -= 1;
    } else if (kind === "suggestion") {
      return;
    }
  }

  // A block selection (the drag handle selects blocks this way, even just
  // one). One block of text — a paragraph, a heading, or a block holding a
  // single one, like a list item — narrows to its text, for a comment or a
  // suggestion alike. Several blocks: from the start of the first block's
  // text to the end of the last one's (a range between blocks highlights
  // nothing); suggestions replace one piece of text, not several blocks.
  const blocks = getSelectedBlocks(selection);
  if (blocks) {
    const text = blocks.length === 1 ? textInside(blocks[0]) : null;
    if (text) {
      from = text.from;
      to = text.to;
    } else {
      if (kind === "suggestion") return;
      const between = TextSelection.between(
        editor.state.doc.resolve(from),
        editor.state.doc.resolve(to),
      );
      from = between.from;
      to = between.to;
    }
  }

  if (from >= to) return;

  const threadId = newId();

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, {
      type: "draftThread",
      from,
      to,
      threadId,
      pageId,
      kind,
    }),
  );
}

/** The text range of a block that is, or holds exactly one, block of text
 *  (a paragraph, a heading; a list item or a callout with one line).
 *  Null for anything else (an image, a database, several lines). */
function textInside({
  node,
  pos,
}: {
  node: PMNode;
  pos: number;
}): { from: number; to: number } | null {
  if (node.isTextblock) {
    return { from: pos + 1, to: pos + 1 + node.content.size };
  }
  const only = node.childCount === 1 ? node.firstChild : null;
  if (only?.isTextblock) {
    return { from: pos + 2, to: pos + 2 + only.content.size };
  }
  return null;
}
