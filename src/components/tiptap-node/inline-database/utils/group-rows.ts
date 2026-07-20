import type { RecordGroup } from "./group-records";

/** Marks a row slot occupied by a group header rather than a record. */
export const HEADER_SLOT = "__group_header__:";
export const NEW_SLOT = "__group_new__:";

export interface GroupHeaderSlot {
  key: string;
  label: string;
  count: number;
  /** 1-based CSS grid row of the header. */
  row: number;
  /** 1-based CSS grid row of the group's trailing "New page" row. */
  newRow: number;
}

export interface GroupedRowLayout {
  /**
   * The table's row layout: record ids interleaved with header sentinels.
   *
   * Published AS `sortedRecordIds`, so a record's `indexOf` already yields its
   * final grid row with headers counted — no second map to thread through the
   * bridge. Collapsed groups simply omit their records, which the existing
   * "not in the list → display:none" path renders correctly.
   */
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
    headers.push({
      key: g.key,
      label: g.label,
      count: g.records.length,
      row: rowSlots.length + 1,
      newRow: 0, // patched below once the group's records are laid out
    });
    rowSlots.push(HEADER_SLOT + g.key);

    if (!collapsedKeys.has(g.key)) {
      for (const r of g.records) rowSlots.push(r.id);
    }

    // Trailing "New page" row. It occupies a slot even when collapsed —
    // simpler than conditionally shifting every subsequent row, and the row
    // is hidden by CSS in that case.
    headers[headers.length - 1].newRow = rowSlots.length + 1;
    rowSlots.push(NEW_SLOT + g.key);

    if (!collapsedKeys.has(g.key)) {
      for (const r of g.records) rowSlots.push(r.id);
    }
  }

  return { rowSlots, headers };
}
