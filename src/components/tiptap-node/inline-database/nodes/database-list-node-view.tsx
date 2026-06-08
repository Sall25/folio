import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { useDataSource } from "../hooks/use-data-source";
import { Cell } from "../components/cells/cell";
import type {
  DatabaseAttrs,
  DataSource,
  DataSourceRecord,
  DatabaseProperty,
  ListView,
  CellValue,
  DatabaseView,
} from "../types/types";
import "./database-list-node-view.scss";
import { resolveRecordFormulas } from "../components/formula-editor/resolve-records-formula";
import { recordMatchesFilters } from "../utils/apply-filters";
import { sortRecords } from "../utils/apply-sorts";
import { groupRecords } from "../utils/group-records";

function ListRow({
  record,
  inlineProperties,
  titleProp,
  onChange,
  view,
}: {
  record: DataSourceRecord;
  inlineProperties: DatabaseProperty[];
  titleProp: DatabaseProperty | undefined;
  onChange: (propertyId: string, value: CellValue | null) => void;
  view: DatabaseView;
}) {
  return (
    <div className="db-list-row">
      <div className="db-list-row__title">
        {titleProp && (
          <Cell
            property={titleProp}
            value={(record.values[titleProp.id] ?? null) as CellValue | null}
            record={record}
            onChange={(v) => onChange(titleProp.id, v)}
            view={view}
            properties={inlineProperties}
          />
        )}
      </div>

      <div className="db-list-row__props">
        {inlineProperties.map((prop) => (
          <Cell
            key={prop.id}
            property={prop}
            value={(record.values[prop.id] ?? null) as CellValue | null}
            record={record}
            onChange={(v) => onChange(prop.id, v)}
            view={view}
            properties={inlineProperties}
          />
        ))}
      </div>
    </div>
  );
}

export function DatabaseListNodeView({
  attrs,
  source,
  onUpdateView,
  view,
}: {
  attrs: DatabaseAttrs & { sourceId?: string | null };
  source: DataSource;
  onUpdateView: (patch: Partial<DatabaseView>) => void;
  view: DatabaseView;
}) {
  const { addPageAsync } = usePages();
  const { addRecordWithPageAsync, setCellValue } = useDataSource(
    attrs.sourceId,
  );
  const recordParentId = source.pageId ?? null;

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as ListView | undefined;

  const hidden = new Set(activeView?.hiddenProperties ?? []);
  const titleProp = source.properties.find((p) => p.config.type === "title");
  const inlineProperties = source.properties.filter(
    (p) => p.config.type !== "title" && !hidden.has(p.id),
  );

  const groupProp = activeView?.groupByPropertyId
    ? source.properties.find((p) => p.id === activeView.groupByPropertyId)
    : undefined;
  const collapsed = new Set(activeView?.collapsedGroups ?? []);

  const resolvedRecords = resolveRecordFormulas(
    source.records,
    source.properties,
  );
  // Filter → sort → group, all at render (no mutation of source.records).
  const filteredRecords = activeView?.filters?.length
    ? resolvedRecords.filter((r) => recordMatchesFilters(r, activeView.filters))
    : resolvedRecords;
  const sortedRecords = sortRecords(filteredRecords, activeView?.sorts ?? []);
  const groups = groupRecords(sortedRecords, groupProp);

  // Bucket records by group (or one bucket if ungrouped)
  // const groups = useMemo(() => {

  //   if (!groupProp)  return [{ key: "__all__", label: "", records: sortedRecords }];
  //   const map = new Map<string, DataSourceRecord[]>();
  //   for (const rec of sortedRecords) {
  //     const key = groupKeyFor(rec.values[groupProp.id], groupProp);
  //     if (!map.has(key)) map.set(key, []);
  //     map.get(key)!.push(rec);
  //   }
  //   return [...map.entries()].map(([key, records]) => ({
  //     key,
  //     label: groupLabel(key, groupProp),
  //     records,
  //   }));
  // }, [groupProp]);

  function toggleCollapse(key: string) {
    if (!activeView) return;
    const next = collapsed.has(key)
      ? [...collapsed].filter((k) => k !== key)
      : [...collapsed, key];
    onUpdateView({ collapsedGroups: next }); // needs db/onUpdateView passed in
  }

  const ungrouped = !groupProp;

  return (
    <div className="db-list" data-type="database-list">
      <div className="db-list__body">
        {groups.map((group) => {
          const isCollapsed = !ungrouped && collapsed.has(group.key);
          return (
            <div key={group.key} className="db-list-group">
              {!ungrouped && (
                <div className="db-list-group__header">
                  <Button
                    variant="ghost"
                    onClick={() => toggleCollapse(group.key)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="tiptap-button-icon" size={13} />
                    ) : (
                      <ChevronDown className="tiptap-button-icon" size={13} />
                    )}
                    <span className="tiptap-button-text">{group.label}</span>
                  </Button>
                  <Badge data-style="gray" size="small">
                    <span>{group.records.length}</span>
                  </Badge>
                </div>
              )}

              {!isCollapsed &&
                group.records.map((rec) => (
                  <ListRow
                    key={rec.id}
                    record={rec}
                    inlineProperties={inlineProperties}
                    titleProp={titleProp}
                    onChange={(propId, v) => setCellValue(rec.id, propId, v)}
                    view={view}
                  />
                ))}
            </div>
          );
        })}
      </div>

      <Button
        variant="ghost"
        style={{
          justifyContent: "flex-start",
          borderRadius: "var(--tt-radius-sm)",
        }}
        onClick={async () =>
          await addRecordWithPageAsync({
            title: "",
            parentPageId: recordParentId,
            createPage: addPageAsync,
          })
        }
      >
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text">New</span>
      </Button>
    </div>
  );
}
