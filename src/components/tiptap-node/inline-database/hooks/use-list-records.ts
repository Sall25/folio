import { useMemo } from "react";
import type {
  CellValue,
  DataSource,
  DatabaseProperty,
  ListView,
  Page,
} from "src/types";
import { recordMatchesFilters } from "../utils/apply-filters";
import { sortRecords } from "../utils/apply-sorts";
import { groupRecords } from "../utils/group-records";

export function useListRecords(
  resolvedRecords: Page[],
  source: DataSource,
  activeView: ListView | undefined,
  groupProp: DatabaseProperty | undefined,
) {
  const filters = activeView?.filters;
  const sorts = activeView?.sorts;

  const groups = useMemo(() => {
    const filtered = filters?.length
      ? resolvedRecords.filter((r) => recordMatchesFilters(r, filters))
      : resolvedRecords;
    const sorted = sortRecords(filtered, sorts ?? []);
    return groupRecords(sorted, groupProp);
  }, [resolvedRecords, filters, sorts, groupProp]);

  const columnValuesByProp = useMemo(() => {
    const map: Record<string, CellValue[]> = {};
    for (const prop of source.properties) {
      if (prop.config.type !== "number") continue;
      map[prop.id] = resolvedRecords.map(
        (r) => (r.values?.[prop.id] ?? null) as CellValue,
      );
    }
    return map;
  }, [resolvedRecords, source.properties]);

  return { groups, columnValuesByProp };
}
