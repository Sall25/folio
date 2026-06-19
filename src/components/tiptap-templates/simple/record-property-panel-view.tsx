import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { ID } from "src/types";
import { usePage } from "src/hooks/use-pages";
import { RecordPropertyPanel } from "./record-property-panel";

export function RecordPropertyPanelView({ node }: NodeViewProps) {
  const pageId = node.attrs.pageId as ID | null;
  const { data: page } = usePage(pageId);

  if (!page) return <NodeViewWrapper className="record-property-panel-node" />;

  return (
    <NodeViewWrapper
      className="record-property-panel-node"
      contentEditable={false}
    >
      <RecordPropertyPanel page={page} />
    </NodeViewWrapper>
  );
}
