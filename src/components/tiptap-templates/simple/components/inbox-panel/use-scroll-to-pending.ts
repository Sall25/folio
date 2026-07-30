import { useEffect } from "react";
import type { Editor } from "@tiptap/core";
import {
  consumePendingScrollTarget,
  subscribePendingScrollTarget,
} from "./pending-scroll-target";
import { commentThreadPluginKey } from "src/components/tiptap-ui/comments";

// Mount once where the editor lives. When a pending scroll target matches the
// current page, scrolls to and ACTIVATES the target thread/comment after the
// page has rendered. Handles inline threads (scroll to anchor + select),
// page-level comments (scroll to the page-comment node), and editor mentions.
export function useScrollToPendingTarget(
  editor: Editor | null,
  pageId: string | null,
) {
  useEffect(() => {
    if (!editor || !pageId) return;

    let tries = 0;
    let rafId: number | null = null;

    const attempt = (target: {
      targetNodeId?: string;
      type?: string;
    }): boolean => {
      // ── Inline thread: select it (opens the card) + scroll to its anchor. ──
      if (target.targetNodeId) {
        // Is this an inline thread? Ask the comment plugin.
        const pluginState = commentThreadPluginKey.getState(editor.state);
        const thread = pluginState?.threads.find(
          (t) => t.id === target.targetNodeId,
        );

        if (thread) {
          // Activate the thread (highlights decoration, opens the sidebar card).
          editor.view.dispatch(
            editor.state.tr.setMeta(commentThreadPluginKey, {
              type: "selectThread",
              threadId: target.targetNodeId,
            }),
          );
          // Scroll to the decoration in the doc, or the sidebar card.
          const el =
            document.querySelector(
              `[data-thread-id="${target.targetNodeId}"]`,
            ) ||
            document.querySelector(
              `[data-thread-list-item-id="${target.targetNodeId}"]`,
            );
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            flash(el);
          }
          return true;
        }

        // Editor-body mention node by attribute.
        const node =
          document.querySelector(`[data-node-id="${target.targetNodeId}"]`) ||
          document.querySelector(`[data-id="${target.targetNodeId}"]`);
        if (node) {
          node.scrollIntoView({ behavior: "smooth", block: "center" });
          flash(node);
          return true;
        }
      }

      // ── Page-level comment: scroll to the page-comment node. ──
      if (target.type === "comment-mention") {
        const node = document.querySelector('[data-type="page-comment"]');
        if (node) {
          node.scrollIntoView({ behavior: "smooth", block: "center" });
          flash(node);
          return true;
        }
      }

      return false;
    };

    const tryScroll = () => {
      const target = consumePendingScrollTarget(pageId);
      if (!target) return;

      tries = 0;
      const run = () => {
        // Retry across frames: on a fresh page load the threads/decorations
        // render after the editor mounts, so the target may not exist yet.
        if (attempt(target) || tries > 40) {
          rafId = null;
          return;
        }
        tries += 1;
        rafId = requestAnimationFrame(run);
      };
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(run);
    };

    tryScroll();
    const unsub = subscribePendingScrollTarget(tryScroll);
    editor.on("create", tryScroll);

    return () => {
      unsub();
      editor.off("create", tryScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [editor, pageId]);
}

function flash(el: Element) {
  el.classList.add("scroll-flash");
  setTimeout(() => el.classList.remove("scroll-flash"), 1600);
}
