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

function ListRow({
  record,
  inlineProperties,
  titleProp,
  onChange,
  view,
}: {
  record: Page;
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
            value={(record.values?.[titleProp.id] ?? null) as CellValue | null}
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
            value={(record.values?.[prop.id] ?? null) as CellValue | null}
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
        onClick={async () => {
          addRecordAsync({ title: "" })
            .then((page) => setTarget({ pageId: page.id, view: "Peek" }))
            .catch(() => console.log("failed to add page to list"));
        }}
      >
        <Plus className="tiptap-button-icon" />
        <span className="tiptap-button-text">New</span>
      </Button>
    </div>
  );
}
