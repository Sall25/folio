import type { Editor } from "@tiptap/core";
import type { Thread } from "src/types";
import { commentThreadPluginKey } from "./extensions";

// Bringing a comment thread's text into view in the page, with a short
// flash: the comments pane and the page chat ("See in page") both use it.

const FLASH_MS = 1600;

// Scroll the page to an inline thread's text and flash it.
//   • Open threads have a highlight (decoration spans): select the thread in
//     the plugin (full-yellow "selected" state), scroll the first span into
//     view, and flash every span of it.
//   • Resolved threads have no highlight: scroll to the anchored text itself
//     and flash the block that contains it.
export function scrollToAnchor(editor: Editor, thread: Thread) {
  if (editor.isDestroyed) return;
  const root = editor.view.dom;
  const hasHighlight = !!root.querySelector(`[data-thread-id="${thread.id}"]`);

  if (hasHighlight) {
    // Select first: the plugin redraws its decorations on this transaction,
    // so the spans are looked up AFTER it (ProseMirror updates synchronously).
    editor.view.dispatch(
      editor.state.tr.setMeta(commentThreadPluginKey, {
        type: "selectThread",
        threadId: thread.id,
      }),
    );
    const spans = Array.from(
      root.querySelectorAll<HTMLElement>(`[data-thread-id="${thread.id}"]`),
    );
    spans[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
    flash(spans);
    return;
  }

  // No highlight (resolved): use the live anchor if the plugin has it,
  // otherwise the stored one, clamped into the document.
  const live =
    commentThreadPluginKey
      .getState(editor.state)
      ?.threads.find((th) => th.id === thread.id)?.anchor ?? thread.anchor;
  if (!live) return;
  const size = editor.state.doc.content.size;
  const pos = Math.max(0, Math.min(live.from, size));
  let el: HTMLElement | null = null;
  try {
    const { node } = editor.view.domAtPos(pos);
    el = node instanceof HTMLElement ? node : node.parentElement;
  } catch {
    return;
  }
  const block =
    el?.closest<HTMLElement>("[data-id], p, h1, h2, h3, li, blockquote") ?? el;
  if (!block) return;
  block.scrollIntoView({ behavior: "smooth", block: "center" });
  flash([block]);
}

// A short pulse so the eye finds the target after the scroll.
export function flash(els: HTMLElement[]) {
  for (const el of els) {
    el.classList.remove("comment-target-flash");
    void el.offsetWidth; // restart the animation if it's already running
    el.classList.add("comment-target-flash");
  }
  window.setTimeout(() => {
    for (const el of els) el.classList.remove("comment-target-flash");
  }, FLASH_MS);
}
