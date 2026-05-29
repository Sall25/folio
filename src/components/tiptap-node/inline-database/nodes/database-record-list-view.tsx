import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { DatabaseAttrs } from "../types/types";

import "./database-record-list-view.scss";
import { useParentDatabase } from "../hooks/use-parent-database";
import { useRecordGrouping } from "../hooks/use-record-grouping";

export function DatabaseRecordListView(props: NodeViewProps) {
  const { node, getPos, editor } = props;

  const db = useParentDatabase(editor, getPos)!;

  const attrs = db.attrs as DatabaseAttrs;
  const activeView =
    attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0];

  const grouping = useRecordGrouping(editor, db, activeView, node);

  const gridTemplateColumns = attrs.properties
    .map((p, i) => (i === 0 ? "3fr" : `${p.width ?? 160}px`))
    .join(" ");

  if (grouping.hidden)
    return <NodeViewWrapper as="div" style={{ display: "none" }} />;

  const row = (
    <CardItemGroup
      className="db-list-record__row"
      style={{
        gridTemplateColumns,
        border: "none",
        display: grouping.isCollapsed ? "none" : undefined,
      }}
    >
      <NodeViewContent as="div" />
    </CardItemGroup>
  );

  // Ungrouped: original behavior unchanged.
  if (!grouping.groupByPropertyId) {
    return (
      <NodeViewWrapper as="div" className="db-list-record">
        {row}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="div" className="db-list-record">
      <CardItemGroup>
        {grouping.isFirstInGroup && (
          <CardItemGroup
            orientation="horizontal"
            style={{
              gap: 5,
              paddingTop: 10,
              borderBottom: "1px solid var(--tt-border-color)",
            }}
          >
            <Button variant="ghost" onClick={grouping.toggleCollapse}>
              {grouping.isCollapsed ? (
                <ChevronRight className="tiptap-button-icon" size={13} />
              ) : (
                <ChevronDown className="tiptap-button-icon" size={13} />
              )}
              {grouping.color && (
                <span
                  className="db-group-header__dot"
                  style={{ background: grouping.color }}
                />
              )}
              <span className="tiptap-button-text">{grouping.label}</span>
            </Button>

            <Badge data-style="gray" size="small">
              <span> {grouping.count}</span>
            </Badge>

            <Button
              variant="ghost"
              className="db-group-header__add"
              onClick={() => editor.commands.addDatabaseRecord(attrs.id)}
            >
              <Plus size={12} />
            </Button>
          </CardItemGroup>
        )}
        {row}
      </CardItemGroup>
    </NodeViewWrapper>
  );
}
