import type { Editor } from "@tiptap/core";
import { commentThreadPluginKey, type CommentThreadState } from "../comment-thread-extension";

export function getCommentThreadState(editor: Editor): CommentThreadState {
  const state = editor.state

  const data = commentThreadPluginKey.getState(state) as (CommentThreadState | null)

  if (!data) {
    return {
      threads: [],
      measuredThreads: [],
      positionedThreads: [],
      selectedThreads: [],
      selectedThread: null,
      threadId: null
    }
  }

  return data
}