import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback, useEffect, useReducer } from "react";
import type { DatabaseAttrs, TableView } from "../types/types";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import type { Transaction } from "@tiptap/pm/state";
import { DatabaseRecordListView } from "./database-record-list-view";
import { DatabaseRecordBoardView } from "./database-record-board-view";
import { DatabaseRecordGalleryView } from "./database-record-gallery-view";
import { recordMatchesFilters } from "../utils/apply-filters";
import { groupRecords } from "../utils/group-records";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { SelectOption } from "../types/types";
import "./database-record-node-view.scss";

function getCellValue(
  record: import("@tiptap/pm/model").Node,
  propertyId: string,
): unknown {
  let value: unknown = null;
  record.forEach((cell) => {
    if (cell.attrs.propertyId !== propertyId) return;
    value = cell.attrs.value ?? null;
  });
  return value;
}

function getGroupKey(value: unknown, propertyType: string): string {
  if (value == null || value === "") return "__empty__";
  if (propertyType === "checkbox") return value ? "true" : "false";
  // SelectOption object — use its id
  if (typeof value === "object" && value !== null && "id" in value) {
    return String((value as { id: string }).id);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "__empty__";
    const first = value[0];
    return typeof first === "object" && first !== null && "id" in first
      ? String((first as { id: string }).id)
      : String(first);
  }
  return String(value);
}

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

  const db = getParentDatabase();
  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;
  const activeView =
    attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0];

  // Apply filters
  if (!recordMatchesFilters(node, activeView.filters ?? [])) {
    return <NodeViewWrapper as="div" style={{ display: "none" }} />;
  }

  const hiddenProperties = new Set(activeView.hiddenProperties ?? []);
  const visibleProperties = attrs.properties.filter(
    (p) => !hiddenProperties.has(p.id),
  );
  const gridTemplateColumns =
    visibleProperties.map((p) => `${p.width ?? 160}px`).join(" ") + " 1fr";

  if (activeView.type === "gallery")
    return <DatabaseRecordGalleryView {...props} />;
  if (activeView.type === "board")
    return <DatabaseRecordBoardView {...props} />;
  if (activeView.type === "list") return <DatabaseRecordListView {...props} />;

  // ── Grouping ──────────────────────────────────────────────────────────────
  const groupByPropertyId = (activeView as TableView).groupByPropertyId;
  const collapsedGroups = (activeView as TableView).collapsedGroups ?? [];
  const showEmptyGroups = (activeView as TableView).showEmptyGroups ?? false;

  if (groupByPropertyId) {
    const groupProp = attrs.properties.find((p) => p.id === groupByPropertyId);

    if (groupProp) {
      // Collect all sibling records
      const allRecords: import("@tiptap/pm/model").Node[] = [];
      db.forEach((child) => {
        if (child.type.name === "databaseRecord") allRecords.push(child);
      });

      const groups = groupRecords(
        allRecords,
        groupProp,
        collapsedGroups,
        showEmptyGroups,
      );

      // Find which group this record belongs to
      const value = getCellValue(node, groupByPropertyId);
      const myKey = getGroupKey(value, groupProp.config.type);
      const myGroup = groups.find((g) => g.key === myKey);

      // If this group is collapsed and this is not the first record, hide
      if (myGroup?.isCollapsed) {
        return <NodeViewWrapper as="div" style={{ display: "none" }} />;
      }

      // Check if this record is the first in its group
      const isFirstInGroup = myGroup?.records[0]?.attrs.id === node.attrs.id;

      // Get group label/color for header
      const getLabel = () => {
        if (myKey === "__empty__") return `No ${groupProp.name}`;
        const config = groupProp.config;
        if (config.type === "select" || config.type === "multi_select") {
          return (
            (config as { options: SelectOption[] }).options.find(
              (o) => o.id === myKey,
            )?.label ?? myKey
          );
        }
        if (config.type === "status") {
          const gs = (
            config as { groups: { items: { id: string; name: string }[] }[] }
          ).groups;
          return (
            gs.flatMap((g) => g.items).find((i) => i.id === myKey)?.name ??
            myKey
          );
        }
        if (config.type === "checkbox")
          return myKey === "true" ? "Checked" : "Unchecked";
        return myKey;
      };

      const getColor = () => {
        if (myKey === "__empty__") return undefined;
        const config = groupProp.config;
        if (config.type === "select" || config.type === "multi_select") {
          return (config as { options: SelectOption[] }).options.find(
            (o) => o.id === myKey,
          )?.color;
        }
        if (config.type === "status") {
          const gs = (
            config as { groups: { items: { id: string; color: string }[] }[] }
          ).groups;
          return gs.flatMap((g) => g.items).find((i) => i.id === myKey)?.color;
        }
        return undefined;
      };

      const isCollapsed = collapsedGroups.includes(myKey);

      const toggleCollapse = () => {
        const next = isCollapsed
          ? collapsedGroups.filter((k) => k !== myKey)
          : [...collapsedGroups, myKey];
        editor.commands.updateDatabaseAttrs(attrs.id, {
          views: attrs.views.map((v) =>
            v.id !== activeView.id ? v : { ...v, collapsedGroups: next },
          ),
        });
      };

      return (
        <NodeViewWrapper as="div" className="db-group-record-wrapper">
          {isFirstInGroup && (
            <div className="db-group-header">
              <button
                className="db-group-header__toggle"
                onClick={toggleCollapse}
              >
                {isCollapsed ? (
                  <ChevronRight size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
              {getColor() && (
                <span
                  className="db-group-header__dot"
                  style={{ background: getColor() }}
                />
              )}
              <span className="db-group-header__label">{getLabel()}</span>
              <span className="db-group-header__count">
                {myGroup?.records.length ?? 0}
              </span>
              <button
                className="db-group-header__add"
                onClick={() => editor.commands.addDatabaseRecord(attrs.id)}
              >
                <Plus size={12} />
              </button>
            </div>
          )}
          <div
            className="db-row"
            style={{
              gridTemplateColumns,
              display: isCollapsed ? "none" : "grid",
            }}
          >
            <NodeViewContent as="div" />
          </div>
        </NodeViewWrapper>
      );
    }
  }

  // ── Table view (default, no grouping) ─────────────────────────────────────
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
