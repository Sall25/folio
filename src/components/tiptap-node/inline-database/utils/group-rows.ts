import type { RecordGroup } from "./group-records";

/** Marks a row slot occupied by a group header rather than a record. */
export const HEADER_SLOT = "__group_header__:";
/** Marks the per-group column-header (property columns) row. */
export const COLUMNS_SLOT = "__group_columns__:";
export const NEW_SLOT = "__group_new__:";

export interface GroupHeaderSlot {
  key: string;
  label: string;
  count: number;
  /** 1-based CSS grid row of the group label header. */
  row: number;
  /** 1-based CSS grid row of the per-group column-header strip. */
  columnsRow: number;
  /** 1-based CSS grid row of the group's trailing "New page" row. */
  newRow: number;
}

export interface GroupedRowLayout {
  rowSlots: string[];
  headers: GroupHeaderSlot[];
}

export function buildGroupedRows(
  groups: RecordGroup[],
  collapsedKeys: Set<string>,
  showEmptyGroups: boolean,
): GroupedRowLayout {
  const rowSlots: string[] = [];
  const headers: GroupHeaderSlot[] = [];

  for (const g of groups) {
    if (g.records.length === 0 && !showEmptyGroups) continue;

    const collapsed = collapsedKeys.has(g.key);

    // 1) Group label row.
    const headerRow = rowSlots.length + 1;
    rowSlots.push(HEADER_SLOT + g.key);

    // 2) Per-group column-header strip (property columns), right under the
    //    label. Hidden by CSS when the group is collapsed, but still occupies a
    //    slot so subsequent row numbers stay stable.
    const columnsRow = rowSlots.length + 1;
    rowSlots.push(COLUMNS_SLOT + g.key);

    // 3) The group's records (omitted when collapsed → CSS display:none path).
    if (!collapsed) {
      for (const r of g.records) rowSlots.push(r.id);
    }

    // 4) Trailing "New page" row.
    const newRow = rowSlots.length + 1;
    rowSlots.push(NEW_SLOT + g.key);

    headers.push({
      key: g.key,
      label: g.label,
      count: g.records.length,
      row: headerRow,
      columnsRow,
      newRow,
    });
  }

  return { rowSlots, headers };
}
