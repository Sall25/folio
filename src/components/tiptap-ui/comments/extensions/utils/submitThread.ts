import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey } from "../comment-thread-extension";
import type { ID } from "src/types";

// Mark a thread as submitted
export function submitThread(editor: Editor, content: string, pageId?: ID) {
  const { draftId } = editor.storage.commentThreadExtension;
  console.log("submitThread before", draftId);
  if (!draftId) return;

  console.log("submitThread after");

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, {
      type: "submitThread",
      content,
      threadId: draftId,
      pageId,
    }),
  );
}
