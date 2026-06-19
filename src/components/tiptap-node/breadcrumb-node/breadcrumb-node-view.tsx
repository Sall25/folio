import { NodeViewWrapper } from "@tiptap/react";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import "./page-breadcrumb.scss";
import { Breadcrumbs } from "src/components/tiptap-templates/simple/breadcrumbs";

export function BreadcrumbNodeView() {
  const { activePageId } = useActivePage();

  return (
    <NodeViewWrapper contentEditable={false}>
      <Breadcrumbs pageId={activePageId} />
    </NodeViewWrapper>
  );
}
