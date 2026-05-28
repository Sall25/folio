import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import type { DatabaseAttrs } from "../types/types";

import "./database-record-list-view.scss";
import { useParentDatabase } from "../hooks/use-parent-database";

export function DatabaseRecordListView(props: NodeViewProps) {
  const { getPos, editor } = props;

  const db = useParentDatabase(editor, getPos);
  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;

  const gridTemplateColumns = attrs.properties
    .map((p, i) => (i === 0 ? "3fr" : `${p.width ?? 160}px`))
    .join(" ");

  return (
    <NodeViewWrapper as="div" className="db-list-record">
      <CardItemGroup
        className="db-list-record__row"
        style={{ gridTemplateColumns, border: "none" }}
      >
        <NodeViewContent as={"div"} />
      </CardItemGroup>
    </NodeViewWrapper>
  );
}
