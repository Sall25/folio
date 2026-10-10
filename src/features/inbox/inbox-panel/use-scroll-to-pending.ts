import { useEffect } from "react";
import type { Editor } from "@tiptap/core";
import {
  consumePendingScrollTarget,
  setPendingScrollTarget,
  subscribePendingScrollTarget,
  type FindTarget,
} from "./pending-scroll-target";
import { commentThreadPluginKey } from "src/features/comments";
import { buildMatcher } from "src/lib/find-in-pages";

// Mount once where the editor lives. When a pending scroll target matches the
// current page, scrolls to and ACTIVATES the target after the page has
// rendered. Handles inline threads (scroll to anchor + select), page-level
// comments (scroll to the page-comment node), editor mentions, and
// find-in-pages matches (select the matched text).
//
// A page opened from a notification is often still loading (its content
// syncing, threads being fetched, node views rendering), so the target is
// looked for again on every content change and every POLL_MS for up to
// MAX_WAIT_MS. Once found, it's re-centred twice while the page settles
// (content loading above it pushes it down). Scrolling, clicking or typing
// stops all of this: the page never jumps away from what the person is
// doing. When the page's editor is replaced while loading, the target is
// handed on to the new one.

type Target = { targetNodeId?: string; type?: string; find?: FindTarget };

const MAX_WAIT_MS = 12_000;
const POLL_MS = 150;
const SETTLE_MS = [350, 1000];

export function useScrollToPendingTarget(
  editor: Editor | null,
  pageId: string | null,
) {
  useEffect(() => {
    if (!editor || !pageId) return;

    // The element the target points at, if it's on the page yet.
    const findElement = (target: Target): Element | null => {
      if (target.targetNodeId) {
        const id = target.targetNodeId;
        const thread = commentThreadPluginKey
          .getState(editor.state)
          ?.threads.find((t) => t.id === id);
        if (thread) {
          return (
            document.querySelector(`[data-thread-id="${id}"]`) ||
            document.querySelector(`[data-thread-list-item-id="${id}"]`)
          );
        }
        const node =
          document.querySelector(`[data-node-id="${id}"]`) ||
          document.querySelector(`[data-id="${id}"]`);
        if (node) return node;
      }
      if (target.type === "comment-mention") {
        return document.querySelector('[data-type="page-comment"]');
      }
      return null;
    };

    // Scrolls to the target and activates it (selects a thread, flashes
    // the block). False when it isn't there yet.
    const attempt = (target: Target): boolean => {
      if (target.type === "find" && target.find) {
        return scrollToFindMatch(editor, target.find);
      }
      const el = findElement(target);
      if (!el) return false;
      const id = target.targetNodeId;
      if (
        id &&
        commentThreadPluginKey
          .getState(editor.state)
          ?.threads.some((t) => t.id === id)
      ) {
        editor.view.dispatch(
          editor.state.tr.setMeta(commentThreadPluginKey, {
            type: "selectThread",
            threadId: id,
          }),
        );
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      flash(el);
      return true;
    };

    // Stops the current search; with `handBack`, an unfinished one leaves
    // its target pending again (for the editor that replaces this one).
    let stopCurrent: (handBack?: boolean) => void = () => {};

    const tryScroll = () => {
      // A replaced editor's last call: leave the target for the new one.
      if (editor.isDestroyed) return;
      const target = consumePendingScrollTarget(pageId);
      if (!target) return;
      stopCurrent();

      const started = Date.now();
      const timers: number[] = [];
      let userMoved = false;
      let found = false;
      const onUser = () => {
        userMoved = true;
      };
      const USER_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"];
      USER_EVENTS.forEach((e) =>
        window.addEventListener(e, onUser, { capture: true, passive: true }),
      );

      const stop = (handBack = false) => {
        window.clearInterval(interval);
        timers.forEach((t) => window.clearTimeout(t));
        USER_EVENTS.forEach((e) =>
          window.removeEventListener(e, onUser, { capture: true }),
        );
        if (!editor.isDestroyed) editor.off("update", look);
        stopCurrent = () => {};
        const unfinished =
          !found && !userMoved && Date.now() - started <= MAX_WAIT_MS;
        if (handBack && unfinished) setPendingScrollTarget(target);
      };

      // Found: keep it centred while the page finishes loading.
      const settle = () => {
        found = true;
        window.clearInterval(interval);
        if (!editor.isDestroyed) editor.off("update", look);
        if (target.type === "find") return stop();
        SETTLE_MS.forEach((ms, i) =>
          timers.push(
            window.setTimeout(() => {
              const el =
                !userMoved && !editor.isDestroyed && findElement(target);
              if (el) {
                const r = el.getBoundingClientRect();
                const off = r.top + r.height / 2 - window.innerHeight / 2;
                if (Math.abs(off) > 80) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }
              if (i === SETTLE_MS.length - 1) stop();
            }, ms),
          ),
        );
      };

      function look() {
        if (editor!.isDestroyed) {
          // The page's editor was replaced while loading: hand the target
          // to the new one (its hook picks it up).
          stop(true);
          return;
        }
        if (userMoved || Date.now() - started > MAX_WAIT_MS) return stop();
        if (attempt(target!)) settle();
      }

      stopCurrent = stop;
      const interval = window.setInterval(look, POLL_MS);
      editor.on("update", look);
      // After the first render.
      timers.push(window.setTimeout(look, 0));
    };

    tryScroll();
    const unsub = subscribePendingScrollTarget(tryScroll);
    editor.on("create", tryScroll);

    return () => {
      unsub();
      if (!editor.isDestroyed) editor.off("create", tryScroll);
      // Unmounted (the editor replaced, or another page): stop looking, and
      // leave an unfinished target for the next editor of this page.
      stopCurrent(true);
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
