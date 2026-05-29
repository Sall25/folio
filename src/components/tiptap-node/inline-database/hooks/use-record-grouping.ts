import { useCallback } from "react";
import type { Node } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/core";
import type {
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  SelectOption,
} from "../types/types";
import { groupRecords } from "../utils/group-records";

function getCellValue(record: Node, propertyId: string): unknown {
  let value: unknown = null;
  record.forEach((cell) => {
    if (cell.attrs.propertyId !== propertyId) return;
    value = cell.attrs.value ?? cell.textContent ?? null;
  });
  return value;
}

function getGroupKey(value: unknown, propertyType: string): string {
  if (value == null || value === "") return "__empty__";
  if (propertyType === "checkbox") return value ? "true" : "false";
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

export interface RecordGroupingResult {
  groupByPropertyId: string | null;
  groupProp: DatabaseProperty | null;
  isFirstInGroup: boolean;
  isCollapsed: boolean;
  hidden: boolean;
  count: number;
  label: string;
  color: string | undefined;
  toggleCollapse: () => void;
}

/**
 * Shared grouping logic for any per-record node view (table, list, …).
 * Safe to call unconditionally: pass null db/activeView and it returns an
 * inert result (groupByPropertyId === null), so callers can invoke it before
 * their early returns without violating the rules of hooks.
 */
export function useRecordGrouping(
  editor: Editor,
  db: Node | null,
  activeView: DatabaseView | null | undefined,
  node: Node,
): RecordGroupingResult {
  // The only hook — always called, regardless of db/activeView.
  const toggleCollapse = useCallback(() => {
    if (!db || !activeView) return;
    const attrs = db.attrs as DatabaseAttrs;
    const groupByPropertyId =
      (activeView as { groupByPropertyId?: string | null }).groupByPropertyId ??
      null;
    if (!groupByPropertyId) return;
    const groupProp = attrs.properties.find((p) => p.id === groupByPropertyId);
    if (!groupProp) return;
    const collapsedGroups =
      (activeView as { collapsedGroups?: string[] }).collapsedGroups ?? [];
    const myKey = getGroupKey(
      getCellValue(node, groupProp.id),
      groupProp.config.type,
    );
    const isCollapsed = collapsedGroups.includes(myKey);
    const next = isCollapsed
      ? collapsedGroups.filter((k) => k !== myKey)
      : [...collapsedGroups, myKey];
    editor.commands.updateDatabaseAttrs(attrs.id, {
      views: attrs.views.map((v) =>
        v.id !== activeView.id ? v : { ...v, collapsedGroups: next },
      ),
    });
  }, [editor, db, activeView, node]);

  const empty: RecordGroupingResult = {
    groupByPropertyId: null,
    groupProp: null,
    isFirstInGroup: false,
    isCollapsed: false,
    hidden: false,
    count: 0,
    label: "",
    color: undefined,
    toggleCollapse,
  };

  if (!db || !activeView) return empty;

  const attrs = db.attrs as DatabaseAttrs;
  const groupByPropertyId =
    (activeView as { groupByPropertyId?: string | null }).groupByPropertyId ??
    null;
  const collapsedGroups =
    (activeView as { collapsedGroups?: string[] }).collapsedGroups ?? [];
  const showEmptyGroups =
    (activeView as { showEmptyGroups?: boolean }).showEmptyGroups ?? false;

  const groupProp = groupByPropertyId
    ? (attrs.properties.find((p) => p.id === groupByPropertyId) ?? null)
    : null;

  if (!groupByPropertyId || !groupProp) return empty;

  const allRecords: Node[] = [];
  db.forEach((child) => {
    if (child.type.name === "databaseRecord") allRecords.push(child);
  });

  const groups = groupRecords(
    allRecords,
    groupProp,
    collapsedGroups,
    showEmptyGroups,
  );

  const myKey = getGroupKey(
    getCellValue(node, groupByPropertyId),
    groupProp.config.type,
  );
  const myGroup = groups.find((g) => g.key === myKey);

  const isCollapsed = collapsedGroups.includes(myKey);
  const isFirstInGroup = myGroup?.records[0]?.attrs.id === node.attrs.id;
  const hidden = !!myGroup?.isCollapsed && !isFirstInGroup;

  const config = groupProp.config;
  const label = (() => {
    if (myKey === "__empty__") return `No ${groupProp.name}`;
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
        gs.flatMap((g) => g.items).find((i) => i.id === myKey)?.name ?? myKey
      );
    }
    if (config.type === "checkbox")
      return myKey === "true" ? "Checked" : "Unchecked";
    return myKey;
  })();

  const color = (() => {
    if (myKey === "__empty__") return undefined;
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
  })();

  return {
    groupByPropertyId,
    groupProp,
    isFirstInGroup,
    isCollapsed,
    hidden,
    count: myGroup?.records.length ?? 0,
    label,
    color,
    toggleCollapse,
  };
}
