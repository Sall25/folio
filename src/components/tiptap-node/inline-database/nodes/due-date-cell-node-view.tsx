import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useCallback } from "react";
import { DateCellDisplay } from "../primitives/date-cell-display";
import { useActiveViewType } from "../hooks/use-active-view-type";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";
import type { DatabaseAttrs, ConfigOf } from "../types/types";

export function DueDateCellNodeView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const activeViewType = useActiveViewType(editor, getPos);
  const syncPage = useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);

  const getParentDatabase = useCallback(() => {
    const pos = getPos?.();
    if (pos == null) return null;
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const n = $pos.node(d);
      if (n.type.name === "database") return n;
    }
    return null;
  }, [editor, getPos]);

  const db = getParentDatabase();
  const dbAttrs = db?.attrs as DatabaseAttrs | undefined;
  const prop = dbAttrs?.properties.find((p) => p.id === node.attrs.propertyId);
  const config =
    prop?.config.type === "date" ? (prop.config as ConfigOf<"date">) : null;

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
        format={config?.format ?? "full"}
        timeFormat={config?.timeFormat ?? "12h"}
        includeTime={config?.includeTime ?? false}
        onChange={(iso) =>
          syncPage(() => {
            updateAttributes({ ...node.attrs, value: iso });
          }, node)
        }
      />
    </NodeViewWrapper>
  );
}
