import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey } from "../comment-thread-extension";
import type { ID } from "src/types";

// Mark a thread as submitted
export function submitThread(editor: Editor, content: string, pageId?: ID) {
  const pluginState = commentThreadPluginKey.getState(editor.state);
  const draft = pluginState?.threads.find((t) => t.status === "drafted");
  if (!draft) return;

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, {
      type: "submitThread",
      content,
      threadId: draft.id,
      pageId,
    }),
  );
}
