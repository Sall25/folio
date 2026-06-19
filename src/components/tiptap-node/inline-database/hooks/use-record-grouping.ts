import { useCallback } from "react";
import type {
  Page,
  DatabaseProperty,
  DatabaseView,
  DataSource,
} from "src/types";
import { groupKeyFor, groupLabel, NONE_KEY } from "../utils/group-records";
import { usePatchDataSource } from "src/hooks/use-patch-data-source";
import { patchDataSource } from "src/api/data-sources";

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

export function useRecordGrouping(
  source: DataSource | null,
  activeView: DatabaseView | null | undefined,
  rows: Page[], // the source's rows — from useRows(source.id)
  row: Page, // THIS row
): RecordGroupingResult {
  const patchSource = usePatchDataSource(({ id, patch }) =>
    patchDataSource(id, patch),
  );

  const groupByPropertyId =
    (activeView as { groupByPropertyId?: string | null })?.groupByPropertyId ??
    null;

  const groupProp =
    source && groupByPropertyId
      ? (source.properties.find((p) => p.id === groupByPropertyId) ?? null)
      : null;

  const toggleCollapse = useCallback(() => {
    if (!source || !activeView || !groupProp) return;
    const collapsedGroups =
      (activeView as { collapsedGroups?: string[] }).collapsedGroups ?? [];
    const myKey = groupKeyFor(row.values?.[groupProp.id], groupProp);
    const next = collapsedGroups.includes(myKey)
      ? collapsedGroups.filter((k) => k !== myKey)
      : [...collapsedGroups, myKey];

    // persist the view change — views live on the source now, not a db node
    patchSource.mutate({
      id: source.id,
      patch: {
        views: source.views.map((v) =>
          v.id !== activeView.id ? v : { ...v, collapsedGroups: next },
        ),
      },
    });
  }, [source, activeView, groupProp, row, patchSource]);

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

  if (!source || !activeView || !groupByPropertyId || !groupProp) return empty;

  const collapsedGroups =
    (activeView as { collapsedGroups?: string[] }).collapsedGroups ?? [];

  const myKey = groupKeyFor(row.values?.[groupProp.id], groupProp);

  const isCollapsed = collapsedGroups.includes(myKey);
  const groupRows = rows.filter(
    (r) => groupKeyFor(r.values?.[groupProp.id], groupProp) === myKey,
  );
  const isFirstInGroup = groupRows[0]?.id === row.id;
  const hidden = isCollapsed && !isFirstInGroup;

  const label = groupLabel(myKey, groupProp);
  const color = colorFor(myKey, groupProp);

  return {
    groupByPropertyId,
    groupProp,
    isFirstInGroup,
    isCollapsed,
    hidden,
    count: groupRows.length,
    label,
    color,
    toggleCollapse,
  };
}

// color isn't in groupRecords (it returns key/label/records), so derive here
function colorFor(key: string, prop: DatabaseProperty): string | undefined {
  if (key === NONE_KEY) return undefined;
  const cfg = prop.config;
  if (cfg.type === "select" || cfg.type === "multi_select")
    return cfg.options.find((o) => o.id === key)?.color;
  if (cfg.type === "status")
    return cfg.groups.flatMap((g) => g.items).find((i) => i.id === key)?.color;
  return undefined;
}
