import { useEffect, useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/core";
import type { ID, Thread } from "src/types";
import { useSyncThreadsToEditor } from "../hooks/use-sync-threads-to-editor";
import { scrollToAnchor } from "../scroll-to-thread";

// Opening a page in the side or centre peek at a comment thread (the page
// chat's "See in page"). The chat leaves the thread here; the peek's editor
// shows the page's comment highlights and, once its document is in,
// scrolls to that thread and flashes it.

let pending: { pageId: ID; thread: Thread } | null = null;
const listeners = new Set<() => void>();

export function focusThreadInPeek(pageId: ID, thread: Thread) {
  pending = { pageId, thread };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** In a peek's editor (page-peek-view.tsx, page-center-view.tsx). */
export function usePeekThreadFocus(editor: Editor | null, pageId: ID) {
  // The page's comment highlights, as on the full page.
  useSyncThreadsToEditor(editor, pageId);

  const target = useSyncExternalStore(subscribe, () => pending);
  useEffect(() => {
    if (!editor || !target || target.pageId !== pageId) return;
    // Let the document and the highlights land, then scroll.
    const id = window.setTimeout(() => {
      if (editor.isDestroyed) return;
      scrollToAnchor(editor, target.thread);
      if (pending === target) pending = null;
    }, 250);
    return () => window.clearTimeout(id);
  }, [editor, target, pageId]);
}
