import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useActiveViewType } from "../hooks/use-active-view-type";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { TextCellDisplay } from "../primitives/text-cell-display";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";

export function TextCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const activeViewType = useActiveViewType(editor, getPos);
  const syncPage = useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);

  if (isHidden) return <NodeViewWrapper as="div" style={{ display: "none" }} />;

  return (
    <NodeViewWrapper
      as="div"
      data-type="text-cell"
      style={{
        borderRight:
          activeViewType === "table"
            ? "1px solid var(--tt-border-color)"
            : "none",
        height: "fit-content",
        margin: 0,
      }}
    >
      <TextCellDisplay
        value={node.attrs.value || "Add text..."}
        onChange={(value) =>
          syncPage(() => updateAttributes({ ...node.attrs, value }), node)
        }
        placeholder="Add text..."
      />
    </NodeViewWrapper>
  );
}
