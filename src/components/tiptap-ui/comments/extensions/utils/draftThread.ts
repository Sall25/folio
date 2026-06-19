import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey } from "../comment-thread-extension";
import type { ID } from "src/types";

// Mark a thread as drafted
export function draftThread(editor: Editor, pageId: ID) {
  const { from, to } = editor.state.tr.selection;

  const threadId = crypto.randomUUID();

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, {
      type: "draftThread",
      from,
      to,
      threadId,
      pageId,
    }),
  );
  console.log("dispatched");
}
