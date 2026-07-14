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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onMouseDown={(e: any) => {
        // The panel's cells own their own clicks — popover triggers bind on
        // pointerdown, and ProseMirror suppresses that inside a
        // contentEditable=false region, so the editors never open.
        e.stopPropagation();
      }}
    >
      <RecordPropertyPanel page={page} />
    </NodeViewWrapper>
  );
}
