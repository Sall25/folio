/* eslint-disable react-hooks/exhaustive-deps */
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useDataSource } from "../hooks/use-data-source";
import { SelectCellDisplay } from "../primitives/select-cell-display";
import { StatusCellDisplay } from "../primitives/status-cell-display";
import { CheckboxCellDisplay } from "../primitives/checkbox-cell-display";
import { BoardCard } from "../primitives/board-card";
import type {
  BoardView,
  DataSource,
  Page,
  DatabaseProperty,
  StatusGroup,
  CellValue,
  DatabaseAttrs,
  DatabaseView,
} from "src/types";
import "./database-board-node-view.scss";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { BoardColumn } from "../primitives/board-column";
import { pillClass } from "../utils/pill-colors";

const NONE_COLUMN_ID = "__none__";

interface ColumnDef {
  id: string;
  label: string;
  color?: string;
}

function getColumnDefs(prop: DatabaseProperty | undefined): ColumnDef[] {
  if (!prop) return [];
  const config = prop.config;
  if (config.type === "select" || config.type === "multi_select") {
    return config.options.map((o) => ({
      id: o.id,
      label: o.label,
      color: o.color,
    }));
  }
  if (config.type === "status") {
    return config.groups.flatMap((g) =>
      g.items.map((i) => ({ id: i.id, label: i.name, color: i.color })),
    );
  }
  if (config.type === "checkbox") {
    return [
      { id: "true", label: "Checked" },
      { id: "false", label: "Unchecked" },
    ];
  }
  return [];
}

/** Which column does a record belong to, given the group property's value? */
function columnKeyFor(value: unknown, prop: DatabaseProperty): string {
  if (value == null) return NONE_COLUMN_ID;
  const t = prop.config.type;
  if (t === "checkbox") return value ? "true" : "false";
  if (t === "select" || t === "status") {
    // select stores SelectOption (or id); status stores id
    return typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: string }).id)
      : String(value);
  }
  if (t === "multi_select") {
    const arr = Array.isArray(value) ? value : [];
    const first = arr[0];
    if (first == null) return NONE_COLUMN_ID;
    return typeof first === "object" && "id" in first
      ? String((first as { id: string }).id)
      : String(first);
  }
  return NONE_COLUMN_ID;
}

export function DatabaseBoardNodeView({
  attrs,
  source,
  view,
}: {
  view: DatabaseView;
  attrs: DatabaseAttrs;
  source: DataSource;
}) {
  const { resolvedRecords, addRecordAsync, setCellValue } = useDataSource(
    attrs.sourceId,
  );

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as BoardView | undefined;
  const groupByPropertyId = activeView?.groupByPropertyId ?? "";
  const groupProp = source.properties.find((p) => p.id === groupByPropertyId);
  const columnDefs = useMemo(() => getColumnDefs(groupProp), [groupProp]);

  const allColumns: ColumnDef[] = [
    { id: NONE_COLUMN_ID, label: `No ${groupProp?.name ?? ""}` },
    ...columnDefs,
  ];

  // Bucket ROWS (pages) into columns
  const buckets = useMemo(() => {
    const map = new Map<string, Page[]>();
    allColumns.forEach((c) => map.set(c.id, []));
    if (!groupProp) return map;
    for (const rec of resolvedRecords) {
      const key = columnKeyFor(rec.values?.[groupProp.id], groupProp);
      (map.get(key) ?? map.get(NONE_COLUMN_ID)!).push(rec);
    }
    return map;
  }, [resolvedRecords, groupProp, allColumns]);

  const colWidth = 260;

  function setGroupValue(recordId: string, columnId: string) {
    if (!groupProp) return;
    if (columnId === NONE_COLUMN_ID) {
      // dropping into "No <prop>" clears the grouping value
      setCellValue(recordId, groupProp.id, null);
      return;
    }
    const cfg = groupProp.config;
    let value: CellValue | null = null;
    if (cfg.type === "select")
      value = cfg.options.find((o) => o.id === columnId) ?? null;
    else if (cfg.type === "multi_select") {
      const o = cfg.options.find((x) => x.id === columnId);
      value = o ? [o] : [];
    } else if (cfg.type === "status") value = columnId;
    else if (cfg.type === "checkbox") value = columnId === "true";
    setCellValue(recordId, groupProp.id, value);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const recordId = String(e.active.id);
    const targetColumn = String(e.over.id);
    setGroupValue(recordId, targetColumn);
  }

  const activeRecord = activeId
    ? (resolvedRecords.find((r) => r.id === activeId) ?? null)
    : null;

  if (!groupByPropertyId || columnDefs.length === 0) {
    return (
      <div className="db-board-empty">
        <p>
          Set a Status or Select property as the group property to use board
          view.
        </p>
      </div>
    );
  }

  const cardProps = source.properties.filter(
    (p) =>
      p.id !== groupProp?.id &&
      !(activeView?.hiddenProperties ?? []).includes(p.id),
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className="db-board"
        data-type="database-board"
        style={{ ["--db-board-col-width" as string]: `${colWidth}px` }}
      >
        {allColumns.map((col) => {
          const recs = buckets.get(col.id) ?? [];
          return (
            <div
              key={col.id}
              className={
                col.color
                  ? pillClass("db-board-col", col.color)
                  : "db-board-col"
              }
              style={{
                ...(col.color
                  ? {
                      ["--col-color" as string]: `var(--tt-color-text-${col.color})`,
                    }
                  : {}),
              }}
              data-colored={col.color ? "true" : undefined}
            >
              <div className="db-board-col-header">
                {col.id === NONE_COLUMN_ID ? (
                  <span className="db-board-col-header__label">
                    {col.label}
                  </span>
                ) : groupProp?.config.type === "select" ? (
                  <SelectCellDisplay
                    value={
                      groupProp.config.options.find((o) => o.id === col.id) ??
                      null
                    }
                    options={groupProp.config.options}
                    readonly
                  />
                ) : groupProp?.config.type === "status" ? (
                  <StatusCellDisplay
                    value={col.id}
                    groups={
                      (groupProp.config as { groups: StatusGroup[] }).groups
                    }
                    readonly
                  />
                ) : groupProp?.config.type === "checkbox" ? (
                  <CheckboxCellDisplay value={col.id === "true"} readonly />
                ) : (
                  <span className="db-board-col-header__label">
                    {col.label}
                  </span>
                )}
              </div>

              <BoardColumn columnId={col.id} isOver={false}>
                {recs.map((rec) => (
                  <BoardCard
                    key={rec.id}
                    record={rec}
                    properties={cardProps}
                    cardPreview={activeView?.cardPreview ?? "none"}
                    sourceId={attrs.sourceId!}
                    onChange={(propId, v) => setCellValue(rec.id, propId, v)}
                    view={view}
                  />
                ))}
              </BoardColumn>

              <Button
                variant="ghost"
                className="db-board-col-footer__add"
                onClick={async () => {
                  const row = await addRecordAsync({ title: "" });
                  setGroupValue(row.id, col.id);
                }}
              >
                <Plus className="tiptap-button-icon" />
                <span className="tiptap-button-text">New</span>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Drag overlay — the card that follows the cursor */}
      <DragOverlay>
        {activeRecord ? (
          <div className="db-board-card db-board-card--overlay">
            {cardProps.find((p) => p.config.type === "title") && (
              <span className="db-board-card__title-text">
                {String(
                  activeRecord.values?.[
                    cardProps.find((p) => p.config.type === "title")!.id
                  ] ?? "Untitled",
                )}
              </span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
