import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";

/**
 * databaseRecord NodeView. A structural row container. Uses display:contents
 * (via the .db-record class) so the record wrapper itself vanishes from the
 * layout box tree and its cell children participate directly in the database
 * node's CSS grid. That's what lets cells be real, independent NodeViews while
 * still laying out as one continuous grid.
 */
export default function DatabaseRecordNodeView({ node }: NodeViewProps) {
  const recordId = node.attrs.recordId as string | null;
  return (
    <NodeViewWrapper
      as="div"
      data-type="database-record"
      data-record-id={recordId ?? undefined}
      className="db-record"
    >
      <NodeViewContent as="div" className="db-record__cells" />
    </NodeViewWrapper>
  );
}
