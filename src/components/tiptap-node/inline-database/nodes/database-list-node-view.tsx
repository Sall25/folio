import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { useDataSource } from "../hooks/use-data-source";
import { Cell } from "../components/cells/cell";
import type {
  DatabaseAttrs,
  DataSource,
  DatabaseProperty,
  ListView,
  CellValue,
  DatabaseView,
  Page,
  ID,
} from "src/types";
import "./database-list-node-view.scss";
import { recordMatchesFilters } from "../utils/apply-filters";
import { sortRecords } from "../utils/apply-sorts";
import { groupRecords } from "../utils/group-records";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { memo, useMemo } from "react";

function ListRow({
  record,
  inlineProperties,
  titleProp,
  onChange,
  view,
  columnValuesByProp,
}: {
  record: Page;
  inlineProperties: DatabaseProperty[];
  titleProp: DatabaseProperty | undefined;
  onChange: (propertyId: string, value: CellValue | null) => void;
  view: DatabaseView;
  columnValuesByProp: Record<string, CellValue[]>;
}) {
  return (
    <div className="db-list-row">
      <div className="db-list-row__title">
        {titleProp && (
          <Cell
            property={titleProp}
            value={(record.values?.[titleProp.id] ?? null) as CellValue | null}
            record={record}
            onChange={(v) => onChange(titleProp.id, v)}
            view={view}
            properties={inlineProperties}
            columnValues={columnValuesByProp[titleProp.id]}
          />
        )}
      </div>

      <div className="db-list-row__props">
        {inlineProperties.map((prop) => (
          <Cell
            key={prop.id}
            property={prop}
            value={(record.values?.[prop.id] ?? null) as CellValue | null}
            record={record}
            onChange={(v) => onChange(prop.id, v)}
            view={view}
            properties={inlineProperties}
            columnValues={columnValuesByProp[prop.id]}
          />
        ))}
      </div>
    </div>
  );
}

function DatabaseListNodeViewImpl({
  attrs,
  source,
  onUpdateView,
  view,
}: {
  attrs: DatabaseAttrs & { sourceId?: ID | null };
  source: DataSource;
  onUpdateView: (patch: Partial<DatabaseView>) => void;
  view: DatabaseView;
}) {
  // Read the SAME resolved, source-scoped rows the table view uses. The list
  // previously derived its own set from usePages() (every page in the
  // workspace) and never filtered to this source — which is why unrelated
  // pages showed up as random "Untitled" rows with foreign icons.
  const { addRecordAsync, setCellValue, resolvedRecords } = useDataSource(
    attrs.sourceId,
  );
  const { setTarget } = usePageView();

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as ListView | undefined;

  const hidden = new Set(activeView?.hiddenProperties ?? []);
  const titleProp = source.properties.find((p) => p.config.type === "title");
  const inlineProperties = source.properties.filter(
    (p) => p.config.type !== "title" && !hidden.has(p.id),
  );

  // Shared grid tracks: title column (flexes, truncates) + one max-content
  // column per visible property. Every row subgrids onto these, so the
  // columns line up straight down the list.
  const gridTemplateColumns = `minmax(220px, 1fr) repeat(${inlineProperties.length}, max-content)`;

  const groupProp = activeView?.groupByPropertyId
    ? source.properties.find((p) => p.id === activeView.groupByPropertyId)
    : undefined;
  const collapsed = new Set(activeView?.collapsedGroups ?? []);

  // Filter → sort → group, all at render (no mutation of source rows).
  const filteredRecords = activeView?.filters?.length
    ? resolvedRecords.filter((r) => recordMatchesFilters(r, activeView.filters))
    : resolvedRecords;
  const sortedRecords = sortRecords(filteredRecords, activeView?.sorts ?? []);
  const groups = groupRecords(sortedRecords, groupProp);

  function toggleCollapse(key: string) {
    if (!activeView) return;
    const next = collapsed.has(key)
      ? [...collapsed].filter((k) => k !== key)
      : [...collapsed, key];
    onUpdateView({ collapsedGroups: next });
  }

  const ungrouped = !groupProp;

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

  return (
    <div className="db-list" data-type="database-list">
      <div className="db-list__body">
        {groups.map((group) => {
          const isCollapsed = !ungrouped && collapsed.has(group.key);
          return (
            <div
              key={group.key}
              className="db-list-group"
              style={{ gridTemplateColumns }}
            >
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
                    columnValuesByProp={columnValuesByProp}
                  />
                ))}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="db-new-row"
        contentEditable={false}
        onClick={() => {
          addRecordAsync({ title: "" })
            .then((page) => setTarget({ pageId: page.id, view: "Peek" }))
            .catch(() => console.log("failed to add page to list"));
        }}
      >
        <span className="db-new-row__label">
          <Plus size={16} />
          <span>New page</span>
        </span>
      </button>
    </div>
  );
}

export const DatabaseListNodeView = memo(DatabaseListNodeViewImpl);
