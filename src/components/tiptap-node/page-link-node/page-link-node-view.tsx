import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import "./page-link-node.scss";
import { PageItemIcon } from "src/components/tiptap-templates/simple/page-item-icon";
import { useEffect, useState } from "react";
import type { Page } from "src/components/tiptap-templates/simple/types";

function flattenPages(pages: Page[]): Page[] {
  return pages.flatMap((p) => [p, ...flattenPages(p.children ?? [])]);
}

export function PageLinkNodeView({ node, extension, editor }: NodeViewProps) {
  const { pageId } = node.attrs;
  const [pages, setPages] = useState(() => editor.storage.pageLink.pages);

  // useEffect(() => {
  //   const handler = () => {
  //     setPages([...editor.storage.pageLink.pages]);
  //   };
  //   editor.on("transaction", handler);
  //   return () => {
  //     editor.off("transaction", handler);
  //   };
  // }, [editor]);

  const page =
    pages.find((p) => String(p.id) === String(pageId)) ??
    flattenPages(pages).find((p) => String(p.id) === String(pageId));

  if (!page)
    return (
      <NodeViewWrapper>
        <span>No page</span>
      </NodeViewWrapper>
    );

  const handleClick = () => {
    extension.options.onNavigate?.(pageId);
  };

  return (
    <NodeViewWrapper>
      <div onClick={handleClick} className="page-link-node">
        <PageItemIcon cover={page.cover} />
        <span>{page.title}</span>
      </div>
    </NodeViewWrapper>
  );
}
