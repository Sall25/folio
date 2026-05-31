import { Plus, ChevronDown, ChevronRight, PanelRightOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { usePeekPage } from "src/components/tiptap-templates/simple/context/peek-page-context";
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

const NONE_KEY = "__none__";

function groupKeyFor(value: unknown, prop: DatabaseProperty): string {
  if (value == null) return NONE_KEY;
  const t = prop.config.type;
  if (t === "checkbox") return value ? "true" : "false";
  if (typeof value === "object" && value !== null && "id" in value)
    return String((value as { id: string }).id);
  if (Array.isArray(value)) {
    const first = value[0];
    return first == null
      ? NONE_KEY
      : typeof first === "object" && "id" in first
        ? String((first as { id: string }).id)
        : String(first);
  }
  return String(value);
}

function groupLabel(key: string, prop: DatabaseProperty): string {
  if (key === NONE_KEY) return `No ${prop.name}`;
  const cfg = prop.config;
  if (cfg.type === "select" || cfg.type === "multi_select")
    return cfg.options.find((o) => o.id === key)?.label ?? key;
  if (cfg.type === "status")
    return (
      cfg.groups.flatMap((g) => g.items).find((i) => i.id === key)?.name ?? key
    );
  if (cfg.type === "checkbox") return key === "true" ? "Checked" : "Unchecked";
  return key;
}

function ListRow({
  record,
  inlineProperties,
  titleProp,
  onChange,
}: {
  record: DataSourceRecord;
  inlineProperties: DatabaseProperty[];
  titleProp: DatabaseProperty | undefined;
  onChange: (propertyId: string, value: CellValue | null) => void;
}) {
  const { setPeekPageId } = usePeekPage();
  const [hover, setHover] = useState(false);
  const hasPage = record.pageId != null;

  return (
    <div
      className="db-list-row"
      onMouseOver={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="db-list-row__title">
        {titleProp && (
          <Cell
            property={titleProp}
            value={(record.values[titleProp.id] ?? null) as CellValue | null}
            record={record}
            onChange={(v) => onChange(titleProp.id, v)}
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
          />
        ))}
      </div>

      {hasPage && hover && (
        <Button
          variant="ghost"
          className="db-list-row__open"
          onClick={() => record.pageId != null && setPeekPageId(record.pageId)}
        >
          <PanelRightOpen className="tiptap-button-icon" size={12} />
          <span className="tiptap-button-text">Open</span>
        </Button>
      )}
    </div>
  );
}

export function DatabaseListNodeView({
  attrs,
  source,
  onUpdateView,
}: {
  attrs: DatabaseAttrs & { sourceId?: string | null };
  source: DataSource;
  onUpdateView: (patch: Partial<DatabaseView>) => void;
}) {
  const { addPageAsync } = usePages();
  const { addRecordWithPageAsync, setCellValue } = useDataSource(
    attrs.sourceId,
  );
  const recordParentId = source.pageId ?? null;

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as ListView | undefined;

  const visibleIds = new Set(activeView?.visibleProperties ?? []);
  const titleProp = source.properties.find((p) => p.config.type === "title");
  const inlineProperties = source.properties.filter(
    (p) =>
      p.config.type !== "title" &&
      (visibleIds.size === 0 || visibleIds.has(p.id)),
  );

  const groupProp = activeView?.groupByPropertyId
    ? source.properties.find((p) => p.id === activeView.groupByPropertyId)
    : undefined;
  const collapsed = new Set(activeView?.collapsedGroups ?? []);

  // Bucket records by group (or one bucket if ungrouped)
  const groups = useMemo(() => {
    if (!groupProp)
      return [{ key: "__all__", label: "", records: source.records }];
    const map = new Map<string, DataSourceRecord[]>();
    for (const rec of source.records) {
      const key = groupKeyFor(rec.values[groupProp.id], groupProp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(rec);
    }
    return [...map.entries()].map(([key, records]) => ({
      key,
      label: groupLabel(key, groupProp),
      records,
    }));
  }, [source.records, groupProp]);

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
