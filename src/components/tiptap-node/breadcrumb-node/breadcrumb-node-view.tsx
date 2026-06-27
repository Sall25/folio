import { NodeViewWrapper } from "@tiptap/react";
import { PageBreadcrumb } from "src/components/tiptap-ui/page-breadcrumb/page-breadcrumb";

// Non-editable view — reuses the app-layer container, which derives the
// active page's ancestry and renders the <Breadcrumb> primitive.
export function BreadcrumbNodeView() {
  return (
    <NodeViewWrapper
      as="div"
      className="breadcrumb-node"
      contentEditable={false}
      data-type="breadcrumb"
    >
      <PageBreadcrumb />
    </NodeViewWrapper>
  );
}
