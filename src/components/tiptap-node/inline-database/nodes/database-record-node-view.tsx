import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback, useEffect, useReducer } from "react";
import type { DatabaseAttrs } from "../types/types";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import type { Transaction } from "@tiptap/pm/state";
import { DatabaseRecordListView } from "./database-record-list-view";
import { DatabaseRecordBoardView } from "./database-record-board-view";
import { DatabaseRecordGalleryView } from "./database-record-gallery-view";
import { recordMatchesFilters } from "../utils/apply-filters";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import "./database-record-node-view.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { useRecordGrouping } from "../hooks/use-record-grouping";

export function DatabaseRecordNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props;
  const { deletePageAsync } = usePages();

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

  useEffect(() => {
    const handleTransaction = ({
      transaction,
    }: {
      transaction: Transaction;
    }) => {
      const meta = transaction.getMeta("requestDeleteRecord");
      if (!meta) return;
      if (meta.recordId !== node.attrs.id) return;

      let pageId: string | null = null;
      node.forEach((cell) => {
        if (cell.type.name === "titleCell") pageId = cell.attrs.pageId;
      });

      if (pageId) deletePageAsync(pageId);
      const db = getParentDatabase();
      if (!db) return;
      editor.commands.deleteDatabaseRecord(db.attrs.id, meta.recordId);
    };

    editor.on("transaction", handleTransaction);
    return () => {
      editor.off("transaction", handleTransaction);
    };
  }, [editor, node, deletePageAsync, getParentDatabase]);

  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const h = () => forceUpdate();
    editor.on("transaction", h);
    return () => {
      editor.off("transaction", h);
    };
  }, [editor]);

  // Resolve db/activeView as plain values (getParentDatabase is a callback, not
  // a hook), then call the grouping hook UNCONDITIONALLY before any early return.
  const db = getParentDatabase();
  const attrs = (db?.attrs ?? null) as DatabaseAttrs | null;
  const activeView = attrs
    ? (attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0])
    : null;

  const grouping = useRecordGrouping(editor, db, activeView, node);

  // ── Early returns (all hooks have run above) ──────────────────────────────
  if (!db || !attrs || !activeView) return null;

  if (!recordMatchesFilters(node, activeView.filters ?? [])) {
    return <NodeViewWrapper as="div" style={{ display: "none" }} />;
  }

  if (activeView.type === "gallery")
    return <DatabaseRecordGalleryView {...props} />;
  if (activeView.type === "board")
    return <DatabaseRecordBoardView {...props} />;
  if (activeView.type === "list") return <DatabaseRecordListView {...props} />;

  // ── Table view ────────────────────────────────────────────────────────────
  const hiddenProperties = new Set(activeView.hiddenProperties ?? []);
  const visibleProperties = attrs.properties.filter(
    (p) => !hiddenProperties.has(p.id),
  );
  const gridTemplateColumns =
    visibleProperties.map((p) => `${p.width ?? 160}px`).join(" ") + " 1fr";

  if (grouping.hidden)
    return <NodeViewWrapper as="div" style={{ display: "none" }} />;

  // Ungrouped table: original behavior.
  if (!grouping.groupByPropertyId) {
    return (
      <NodeViewWrapper
        as="div"
        className="db-row"
        style={{ gridTemplateColumns }}
      >
        <NodeViewContent as="div" />
      </NodeViewWrapper>
    );
  }

  // Grouped table.
  return (
    <NodeViewWrapper as="div" className="db-group-record-wrapper">
      {grouping.isFirstInGroup && (
        <CardItemGroup
          orientation="horizontal"
          style={{
            gap: 5,
            paddingTop: 20,
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
      <div
        className="db-row"
        style={{
          gridTemplateColumns,
          display: grouping.isCollapsed ? "none" : "grid",
        }}
      >
        <NodeViewContent as="div" />
      </div>
    </NodeViewWrapper>
  );
}
