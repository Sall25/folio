import type { RecordGroup } from "./group-records";

/** Marks a row slot occupied by a group header rather than a record. */
export const HEADER_SLOT = "__group_header__:";
/** Marks the per-group column-header (property columns) row — table only. */
export const COLUMNS_SLOT = "__group_columns__:";
export const NEW_SLOT = "__group_new__:";

/** Only the view kinds that render grouped rows through this layout. */
export type GroupedViewKind = "table" | "list";

interface GroupHeaderBase {
  key: string;
  label: string;
  count: number;
  /** 1-based CSS grid row of the group label header. */
  row: number;
  /** 1-based CSS grid row of the group's trailing "New page" row. */
  newRow: number;
}

/** Table groups carry a per-group column-header row. */
export interface TableGroupHeaderSlot extends GroupHeaderBase {
  kind: "table";
  /** 1-based CSS grid row of the per-group column-header strip. */
  columnsRow: number;
}

/** List groups have no column-header strip. */
export interface ListGroupHeaderSlot extends GroupHeaderBase {
  kind: "list";
}

export type GroupHeaderSlot = TableGroupHeaderSlot | ListGroupHeaderSlot;

/** Layout is parameterized by the view kind so headers narrow correctly. */
export interface GroupedRowLayout<K extends GroupedViewKind = GroupedViewKind> {
  rowSlots: string[];
  headers: K extends "table" ? TableGroupHeaderSlot[] : ListGroupHeaderSlot[];
}

export function buildGroupedRows<K extends GroupedViewKind>(
  kind: K,
  groups: RecordGroup[],
  collapsedKeys: Set<string>,
  showEmptyGroups: boolean,
): GroupedRowLayout<K> {
  const rowSlots: string[] = [];
  const headers: GroupHeaderSlot[] = [];
  const hasColumns = kind === "table";

  for (const g of groups) {
    if (g.records.length === 0 && !showEmptyGroups) continue;

    const collapsed = collapsedKeys.has(g.key);

    // 1) Group label row.
    const row = rowSlots.length + 1;
    rowSlots.push(HEADER_SLOT + g.key);

    // 2) Table only: per-group column-header strip, right under the label.
    //    Hidden by CSS when collapsed but still occupies a slot so subsequent
    //    row numbers stay stable. List has no such strip.
    let columnsRow = 0;
    if (hasColumns) {
      columnsRow = rowSlots.length + 1;
      rowSlots.push(COLUMNS_SLOT + g.key);
    }

    // 3) The group's records (omitted when collapsed → CSS display:none path).
    if (!collapsed) {
      for (const r of g.records) rowSlots.push(r.id);
    }

    // 4) Trailing "New page" row.
    const newRow = rowSlots.length + 1;
    rowSlots.push(NEW_SLOT + g.key);

    if (hasColumns) {
      headers.push({
        kind: "table",
        key: g.key,
        label: g.label,
        count: g.records.length,
        row,
        columnsRow,
        newRow,
      });
    } else {
      headers.push({
        kind: "list",
        key: g.key,
        label: g.label,
        count: g.records.length,
        row,
        newRow,
      });
    }
  }

  return { rowSlots, headers } as GroupedRowLayout<K>;
}
