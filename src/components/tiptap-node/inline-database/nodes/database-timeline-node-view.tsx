import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from "lucide-react";
import { useMemo, useRef, useState, useCallback, memo } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePageView } from "src/components/tiptap-templates/simple/context/page-view-context";
import { useDataSource } from "../hooks/use-data-source";
import type { DatabaseAttrs, DataSource, TimelineView } from "src/types";
import "./database-timeline-node-view.scss";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { TimelineBar } from "./timeline-bar";

const DAY_WIDTH = 40;
const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 56;

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
  let startDate: Date, endDate: Date;
  switch (timeframe) {
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
    case "year":
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      break;
    case "day":
    case "month":
    default:
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
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
      const m = cur.getMonth(),
        y = cur.getFullYear();
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
    for (let m = 0; m < 12; m++)
      headerGroups.push({
        label: new Date(year, m).toLocaleString("default", { month: "short" }),
        days: new Date(year, m + 1, 0).getDate(),
      });
  }
  return { startDate, endDate, days, headerGroups };
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function parseIso(iso: unknown): Date | null {
  if (typeof iso !== "string") return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

interface TimelineRecord {
  id: string;
  title: string;
  start: Date | null;
  end: Date | null;
}

function getBarGeo(rec: TimelineRecord, range: ViewRange, hasEnd: boolean) {
  if (!rec.start) return null;
  const effEnd = hasEnd ? (rec.end ?? rec.start) : rec.start;
  if (effEnd < range.startDate || rec.start > range.endDate) return null;
  const cl = rec.start < range.startDate,
    cr = effEnd > range.endDate;
  const s = cl ? range.startDate : rec.start,
    e = cr ? range.endDate : effEnd;
  const si = range.days.findIndex((d) => sameDay(d, s));
  const ei = range.days.findIndex((d) => sameDay(d, e));
  const left = (si < 0 ? 0 : si) * DAY_WIDTH;
  const width = Math.max(
    DAY_WIDTH,
    ((ei < 0 ? range.days.length - 1 : ei) - (si < 0 ? 0 : si) + 1) * DAY_WIDTH,
  );
  return { left, width, clippedLeft: cl, clippedRight: cr };
}

const TIMEFRAMES: Timeframe[] = ["day", "week", "month", "quarter", "year"];

export function DatabaseTimelineNodeViewImpl({
  attrs,
  source,
  onUpdateView,
}: {
  attrs: DatabaseAttrs & { sourceId?: string | null };
  source: DataSource;
  onUpdateView: (patch: Partial<TimelineView>) => void;
}) {
  const { setTarget } = usePageView();
  const { resolvedRecords, addRecordAsync, setCellValue } = useDataSource(
    attrs.sourceId,
  );

  const activeView = (attrs.views.find((v) => v.id === attrs.activeViewId) ??
    attrs.views[0]) as TimelineView | undefined;
  const startPropId = activeView?.startDatePropertyId ?? "";
  const endPropId = activeView?.endDatePropertyId ?? "";
  const timeframe = activeView?.timeframe ?? "month";
  const showTable = activeView?.showTable ?? true;

  const startProp = source.properties.find((p) => p.id === startPropId);
  const endProp = source.properties.find((p) => p.id === endPropId);
  const hasEnd = !!endProp;
  const titleProp = source.properties.find((p) => p.config.type === "title");

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const range = useMemo(
    () => buildViewRange(year, month, timeframe),
    [year, month, timeframe],
  );
  const gridWidth = range.days.length * DAY_WIDTH;
  const todayIdx = range.days.findIndex((d) => sameDay(d, today));
  const todayLeft = todayIdx >= 0 ? todayIdx * DAY_WIDTH + DAY_WIDTH / 2 : null;

  const records = useMemo<TimelineRecord[]>(() => {
    return resolvedRecords.map((r) => ({
      id: r.id,
      title: (titleProp && (r.values?.[titleProp.id] as string)) || "Untitled",
      start: parseIso(startProp ? r.values?.[startProp.id] : null),
      end: parseIso(endProp ? r.values?.[endProp.id] : null),
    }));
  }, [resolvedRecords, titleProp, startProp, endProp]);

  // ── Drag-resize via pointer math → setCellValue ──────────────────────────
  const dragRef = useRef<{
    recordId: string;
    edge: "start" | "end";
    originX: number;
    originDate: Date;
  } | null>(null);

  const onDragStart = useCallback(
    (
      e: React.MouseEvent,
      recordId: string,
      edge: "start" | "end",
      originDate: Date,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { recordId, edge, originX: e.clientX, originDate };
      const move = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const days = Math.round(
          (ev.clientX - dragRef.current.originX) / DAY_WIDTH,
        );
        if (days === 0) return;
        const next = new Date(dragRef.current.originDate);
        next.setDate(next.getDate() + days);
        const propId =
          dragRef.current.edge === "start" ? startPropId : endPropId;
        if (!propId) return;
        setCellValue(dragRef.current.recordId, propId, next.toISOString());
      };
      const up = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [startPropId, endPropId, setCellValue],
  );

  function navigate(dir: -1 | 1) {
    if (timeframe === "year") setYear((y) => y + dir);
    else if (timeframe === "quarter") {
      const nm = month + dir * 3;
      if (nm < 0) {
        setMonth(9);
        setYear((y) => y - 1);
      } else if (nm > 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else setMonth(nm);
    } else {
      const nm = month + dir;
      if (nm < 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else if (nm > 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else setMonth(nm);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  // Whole-bar move: shift BOTH dates by the day-delta
  const onBarDragEnd = useCallback(
    (e: DragEndEvent) => {
      const recordId = String(e.active.id);
      const daysDelta = Math.round(e.delta.x / DAY_WIDTH);
      if (daysDelta === 0) return;

      const rec = records.find((r) => r.id === recordId);
      if (!rec || !rec.start) return;

      const nextStart = new Date(rec.start);
      nextStart.setDate(nextStart.getDate() + daysDelta);
      if (startPropId)
        setCellValue(recordId, startPropId, nextStart.toISOString());

      if (hasEnd && endPropId && rec.end) {
        const nextEnd = new Date(rec.end);
        nextEnd.setDate(nextEnd.getDate() + daysDelta);
        setCellValue(recordId, endPropId, nextEnd.toISOString());
      }
    },
    [records, startPropId, endPropId, hasEnd, setCellValue],
  );

  if (!startProp) {
    return (
      <div className="db-tl-empty">
        <p>
          Add a Date property and select it as the start date to use timeline
          view.
        </p>
      </div>
    );
  }

  return (
    <div className="db-tl-layout-wrap">
      {/* Secondary nav */}
      <div className="db-tl-nav">
        <Button
          variant="ghost"
          onClick={() => onUpdateView({ showTable: !showTable })}
        >
          {showTable ? (
            <ChevronsLeft className="tiptap-button-icon" />
          ) : (
            <ChevronsRight className="tiptap-button-icon" />
          )}
        </Button>
        <div className="db-tl-nav__center">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ChevronLeft className="tiptap-button-icon" />
          </Button>
          <span className="db-tl-nav__label">
            {range.startDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <Button variant="ghost" onClick={() => navigate(1)}>
            <ChevronRight className="tiptap-button-icon" />
          </Button>
        </div>
        <div className="db-tl-timeframe-switcher">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={`db-tl-timeframe-btn${timeframe === tf ? " db-tl-timeframe-btn--active" : ""}`}
              onClick={() => onUpdateView({ timeframe: tf })}
            >
              {tf[0].toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setYear(today.getFullYear());
            setMonth(today.getMonth());
          }}
        >
          Today
        </Button>
      </div>

      <div className="db-tl-layout">
        {showTable && (
          <div className="db-tl-table" style={{ width: 220, minWidth: 220 }}>
            <div
              className="db-tl-table__header"
              style={{ height: HEADER_HEIGHT }}
            >
              <span className="db-tl-table__header-label">
                {titleProp?.name ?? "Name"}
              </span>
            </div>
            <div className="db-tl-table__body">
              {records.map((rec) => (
                <div
                  key={rec.id}
                  className="db-tl-table__row"
                  style={{ height: ROW_HEIGHT }}
                >
                  <button
                    className="db-tl-table__name-btn"
                    onClick={() => setTarget({ pageId: rec.id, view: "Peek" })}
                  >
                    {rec.title}
                  </button>
                </div>
              ))}
              <div className="db-tl-table__row" style={{ height: ROW_HEIGHT }}>
                <Button
                  variant="ghost"
                  className="db-tl-table__add-btn"
                  onClick={() => addRecordAsync({ title: "" })}
                >
                  <Plus className="tiptap-button-icon" />
                  <span className="tiptap-button-text">New</span>
                </Button>
              </div>
            </div>
          </div>
        )}
        <DndContext sensors={sensors} onDragEnd={onBarDragEnd}>
          <div
            className="db-tl-gantt__body"
            style={{ width: gridWidth, minWidth: gridWidth }}
          >
            {todayLeft !== null && (
              <div
                className="db-tl-today-line"
                style={{ left: todayLeft }}
                aria-hidden
              />
            )}
            {records.map((rec) => {
              const geo = getBarGeo(rec, range, hasEnd);
              return (
                <div
                  key={rec.id}
                  className="db-tl-gantt__row"
                  style={{ height: ROW_HEIGHT }}
                >
                  {geo && (
                    <TimelineBar
                      recordId={rec.id}
                      title={rec.title}
                      geo={{ left: geo.left, width: geo.width }}
                      hasEnd={hasEnd}
                      canResize
                      onResizeStart={(e, edge) =>
                        onDragStart(
                          e,
                          rec.id,
                          edge,
                          edge === "start"
                            ? rec.start!
                            : (rec.end ?? rec.start!),
                        )
                      }
                      onOpen={() => setTarget({ pageId: rec.id, view: "Peek" })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </DndContext>
      </div>
    </div>
  );
}

export const DatabaseTimelineNodeView = memo(DatabaseTimelineNodeViewImpl);
