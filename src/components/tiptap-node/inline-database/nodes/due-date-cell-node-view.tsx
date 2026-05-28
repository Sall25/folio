import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { DateCellDisplay } from "../primitives/date-cell-display";
import { useActiveViewType } from "../hooks/use-active-view-type";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";

export function DueDateCellNodeView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const activeViewType = useActiveViewType(editor, getPos);
  const syncPage = useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);

  if (isHidden) return <NodeViewWrapper as="div" style={{ display: "none" }} />;

  return (
    <NodeViewWrapper
      as="div"
      data-type="date-cell"
      style={{
        borderRight:
          activeViewType === "table"
            ? "1px solid var(--tt-border-color)"
            : "none",
        height: "fit-content",
        margin: 0,
      }}
    >
      <DateCellDisplay
        value={node.attrs.value}
        onChange={(iso) =>
          syncPage(() => {
            updateAttributes({ ...node.attrs, value: iso });
          }, node)
        }
      />
    </NodeViewWrapper>
  );
}
