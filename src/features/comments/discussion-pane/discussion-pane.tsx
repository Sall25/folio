import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { useTranslation } from "react-i18next";
import { MessageSquareText, ListFilter, X } from "src/components/icons";
import type { Thread } from "src/types";
import { useThreadsByPage } from "src/hooks/use-threads";
import { commentThreadPluginKey } from "../extensions";
import { DiscussionThreadItem } from "./discussion-thread-item";
import "./discussion-pane.scss";

const PANE_WIDTH = 320;
const FLASH_MS = 1600;

// Fixed, full viewport height, over the toolbar's right side. Portaled to
// <body>: inside the editor layout an ancestor (transform / contain / its own
// stacking context) made "fixed" relative to the area under the toolbar. The
// right gutter in SimpleEditorContent still reserves PANE_WIDTH in the layout,
// so the pane never sits on top of the page text.
const PANE_STYLE: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: `min(${PANE_WIDTH}px, 100vw)`,
  height: "100dvh",
  // Above the toolbar; below the comment popover (1000) and menus (9999).
  zIndex: 900,
  display: "flex",
  flexDirection: "column",
  background: "var(--tt-bg-color)",
  borderLeft: "0.5px solid var(--tt-border-color)",
};

const BODY_STYLE: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
};

// Per-page comments pane. Lists ALL of the current page's threads — inline
// (anchor != null) and page-level (anchor == null). Selecting an inline one
// scrolls the page to its text and flashes the highlight; a page-level one
// scrolls to the page comments.
export function DiscussionPane({
  editor,
  pageId,
  onClose,
}: {
  editor: Editor | null;
  pageId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: threads = [] } = useThreadsByPage(pageId);
  // One thread open at a time (like the popover). Keyed by page so switching
  // pages starts collapsed without an effect.
  const [expanded, setExpanded] = useState<{
    pageId: string | null;
    id: string;
  } | null>(null);
  const expandedId = expanded?.pageId === pageId ? expanded.id : null;

  // Stable order: inline threads by document position, then page-level.
  const ordered = useMemo(() => {
    const live = threads.filter(
      (th) => th.status !== "drafted" && th.status !== "deleted",
    );
    const inline = live
      .filter((th) => th.anchor != null)
      .sort((a, b) => (a.anchor!.from ?? 0) - (b.anchor!.from ?? 0));
    const pageLevel = live.filter((th) => th.anchor == null);
    return [...inline, ...pageLevel];
  }, [threads]);

  const handleSelect = (thread: Thread) => {
    setExpanded({ pageId, id: thread.id });
    if (thread.anchor == null) {
      // Page-level threads live in the page-comment node — scroll to it.
      const node = document.querySelector<HTMLElement>(
        '[data-type="page-comment"]',
      );
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        flash([node]);
      }
      return;
    }
    if (editor) scrollToAnchor(editor, thread);
  };

  return createPortal(
    <div className="discussion-pane" style={PANE_STYLE}>
      <div className="discussion-pane__header">
        <span className="discussion-pane__title">
          {t("comments.title", "Comments")}
        </span>
        <div className="discussion-pane__header-actions">
          <button
            type="button"
            className="discussion-pane__icon-btn"
            title={t("comments.filter", "Filter")}
            disabled
          >
            <ListFilter size={16} />
          </button>
          <button
            type="button"
            className="discussion-pane__icon-btn"
            onClick={onClose}
            title={t("actions.close", "Close")}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="discussion-pane__body" style={BODY_STYLE}>
        {ordered.length === 0 ? (
          <div className="discussion-pane__empty">
            <MessageSquareText size={28} strokeWidth={1.5} />
            <p>{t("comments.empty", "No comments yet")}</p>
          </div>
        ) : (
          ordered.map((thread) => (
            <DiscussionThreadItem
              key={thread.id}
              thread={thread}
              editor={editor}
              expanded={thread.id === expandedId}
              onSelect={() => handleSelect(thread)}
              onCollapse={() => setExpanded(null)}
            />
          ))
        )}
      </div>
    </div>,
    document.body,
  );
}

// Scroll the page to an inline thread's text and flash it.
//   • Open threads have a highlight (decoration spans): select the thread in
//     the plugin (full-yellow "selected" state), scroll the first span into
//     view, and flash every span of it.
//   • Resolved threads have no highlight: scroll to the anchored text itself
//     and flash the block that contains it.
function scrollToAnchor(editor: Editor, thread: Thread) {
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
function flash(els: HTMLElement[]) {
  for (const el of els) {
    el.classList.remove("comment-target-flash");
    void el.offsetWidth; // restart the animation if it's already running
    el.classList.add("comment-target-flash");
  }
  window.setTimeout(() => {
    for (const el of els) el.classList.remove("comment-target-flash");
  }, FLASH_MS);
}
