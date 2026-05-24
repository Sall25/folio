import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from "lucide-react";
import { useMemo, useState, useRef, useCallback } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { DatabaseToolbar } from "../components/database-toolbar";
import { useDatabase } from "../hooks/use-database";
import { DatabaseProvider } from "./database-provider";
import type {
  DatabaseAttrs,
  TimelineView,
  DatabaseProperty,
  SelectOption,
  PropertyConfig,
} from "../types/types";
import "./database-timeline-node-view.scss";

// ── Constants ────────────────────────────────────────────────────────────────

const DAY_WIDTH = 40;
const ROW_HEIGHT = 34;
const TABLE_WIDTH = 220;
const HEADER_HEIGHT = 56;

// ── Timeframe helpers ────────────────────────────────────────────────────────

type Timeframe = TimelineView["timeframe"];

interface ViewRange {
  startDate: Date;
  endDate: Date;
  days: Date[];
  headerGroups: { label: string; days: number }[];
}

function buildViewRange(
  year: number,
  month: number,
  timeframe: Timeframe,
): ViewRange {
  let startDate: Date;
  let endDate: Date;

  switch (timeframe) {
    case "day": {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
      break;
    }
    case "week": {
      const first = new Date(year, month, 1);
      startDate = new Date(first);
      startDate.setDate(first.getDate() - first.getDay());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7 * 8 - 1);
      break;
    }
    case "quarter": {
      const q = Math.floor(month / 3);
      startDate = new Date(year, q * 3, 1);
      endDate = new Date(year, q * 3 + 3, 0);
      break;
    }
    case "year": {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      break;
    }
    case "month":
    default: {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
      break;
    }
  }

  const days: Date[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const headerGroups: { label: string; days: number }[] = [];
  if (timeframe === "month" || timeframe === "day") {
    headerGroups.push({
      label: startDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
      days: days.length,
    });
  } else if (timeframe === "week" || timeframe === "quarter") {
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const m = cur.getMonth();
      const y = cur.getFullYear();
      let count = 0;
      while (cur <= endDate && cur.getMonth() === m) {
        count++;
        cur.setDate(cur.getDate() + 1);
      }
      headerGroups.push({
        label: new Date(y, m).toLocaleString("default", {
          month: timeframe === "week" ? "short" : "long",
          ...(timeframe === "week" ? { year: "numeric" } : {}),
        }),
        days: count,
      });
    }
  } else if (timeframe === "year") {
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      headerGroups.push({
        label: new Date(year, m).toLocaleString("default", { month: "short" }),
        days: daysInMonth,
      });
    }
  }

  return { startDate, endDate, days, headerGroups };
}

