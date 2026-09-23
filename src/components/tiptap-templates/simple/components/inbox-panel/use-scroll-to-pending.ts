import { useEffect } from "react";
import type { Editor } from "@tiptap/core";
import {
  consumePendingScrollTarget,
  subscribePendingScrollTarget,
  type FindTarget,
} from "./pending-scroll-target";
import { commentThreadPluginKey } from "src/components/tiptap-ui/comments";
import { buildMatcher } from "src/lib/find-in-pages";

// Mount once where the editor lives. When a pending scroll target matches the
// current page, scrolls to and ACTIVATES the target after the page has
// rendered. Handles inline threads (scroll to anchor + select), page-level
// comments (scroll to the page-comment node), editor mentions, and
// find-in-pages matches (select the matched text).
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
      find?: FindTarget;
    }): boolean => {
      // ── Find-in-pages match: select the text itself. ──
      if (target.type === "find" && target.find) {
        return scrollToFindMatch(editor, target.find);
      }

      // ── Inline thread: select it (opens the card) + scroll to its anchor. ──
      if (target.targetNodeId) {
        const pluginState = commentThreadPluginKey.getState(editor.state);
        const thread = pluginState?.threads.find(
          (t) => t.id === target.targetNodeId,
        );

        if (thread) {
          editor.view.dispatch(
            editor.state.tr.setMeta(commentThreadPluginKey, {
              type: "selectThread",
              threadId: target.targetNodeId,
            }),
          );
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

type Hit = { from: number; to: number; blockPos: number };

// Walk the live doc's text blocks in the same order find-in-pages counted
// them (empty blocks skipped), select the match inside the target block, and
// flash it. textBetween with " " for block/leaf separators keeps character
// offsets aligned with ProseMirror positions inside a textblock (every inline
// leaf — hard break, mention — is 1 position and 1 character).
function scrollToFindMatch(editor: Editor, find: FindTarget): boolean {
  const { re } = buildMatcher(find.query, find.options);
  if (!re) return false;

  const doc = editor.state.doc;
  if (doc.childCount === 0) return false;

  // A holder object, not two `let`s: the hits are assigned inside the
  // descendants callback, which TypeScript's control-flow analysis can't see —
  // with plain `let x: Hit | null = null` it would keep x narrowed to null
  // after the loop and type the result as `never`.
  const found: { atIndex: Hit | null; firstAnywhere: Hit | null } = {
    atIndex: null,
    firstAnywhere: null,
  };
  let index = -1;

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = node.textBetween(0, node.content.size, " ", " ");
    if (!text.trim()) return false;
    index += 1;

    re.lastIndex = 0;
    const m = re.exec(text);
    const hit: Hit | null =
      m && m[0].length > 0
        ? {
            from: pos + 1 + m.index,
            to: pos + 1 + m.index + m[0].length,
            blockPos: pos,
          }
        : null;

    if (hit && !found.firstAnywhere) found.firstAnywhere = hit;
    if (index === find.blockIndex && hit) found.atIndex = hit;
    return false;
  });

  // Prefer the exact block; if the page changed since the search ran (the
  // index drifted), fall back to the first occurrence on the page.
  const target = found.atIndex ?? found.firstAnywhere;
  if (!target) return false;

  editor
    .chain()
    .focus()
    .setTextSelection({ from: target.from, to: target.to })
    .scrollIntoView()
    .run();

  const dom = editor.view.nodeDOM(target.blockPos);
  if (dom instanceof Element) flash(dom);
  return true;
}

function flash(el: Element) {
  el.classList.add("scroll-flash");
  setTimeout(() => el.classList.remove("scroll-flash"), 1600);
}
