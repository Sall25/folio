import { useMemo } from "react";
import type {
  CellValue,
  DataSource,
  Page,
  BoardView,
  DatabaseProperty,
} from "src/types";
import type { UseDatabaseReturn } from "./use-database";
import {
  getColumnDefs,
  columnKeyFor,
  NONE_COLUMN_ID,
} from "../nodes/database-board-node-view/utils";

export interface BoardColumn {
  key: string;
  label: string;
  col: number;
  color?: string;
  value?: CellValue;
  rows: number;
  newRow: number;
}

export type BoardPlacement = Record<
  string,
  { col: number; row: number; columnKey: string }
>;

export interface BoardLayout {
  columns: BoardColumn[];
  placement: BoardPlacement;
  groupProp: DatabaseProperty | undefined;
}

export function useBoardLayout(
  sortedRecords: Page[],
  source: DataSource | null,
  db: UseDatabaseReturn,
): { boardLayout: BoardLayout } {
  const activeView = db.activeView as BoardView | undefined;

  const groupProp =
    activeView?.type === "board"
      ? source?.properties.find((p) => p.id === activeView.groupByPropertyId)
      : undefined;

  const hiddenGroups = useMemo(
    () => new Set(activeView?.hiddenGroups ?? []),
    [activeView],
  );

  const manualOrder = activeView?.manualOrder;
  const showEmptyGroups = activeView?.showEmptyGroups ?? false;

  const boardLayout = useMemo<BoardLayout>(() => {
    if (!groupProp || !source) {
      return { columns: [], placement: {}, groupProp };
    }

    // Predefined-option types (select/status/checkbox/multi_select) → columns
    // from config. Value types (text/number/date/person/…) → columns derived
    // from the records' DISTINCT values, since getColumnDefs returns [] for them.
    const defs = getColumnDefs(groupProp);
    let base: {
      id: string;
      label: string;
      color?: string;
      value?: CellValue;
    }[];

    if (defs.length > 0) {
      base = defs;
    } else {
      const seen = new Map<
        string,
        { id: string; label: string; value?: CellValue }
      >();
      for (const rec of sortedRecords) {
        const raw = rec.values?.[groupProp.id] ?? null;
        const key = columnKeyFor(raw, groupProp);
        if (key === NONE_COLUMN_ID) continue;
        if (!seen.has(key)) {
          seen.set(key, { id: key, label: key, value: raw as CellValue });
        }
      }
      base = [...seen.values()];
    }

    const all = [
      {
        key: NONE_COLUMN_ID,
        label: `No ${groupProp.name}`,
        color: undefined as string | undefined,
        value: null as CellValue,
      },
      ...base.map((d) => ({
        key: d.id,
        label: d.label,
        color: (d as { color?: string }).color,
        value: d.value,
      })),
    ].filter((c) => !hiddenGroups.has(c.key));

    // Bucket records by their group value.
    const byColumn = new Map<string, Page[]>();
    all.forEach((c) => byColumn.set(c.key, []));
    for (const rec of sortedRecords) {
      const key = columnKeyFor(rec.values?.[groupProp.id], groupProp);
      if (byColumn.has(key)) byColumn.get(key)!.push(rec);
    }

    // Drop empty columns unless showEmptyGroups (keep the NONE column only if
    // it has records or showEmptyGroups).
    const columns: BoardColumn[] = all
      .filter((c) => showEmptyGroups || (byColumn.get(c.key)?.length ?? 0) > 0)
      .map((c, i) => {
        const rows = byColumn.get(c.key)?.length ?? 0;
        return {
          key: c.key,
          label: c.label,
          color: c.color,
          value: c.value,
          col: i,
          rows,
          newRow: rows + 2,
        };
      });

    // Manual order (flat) → per-column row; unlisted keep sorted order.
    const orderIndex = new Map<string, number>();
    (manualOrder ?? []).forEach((id, i) => orderIndex.set(id, i));

    const placement: Record<
      string,
      { col: number; row: number; color?: string; columnKey: string }
    > = {};
    columns.forEach((c) => {
      const recs = [...(byColumn.get(c.key) ?? [])].sort((a, b) => {
        const ia = orderIndex.get(a.id) ?? Infinity;
        const ib = orderIndex.get(b.id) ?? Infinity;
        return ia - ib;
      });
      recs.forEach((rec, row) => {
        placement[rec.id] = {
          col: c.col,
          row,
          color: c.color,
          columnKey: c.key,
        };
      });
    });

    return { columns, placement, groupProp };
  }, [
    groupProp,
    source,
    sortedRecords,
    manualOrder,
    showEmptyGroups,
    hiddenGroups,
  ]);

  return { boardLayout };
}