function dayLabel(d: Date, timeframe: Timeframe): string {
  if (timeframe === "year") {
    return d.getDate() === 1
      ? d.toLocaleString("default", { month: "short" })
      : "";
  }
  if (timeframe === "quarter") {
    return d.getDate() % 3 === 1 ? String(d.getDate()) : "";
  }
  return String(d.getDate());
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ── Record data ──────────────────────────────────────────────────────────────

interface TimelineRecord {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  cellValues: Record<string, unknown>;
}

function extractRecords(
  editor: NodeViewProps["editor"],
  attrs: DatabaseAttrs,
  startPropId: string,
  endPropId: string,
): TimelineRecord[] {
  const titleProp = attrs.properties.find((p) => p.config.type === "title");
  const records: TimelineRecord[] = [];

  editor.state.doc.descendants((n) => {
    if (n.type.name !== "database" || n.attrs.id !== attrs.id) return true;

    n.descendants((child) => {
      if (child.type.name !== "databaseRecord") return true;

      const id = child.attrs.id as string;
      let title = "Untitled";
      let startIso: string | null = null;
      let endIso: string | null = null;
      const cellValues: Record<string, unknown> = {};

      child.descendants((cell) => {
        const propId = cell.attrs.propertyId as string;
        if (!propId) return;

        if (
          titleProp &&
          cell.type.name === "titleCell" &&
          propId === titleProp.id
        ) {
          const text = cell.textContent.trim();
          if (text) title = text;
        }

        if (cell.type.name === "dateCell" && propId === startPropId) {
          startIso = cell.attrs.value as string | null;
        }

        if (
          endPropId &&
          cell.type.name === "dateCell" &&
          propId === endPropId
        ) {
          endIso = cell.attrs.value as string | null;
        }

        if ("value" in cell.attrs) {
          cellValues[propId] = cell.attrs.value;
        } else if (cell.type.name === "titleCell") {
          cellValues[propId] = cell.textContent.trim();
        }
      });

      records.push({
        id,
        title,
        startDate: parseIso(startIso),
        endDate: parseIso(endIso),
        cellValues,
      });
    });

    return false;
  });

  return records;
}

// ── Bar geometry ─────────────────────────────────────────────────────────────

interface BarGeo {
  left: number;
  width: number;
  clippedLeft: boolean;
  clippedRight: boolean;
}

function getBarGeo(
  rec: TimelineRecord,
  range: ViewRange,
  hasEndProp: boolean,
): BarGeo | null {
  const { startDate, endDate } = rec;
  if (!startDate) return null;

  const effectiveEnd = hasEndProp ? (endDate ?? startDate) : startDate;

  if (effectiveEnd < range.startDate || startDate > range.endDate) return null;

  const clippedLeft = startDate < range.startDate;
  const clippedRight = effectiveEnd > range.endDate;

  const clampedStart = clippedLeft ? range.startDate : startDate;
  const clampedEnd = clippedRight ? range.endDate : effectiveEnd;

  const startIdx = range.days.findIndex((d) => sameDay(d, clampedStart));
  const endIdx = range.days.findIndex((d) => sameDay(d, clampedEnd));

  const left = (startIdx < 0 ? 0 : startIdx) * DAY_WIDTH;
  const width = Math.max(
    DAY_WIDTH,
    ((endIdx < 0 ? range.days.length - 1 : endIdx) -
      (startIdx < 0 ? 0 : startIdx) +
      1) *
      DAY_WIDTH,
  );

  return { left, width, clippedLeft, clippedRight };
}

// ── Badge renderer ────────────────────────────────────────────────────────────

function PropertyBadge({
  property,
  value,
}: {
  property: DatabaseProperty;
  value: unknown;
}) {
  const config = property.config;

  if (config.type === "select") {
    const option = value as SelectOption | null;
    if (!option) return null;
    return (
      <span
        className="db-tl-badge"
        style={{ background: option.color ?? "var(--tt-muted-bg-color)" }}
      >
        {option.label}
      </span>
    );
  }

  if (config.type === "multi_select") {
    const options = (value as SelectOption[]) ?? [];
    if (!options.length) return null;
    return (
      <>
        {options.slice(0, 2).map((o) => (
          <span
            key={o.id}
            className="db-tl-badge"
            style={{ background: o.color ?? "var(--tt-muted-bg-color)" }}
          >
            {o.label}
          </span>
        ))}
      </>
    );
  }

  if (config.type === "status") {
    const itemId = value as string | null;
    if (!itemId) return null;
    const item = (config as Extract<PropertyConfig, { type: "status" }>).groups
      .flatMap((g) => g.items)
      .find((i) => i.id === itemId);
    if (!item) return null;
    return (
      <span
        className="db-tl-badge"
        style={{
          background:
            (item as { color?: string }).color ?? "var(--tt-muted-bg-color)",
        }}
      >
        {(item as { name: string }).name}
      </span>
    );
  }

  if (config.type === "checkbox") {
    return (
      <span className="db-tl-badge db-tl-badge--muted">
        {value ? "✓" : "✗"}
      </span>
    );
  }

  if (typeof value === "string" && value) {
    return <span className="db-tl-badge db-tl-badge--muted">{value}</span>;
  }

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

const TIMEFRAMES: Timeframe[] = ["day", "week", "month", "quarter", "year"];

export function DatabaseTimelineNodeView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as DatabaseAttrs;
  const onUpdateTitle = (title: string) =>
    updateAttributes({ ...attrs, title });
  const db = useDatabase(attrs, editor, onUpdateTitle);

  const activeView = db.activeView as TimelineView | undefined;
  const startPropId = activeView?.startDatePropertyId ?? "";
  const endPropId = activeView?.endDatePropertyId ?? "";
  const timeframe = activeView?.timeframe ?? "month";
  const showTable = activeView?.showTable ?? true;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // ── Scroll sync refs ───────────────────────────────────────────────────
  // Vertical: table body <-> gantt body
  const tableBodyRef = useRef<HTMLDivElement>(null);
  const ganttBodyRef = useRef<HTMLDivElement>(null);
  const syncingVRef = useRef(false);

  const syncVertical = useCallback(
    (source: "table" | "gantt") => (e: React.UIEvent<HTMLDivElement>) => {
      if (syncingVRef.current) return;
      syncingVRef.current = true;
      const scrollTop = (e.target as HTMLDivElement).scrollTop;
      const other =
        source === "table" ? ganttBodyRef.current : tableBodyRef.current;
      if (other) other.scrollTop = scrollTop;
      syncingVRef.current = false;
    },
    [],
  );

  // Horizontal: gantt header <-> gantt body
  const ganttHeaderRef = useRef<HTMLDivElement>(null);
  const syncingHRef = useRef(false);

  const syncHorizontal = useCallback(
    (source: "header" | "body") => (e: React.UIEvent<HTMLDivElement>) => {
      if (syncingHRef.current) return;
      syncingHRef.current = true;
      const scrollLeft = (e.target as HTMLDivElement).scrollLeft;
      const other =
        source === "body" ? ganttHeaderRef.current : ganttBodyRef.current;
      if (other) other.scrollLeft = scrollLeft;
      syncingHRef.current = false;
    },
    [],
  );

  // ── Drag-resize ────────────────────────────────────────────────────────
  const dragRef = useRef<{
    recordId: string;
    edge: "start" | "end";
    originX: number;
    originDate: Date;
  } | null>(null);

  const startProp = attrs.properties.find((p) => p.id === startPropId) ?? null;
  const endProp = attrs.properties.find((p) => p.id === endPropId) ?? null;
  const hasEndProp = !!endProp;

  const hiddenPropIds = new Set(activeView?.hiddenProperties ?? []);
  const badgeProps = attrs.properties.filter(
    (p) =>
      p.config.type !== "title" &&
      p.config.type !== "date" &&
      p.config.type !== "created_time" &&
      p.config.type !== "edited_time" &&
      !hiddenPropIds.has(p.id),
  );

  // ── Navigation ─────────────────────────────────────────────────────────

  function navigate(dir: -1 | 1) {
    if (timeframe === "year") {
      setYear((y) => y + dir);
    } else if (timeframe === "quarter") {
      const newMonth = month + dir * 3;
      if (newMonth < 0) {
        setMonth(9);
        setYear((y) => y - 1);
      } else if (newMonth > 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else setMonth(newMonth);
    } else {
      const newMonth = month + dir;
      if (newMonth < 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else if (newMonth > 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else setMonth(newMonth);
    }
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  function setTimeframe(tf: Timeframe) {
    if (!activeView) return;
    db.updateView(activeView.id, { timeframe: tf } as Partial<TimelineView>);
  }

  function toggleTable() {
    if (!activeView) return;
    db.updateView(activeView.id, {
      showTable: !showTable,
    } as Partial<TimelineView>);
  }

  // ── Range & records ─────────────────────────────────────────────────────

  const range = useMemo(
    () => buildViewRange(year, month, timeframe),
    [year, month, timeframe],
  );

  const records = useMemo(
    () => extractRecords(editor, attrs, startPropId, endPropId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor.state.doc, attrs.id, startPropId, endPropId],
  );

  const gridWidth = range.days.length * DAY_WIDTH;

  const todayIdx = range.days.findIndex((d) => sameDay(d, today));
  const todayLeft = todayIdx >= 0 ? todayIdx * DAY_WIDTH + DAY_WIDTH / 2 : null;

  // ── Drag handlers ───────────────────────────────────────────────────────

  function onDragStart(
    e: React.MouseEvent,
    recordId: string,
    edge: "start" | "end",
    originDate: Date,
  ) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { recordId, edge, originX: e.clientX, originDate };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.originX;
      const daysDelta = Math.round(dx / DAY_WIDTH);
      if (daysDelta === 0) return;
      const newDate = new Date(dragRef.current.originDate);
      newDate.setDate(newDate.getDate() + daysDelta);
      const propId = dragRef.current.edge === "start" ? startPropId : endPropId;
      if (!propId) return;
      editor.commands.updateDatabaseCell(
        attrs.id,
        dragRef.current.recordId,
        propId,
        newDate.toISOString(),
      );
    };

    const onMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // ── Empty state ─────────────────────────────────────────────────────────

  if (!startProp) {
    return (
      <NodeViewWrapper>
        <DatabaseProvider
          attrs={attrs}
          db={db}
          editor={editor}
          updateAttributes={updateAttributes}
        >
          <CardItemGroup>
            <DatabaseToolbar
              attrs={attrs}
              db={db}
              onUpdateAttributes={(a) => updateAttributes(a)}
            />
            <div className="db-tl-empty">
              <p>
                Add a Date property and select it as the start date in the
                timeline settings to use this view.
              </p>
            </div>
          </CardItemGroup>
        </DatabaseProvider>
      </NodeViewWrapper>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <NodeViewWrapper>
      <DatabaseProvider
        attrs={attrs}
        db={db}
        editor={editor}
        updateAttributes={updateAttributes}
      >
        <CardItemGroup>
          <div
            style={{
              maxWidth: "var(--db-editor-width) !important",
              paddingRight: 40,
            }}
          >
            <DatabaseToolbar
              attrs={attrs}
              db={db}
              onUpdateAttributes={(a) => updateAttributes(a)}
            />
          </div>
          <CardItemGroup>
            {/* Secondary nav */}
            <div className="db-tl-nav">
              <div className="db-tl-nav__left">
                <Button
                  variant="ghost"
                  className="db-tl-nav__toggle-table"
                  onClick={toggleTable}
                  title={showTable ? "Hide table" : "Show table"}
                >
                  {showTable ? (
                    <ChevronsLeft className="tiptap-button-icon" />
                  ) : (
                    <ChevronsRight className="tiptap-button-icon" />
                  )}
                </Button>
              </div>
              <div className="db-tl-nav__center">
                <Button
                  variant="ghost"
                  className="db-tl-nav__arrow"
                  onClick={() => navigate(-1)}
                >
                  <ChevronLeft className="tiptap-button-icon" />
                </Button>
                <span className="db-tl-nav__label">
                  {range.startDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <Button
                  variant="ghost"
                  className="db-tl-nav__arrow"
                  onClick={() => navigate(1)}
                >
                  <ChevronRight className="tiptap-button-icon" />
                </Button>
              </div>
              <div className="db-tl-nav__right">
                <div className="db-tl-timeframe-switcher">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      className={[
                        "db-tl-timeframe-btn",
                        timeframe === tf && "db-tl-timeframe-btn--active",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setTimeframe(tf)}
                    >
                      {tf.charAt(0).toUpperCase() + tf.slice(1)}
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="db-tl-nav__today"
                  onClick={goToday}
                >
                  Today
                </Button>
              </div>
            </div>

            {/* Two-panel layout */}
            <div className="db-tl-layout">
              {/* ── Left table panel ── */}
              {showTable && (
                <div
                  className="db-tl-table"
                  style={{ width: TABLE_WIDTH, minWidth: TABLE_WIDTH }}
                >
                  <div
                    className="db-tl-table__header"
                    style={{ height: HEADER_HEIGHT }}
                  >
                    <span className="db-tl-table__header-label">
                      {attrs.properties.find((p) => p.config.type === "title")
                        ?.name ?? "Name"}
                    </span>
                  </div>
                  <div
                    ref={tableBodyRef}
                    className="db-tl-table__body"
                    onScroll={syncVertical("table")}
                  >
                    {records.map((rec) => (
                      <div
                        key={rec.id}
                        className="db-tl-table__row"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <button
                          className="db-tl-table__name-btn"
                          onClick={() => db.setOpenRecordId(rec.id)}
                          title={rec.title}
                        >
                          {rec.title}
                        </button>
                      </div>
                    ))}
                    <div
                      className="db-tl-table__row db-tl-table__row--new"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <Button
                        variant="ghost"
                        className="db-tl-table__add-btn"
                        onClick={() =>
                          editor.commands.addDatabaseRecord(attrs.id)
                        }
                      >
                        <Plus className="tiptap-button-icon" />
                        <span className="tiptap-button-text">New</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {showTable && <div className="db-tl-divider" />}

              {/* ── Right Gantt panel ── */}
              <div className="db-tl-gantt">
                {/* Header — driven by body scroll, pointer-events none */}
                <div
                  ref={ganttHeaderRef}
                  className="db-tl-gantt__header-scroll"
                  onScroll={syncHorizontal("header")}
                >
                  <div
                    className="db-tl-gantt__header"
                    style={{
                      width: gridWidth,
                      minWidth: gridWidth,
                      height: HEADER_HEIGHT,
                    }}
                  >
                    <div className="db-tl-gantt__header-top">
                      {range.headerGroups.map((grp, i) => (
                        <div
                          key={i}
                          className="db-tl-gantt__header-group"
                          style={{ width: grp.days * DAY_WIDTH }}
                        >
                          {grp.label}
                        </div>
                      ))}
                    </div>
                    <div className="db-tl-gantt__header-days">
                      {range.days.map((d, i) => {
                        const isToday = sameDay(d, today);
                        const dow = d.getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        return (
                          <div
                            key={i}
                            className={[
                              "db-tl-gantt__day-cell",
                              isToday && "db-tl-gantt__day-cell--today",
                              isWeekend && "db-tl-gantt__day-cell--weekend",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={{ width: DAY_WIDTH }}
                          >
                            {dayLabel(d, timeframe)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Body — drives both horizontal and vertical sync */}
                <div
                  ref={ganttBodyRef}
                  className="db-tl-gantt__body-scroll"
                  onScroll={(e) => {
                    syncVertical("gantt")(e);
                    syncHorizontal("body")(e);
                  }}
                >
                  <div
                    className="db-tl-gantt__body"
                    style={{ width: gridWidth, minWidth: gridWidth }}
                  >
                    {/* Grid lines */}
                    <div className="db-tl-gantt__grid-lines" aria-hidden>
                      {range.days.map((d, i) => {
                        const dow = d.getDay();
                        return (
                          <div
                            key={i}
                            className={[
                              "db-tl-gantt__col",
                              (dow === 0 || dow === 6) &&
                                "db-tl-gantt__col--weekend",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                          />
                        );
                      })}
                    </div>

                    {/* Today line */}
                    {todayLeft !== null && (
                      <div
                        className="db-tl-today-line"
                        style={{ left: todayLeft }}
                        aria-hidden
                      />
                    )}

                    {/* Rows */}
                    {records.map((rec) => {
                      const geo = getBarGeo(rec, range, hasEndProp);
                      return (
                        <div
                          key={rec.id}
                          className="db-tl-gantt__row"
                          style={{ height: ROW_HEIGHT }}
                        >
                          {geo?.clippedLeft && (
                            <button
                              className="db-tl-overflow-arrow db-tl-overflow-arrow--left"
                              onClick={() => {
                                if (rec.startDate) {
                                  setYear(rec.startDate.getFullYear());
                                  setMonth(rec.startDate.getMonth());
                                }
                              }}
                            >
                              <ChevronLeft size={12} />
                            </button>
                          )}
                          {geo?.clippedRight && (
                            <button
                              className="db-tl-overflow-arrow db-tl-overflow-arrow--right"
                              onClick={() => {
                                const d = rec.endDate ?? rec.startDate;
                                if (d) {
                                  setYear(d.getFullYear());
                                  setMonth(d.getMonth());
                                }
                              }}
                            >
                              <ChevronRight size={12} />
                            </button>
                          )}
                          {geo && (
                            <div
                              className="db-tl-bar"
                              style={{ left: geo.left, width: geo.width }}
                              onClick={() => db.setOpenRecordId(rec.id)}
                            >
                              {hasEndProp && rec.startDate && (
                                <div
                                  className="db-tl-bar__handle db-tl-bar__handle--left"
                                  onMouseDown={(e) =>
                                    onDragStart(
                                      e,
                                      rec.id,
                                      "start",
                                      rec.startDate!,
                                    )
                                  }
                                />
                              )}
                              <span className="db-tl-bar__title">
                                {rec.title}
                              </span>
                              {badgeProps.map((prop) => {
                                const val = rec.cellValues[prop.id];
                                if (val == null) return null;
                                return (
                                  <PropertyBadge
                                    key={prop.id}
                                    property={prop}
                                    value={val}
                                  />
                                );
                              })}
                              {hasEndProp && (rec.endDate ?? rec.startDate) && (
                                <div
                                  className="db-tl-bar__handle db-tl-bar__handle--right"
                                  onMouseDown={(e) =>
                                    onDragStart(
                                      e,
                                      rec.id,
                                      "end",
                                      rec.endDate ?? rec.startDate!,
                                    )
                                  }
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* New row spacer */}
                    <div
                      className="db-tl-gantt__row db-tl-gantt__row--new"
                      style={{ height: ROW_HEIGHT }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardItemGroup>
        </CardItemGroup>
      </DatabaseProvider>
    </NodeViewWrapper>
  );
}
