/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import "./page-link-node.scss";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Page } from "src/types";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FileX2, Trash2 } from "src/components/icons";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { useActivePageActions } from "src/features/pages/context/active-page-context";
import { usePage, usePagesBase } from "src/hooks/use-pages";
import { Breadcrumbs } from "src/features/shell/breadcrumbs";

function getContentExcerpt(page: Page): string {
  try {
    const content = page.content?.content ?? [];
    for (const node of content) {
      if (node.type === "paragraph" && node.content?.length) {
        const text = node.content
          .filter((n: any) => n.type === "text")
          .map((n: any) => n.text)
          .join("");
        if (text.trim()) return text;
      }
    }
  } catch {
    // ignore
  }
  return "";
}

const ENTER_DELAY = 500;
const LEAVE_DELAY = 250;

// Hover preview, placed under the link (above it near the bottom of the
// screen). Closes on scroll: a fixed card left behind by the page looks
// broken.
function PageLinkPreview({
  anchor,
  page,
  onEnter,
  onLeave,
  onClose,
}: {
  anchor: HTMLElement;
  page: Page;
  onEnter: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const excerpt = getContentExcerpt(page);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    void computePosition(anchor, el, {
      placement: "bottom-start",
      strategy: "fixed",
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.visibility = "visible";
    });
  }, [anchor]);

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("scroll", close, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="page-link-preview"
      role="tooltip"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        visibility: "hidden",
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="page-link-preview__icon">
        <PageItemIcon cover={page.cover} styles={{ fontSize: 32 }} />
      </div>
      <Breadcrumbs pageId={page.id} showDropdown={false} />
      <p className="page-link-preview__title">
        {page.title || t("page.newPage")}
      </p>
      {excerpt && <p className="page-link-preview__excerpt">{excerpt}</p>}
    </div>,
    document.body,
  );
}

export function PageLinkNodeView({ node, editor, getPos }: NodeViewProps) {
  const { t } = useTranslation();
  const { pageId, title: storedTitle, showIcon } = node.attrs;

  // Live: read from the pages list (kept fresh by the app), so a rename or
  // a new icon shows here at once. The page's own query covers a page the
  // list doesn't hold, and tells a deleted page from one still loading.
  const list = usePagesBase(
    (pages) => pages.find((p) => String(p.id) === String(pageId)) ?? null,
  );
  const fromList = list.data;
  const detail = usePage(fromList ? null : pageId);
  const page: Page | null | undefined = fromList ?? detail.data;
  const loading =
    !page &&
    ((list.isPending && list.fetchStatus !== "idle") ||
      (detail.isPending && detail.fetchStatus !== "idle"));
  const missing = !page && !loading;

  const { setActivePageId } = useActivePageActions();
  const [hovered, setHovered] = useState(false);
  // The link element, kept in state so the preview can anchor to it.
  const [linkEl, setLinkEl] = useState<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const openSoon = () => {
    clearTimer();
    timer.current = setTimeout(() => setHovered(true), ENTER_DELAY);
  };
  const closeSoon = () => {
    clearTimer();
    timer.current = setTimeout(() => setHovered(false), LEAVE_DELAY);
  };

  // Keep the title stored in the node in step with the page, so the link
  // still reads right once the page is gone (and in exports). Not undoable:
  // the reader didn't make this change.
  const liveTitle = page?.title;
  useEffect(() => {
    if (!editor.isEditable || liveTitle == null || liveTitle === storedTitle)
      return;
    const pos = getPos();
    if (typeof pos !== "number") return;
    const current = editor.state.doc.nodeAt(pos);
    if (!current || current.type.name !== "pageLink") return;
    editor.view.dispatch(
      editor.state.tr
        .setNodeMarkup(pos, undefined, { ...current.attrs, title: liveTitle })
        .setMeta("addToHistory", false),
    );
  }, [editor, getPos, liveTitle, storedTitle]);

  const removeLink = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
  };

  if (loading) {
    return (
      <NodeViewWrapper data-drag-handle data-node-id={node.attrs.nodeId}>
        <div className="page-link-node is-loading" aria-busy="true">
          <span className="page-link-node__skeleton-icon" />
          <span className="page-link-node__skeleton-text" />
        </div>
      </NodeViewWrapper>
    );
  }

  // Deleted for good, or no access: say so, keep the last known title.
  if (missing) {
    return (
      <NodeViewWrapper data-drag-handle data-node-id={node.attrs.nodeId}>
        <div className="page-link-node is-gone" contentEditable={false}>
          <FileX2 size={16} className="page-link-node__gone-icon" />
          <span className="page-link-node__title">
            {storedTitle || t("pageLink.deleted")}
          </span>
          <span className="page-link-node__badge">
            {t("pageLink.unavailable")}
          </span>
          {editor.isEditable && (
            <button
              type="button"
              className="page-link-node__action"
              onClick={removeLink}
            >
              {t("pageLink.remove")}
            </button>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  // In the trash: still there, can come back.
  if (page!.deletedAt) {
    return (
      <NodeViewWrapper data-drag-handle data-node-id={node.attrs.nodeId}>
        <div className="page-link-node is-trashed" contentEditable={false}>
          {showIcon && <PageItemIcon cover={page!.cover} />}
          <span className="page-link-node__title">
            {page!.title || t("page.newPage")}
          </span>
          <span className="page-link-node__badge">
            <Trash2 size={11} />
            {t("pageLink.inTrash")}
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  const handleClick = () => {
    clearTimer();
    setHovered(false);
    setActivePageId(pageId);
  };

  return (
    <NodeViewWrapper
      style={{ display: "block", padding: 0 }}
      data-drag-handle
      data-node-id={node.attrs.nodeId}
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
    >
      <div
        ref={setLinkEl}
        className="page-link-node"
        role="link"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {showIcon && <PageItemIcon cover={page!.cover} />}
        <span
          className="page-link-node__title"
          style={{ color: page!.cover?.color ?? undefined }}
        >
          {page!.title || t("page.newPage")}
        </span>
      </div>

      {hovered && linkEl && (
        <PageLinkPreview
          anchor={linkEl}
          page={page!}
          onEnter={clearTimer}
          onLeave={closeSoon}
          onClose={() => {
            clearTimer();
            setHovered(false);
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
