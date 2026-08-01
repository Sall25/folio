import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey } from "../comments";
import { makeThread } from "src/utils/make-thread";
import type { ID, Thread } from "src/types";
import { newId } from "src/lib/id";

// Create a comment thread anchored to a whole BLOCK (node), for the floating/
// hover comment affordance on the drag handle. Mirrors draftThread (text
// selection) but spans the node at `pos`, and creates the DB thread directly so
// it works in BOTH display modes (the sidebar's draftThread handler only exists
// in sidebar mode).
export function draftNodeThread(
  editor: Editor,
  pos: number,
  pageId: ID,
  createThread: (t: Thread) => Promise<unknown>,
): string | null {
  if (pos < 0) return null;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return null;

  const from = pos;
  const to = pos + node.nodeSize;
  const threadId = newId();

  const thread = makeThread({
    id: threadId,
    pageId,
    anchor: { from, to },
    status: "drafted", 
  });

  createThread(thread).then(() => {
    editor.view.dispatch(
      editor.state.tr.setMeta(commentThreadPluginKey, {
        type: "draftThread",
        from,
        to,
        threadId,
        pageId,
      }),
    );
    editor.view.dispatch(
      editor.state.tr.setMeta(commentThreadPluginKey, {
        type: "selectThread",
        threadId,
      }),
    );
  });

  return threadId;
}
