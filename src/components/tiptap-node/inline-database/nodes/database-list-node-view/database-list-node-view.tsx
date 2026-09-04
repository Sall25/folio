import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { useDataSource } from "../../hooks/use-data-source";
import type {
  ListView,
  CellValue,
  Page,
  ID,
  PropertyType,
  DatabaseProperty,
} from "src/types";
import "./database-list-node-view.scss";
import { usePageViewActions } from "src/components/tiptap-templates/simple/context/page-view-context";
import { memo, useCallback, useMemo } from "react";
import { ListRow } from "./list-row";
import { useListRecords } from "../../hooks/use-list-records";
import { useDatabaseContext } from "../database-context";

const EMPTY_PROPERTIES: DatabaseProperty[] = [];

function DatabaseListNodeViewImpl() {
  const {
    attrs,
    source,
    onUpdateView,
    db,
    sortedRecords: resolvedRecords,
  } = useDatabaseContext();
  const view = db.activeView;
  const { addRecordAsync, setCellValue } = useDataSource(attrs.sourceId);
  const { setTarget } = usePageViewActions();

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as ListView | undefined;

  const titleProp = useMemo(
    () => source?.properties.find((p) => p.config.type === "title"),
    [source],
  );
  const inlineProperties =
    useMemo(() => {
      const hidden = new Set(activeView?.hiddenProperties ?? []);
      return source?.properties.filter(
        (p) => p.config.type !== "title" && !hidden.has(p.id),
      );
    }, [source?.properties, activeView?.hiddenProperties]) ?? EMPTY_PROPERTIES;

  const groupProp = activeView?.groupByPropertyId
    ? source?.properties.find((p) => p.id === activeView.groupByPropertyId)
    : undefined;
  const collapsed = new Set(activeView?.collapsedGroups ?? []);
  const ungrouped = !groupProp;

  const gridTemplateColumns = `minmax(220px, 1fr) repeat(${inlineProperties.length}, max-content)`;

  const { groups, columnValuesByProp } = useListRecords(
    resolvedRecords,
    source!,
    activeView,
    groupProp,
  );

  const onChange = useCallback(
    (rec: Page, propId: ID, v: CellValue<PropertyType>) =>
      setCellValue(rec.id, propId, v),
    [setCellValue],
  );

  function toggleCollapse(key: string) {
    if (!activeView) return;
    const next = collapsed.has(key)
      ? [...collapsed].filter((k) => k !== key)
      : [...collapsed, key];
    onUpdateView({ collapsedGroups: next });
  }

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
                    databaseId={attrs.id}
                    inlineProperties={inlineProperties}
                    titleProp={titleProp}
                    onChange={onChange}
                    view={view}
                    columnValuesByProp={columnValuesByProp}
                  />
                ))}
            </div>
          );
        })}
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
    </div>
  );
}

export const DatabaseListNodeView = memo(DatabaseListNodeViewImpl);
