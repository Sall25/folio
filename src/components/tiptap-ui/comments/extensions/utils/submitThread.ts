import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey } from "../comment-thread-extension";

// Mark a thread as submitted
export function submitThread(editor: Editor, content: string, pageId?: number) {
  const { draftId } = editor.storage.commentThreadExtension;

  if (!draftId) return;

  editor.view.dispatch(
    editor.state.tr.setMeta(commentThreadPluginKey, {
      type: "submitThread",
      content,
      threadId: draftId,
      pageId,
    }),
  );
}
