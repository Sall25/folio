/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import "./page-link-node.scss";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { useRef, useState } from "react";
import type { Page } from "src/components/tiptap-templates/simple/types";
import { createPortal } from "react-dom";

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

export function PageLinkNodeView({ node, extension, editor }: NodeViewProps) {
  const { pageId } = node.attrs;
  const [pages] = useState(() => editor.storage.pageLink.pages);
  const [isHovered, setIsHovered] = useState(false);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const linkRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setPreviewPos({
        top: rect.top - 8, // above the link, will be adjusted by transform
        left: rect.left,
      });
    }
    setIsHovered(true);
  };

  const page =
    pages.find((p) => String(p.id) === String(pageId)) ??
    flattenPages(pages).find((p) => String(p.id) === String(pageId));

  if (!page)
    return (
      <NodeViewWrapper data-node-id={node.attrs.nodeId}>
        <span>No page</span>
      </NodeViewWrapper>
    );

  const breadcrumb = buildBreadcrumb(page, pages);
  const excerpt = getContentExcerpt(page);

  const handleClick = () => {
    extension.options.onNavigate?.(Number(pageId));
  };

  return (
    <NodeViewWrapper
      style={{ display: "inline" }}
      data-node-id={node.attrs.nodeId}
    >
      <div
        ref={linkRef}
        className="page-link-node"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        <PageItemIcon cover={page.cover} />
        <span>{page.title || "New Page"}</span>
      </div>

      {isHovered &&
        createPortal(
          <div
            className="page-link-preview"
            style={{
              position: "fixed",
              top: previewPos.top,
              left: previewPos.left,
              transform: "translateY(33%)",
              zIndex: 9999,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="page-link-preview__icon">
              <PageItemIcon cover={page.cover} styles={{ fontSize: 32 }} />
            </div>
            {breadcrumb && (
              <p className="page-link-preview__breadcrumb">{breadcrumb}</p>
            )}
            <p className="page-link-preview__title">
              {page.title || "Untitled"}
            </p>
            {excerpt && <p className="page-link-preview__excerpt">{excerpt}</p>}
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}
