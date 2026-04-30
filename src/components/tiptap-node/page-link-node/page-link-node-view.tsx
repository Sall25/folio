/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import "./page-link-node.scss";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { useRef, useState } from "react";
import type { Page } from "src/components/tiptap-templates/simple/types";
import { createPortal } from "react-dom";
import { useSimpleEditor } from "src/components/tiptap-templates/simple/context/simple-editor-context";

function flattenPages(pages: Page[]): Page[] {
  return pages.flatMap((p) => [p, ...flattenPages(p.children ?? [])]);
}

function buildBreadcrumb(page: Page, allPages: Page[]): string {
  const trail: string[] = [];
  let current: Page | undefined = page;
  while (current?.parentId) {
    const parent = allPages.find(
      (p) => String(p.id) === String(current!.parentId),
    );
    if (!parent) break;
    trail.unshift(parent.title || "Untitled");
    current = parent;
  }
  return trail.join(" / ");
}

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

export function PageLinkNodeView({ node, extension }: NodeViewProps) {
  const { pageId } = node.attrs;
  const { pages } = useSimpleEditor();
  const [isHovered, setIsHovered] = useState(false);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const linkRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearTimers();
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setPreviewPos({ top: rect.bottom, left: rect.left }); // bottom of link, not top
    }
    enterTimer.current = setTimeout(() => setIsHovered(true), 600);
  };

  const handleMouseLeave = () => {
    clearTimers();
    leaveTimer.current = setTimeout(() => setIsHovered(false), 300);
  };

  // Shared handlers for the preview — cancel the leave timer on enter
  const handlePreviewEnter = () => {
    clearTimers();
  };

  const handlePreviewLeave = () => {
    clearTimers();
    leaveTimer.current = setTimeout(() => setIsHovered(false), 300);
  };

  if (!pages) return null;

  const page =
    pages.find((p) => String(p.id) === String(pageId)) ??
    flattenPages(pages).find((p) => String(p.id) === String(pageId));

  if (!page)
    return (
      <NodeViewWrapper data-drag-handle data-node-id={node.attrs.nodeId}>
        <span
          style={{
            textDecoration: "line-through",
            opacity: 0.4,
            fontSize: "1.05em",
            cursor: "not-allowed",
            color: "var(--tt-color-red-base)",
          }}
        >
          Deleted Page
        </span>
      </NodeViewWrapper>
    );

  const breadcrumb = buildBreadcrumb(page, pages);
  const excerpt = getContentExcerpt(page);
  const handleClick = () => extension.options.onNavigate?.(Number(pageId));

  return (
    <NodeViewWrapper
      style={{ display: "block", padding: 0 }}
      data-drag-handle
      data-node-id={node.attrs.nodeId}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={linkRef} className="page-link-node" onClick={handleClick}>
        <PageItemIcon cover={page.cover} />
        <span style={{ color: page.cover.color }}>
          {page.title || "New Page"}
        </span>
      </div>

      {isHovered &&
        createPortal(
          <div
            className="page-link-preview"
            style={{
              position: "fixed",
              top: previewPos.top, // flush below the link
              left: previewPos.left,
              zIndex: 9999,
            }}
            onMouseEnter={handlePreviewEnter}
            onMouseLeave={handlePreviewLeave}
          >
            <div className="page-link-preview__icon">
              <PageItemIcon cover={page.cover} styles={{ fontSize: 32 }} />
            </div>
            {breadcrumb && (
              <p className="page-link-preview__breadcrumb">{breadcrumb}</p>
            )}
            <p className="page-link-preview__title">
              {page.title || "New Page"}
            </p>
            {excerpt && <p className="page-link-preview__excerpt">{excerpt}</p>}
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}
