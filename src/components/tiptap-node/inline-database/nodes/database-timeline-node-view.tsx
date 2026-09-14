import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { NodeViewContent } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { usePageViewActions } from "src/components/tiptap-templates/simple/context/page-view-context";
import { useDataSource } from "../hooks/use-data-source";
import type { TimelineView } from "src/types";
import "./database-timeline-node-view.scss";
import { useDatabaseContext } from "./database-context";
import {
  DAY_WIDTH,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  GROUP_ROW_HEIGHT,
  useTimelineLayout,
} from "../hooks/use-timeline-layout";
import {
  useTimelineViewActions,
  useTimelineViewState,
} from "../context/timeline-view-context";
import { TimelineHeader } from "./timeline-header";
import { TimelineDayGrid } from "./timeline-day-grid";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { MenuRow } from "../components/menu-row";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

const TIMEFRAMES: TimelineView["timeframe"][] = [
  "day",
  "week",
  "month",
  "quarter",
  "year",
];

interface RowIndicator {
  recordId: string;
  rowIndex: number;
  direction: "left" | "right";
  start: Date;
  geo: { left: number; width: number } | undefined;
}

function TimeframeSwitcher({
  timeframe,
  onSelect,
}: {
  timeframe: string;
  onSelect: (tf: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          style={{
            textTransform: "capitalize",
          }}
        >
          <span className="tiptap-button-text">{timeframe}</span>
          <Spacer orientation="horizontal" size={0.2} />
          <ChevronDown className="tiptap-button-icon-sub" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Card style={{ padding: "5px 10px" }}>
          {TIMEFRAMES.map((tf) => (
            <MenuRow
              key={tf}
              label={tf[0].toUpperCase() + tf.slice(1)}
              onClick={() => onSelect(tf)}
              selected={timeframe === tf}
            />
          ))}
        </Card>
      </PopoverContent>
    </Popover>
  );
}

function TimelineShowTableToggle({
  showTable,
  onToggle,
}: {
  showTable: boolean;
  onToggle: (showTable: boolean) => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => onToggle(!showTable)}
      size="large"
      style={{
        // minWidth: "fit-content",
        // width: "fit-content",
        // minHeight: "fit-content !important",
        // height: "fit-content !important",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {showTable ? (
        <ChevronsLeft className="tiptap-button-icon" />
      ) : (
        <ChevronsRight className="tiptap-button-icon" />
      )}
    </Button>
  );
}

function TimelineNav({
  goToday,
  navigate,
}: {
  goToday: () => void;
  navigate: (dir: 1 | -1) => void;
}) {
  return (
    <div className="db-tl-nav-controls">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        style={{
          height: "fit-content",
          minHeight: "fit-content",
        }}
      >
        <ChevronLeft className="tiptap-button-icon" />
      </Button>
      <Button
        variant="ghost"
        onClick={goToday}
        data-highlighted={true}
        style={{
          background: "transparent",
        }}
      >
        <span className="tiptap-button-text">Today</span>
      </Button>
      <Button
        variant="ghost"
        onClick={() => navigate(1)}
        style={{
          height: "fit-content",
          minHeight: "fit-content",
        }}
      >
        <ChevronRight className="tiptap-button-icon" />
      </Button>
    </div>
  );
}

function DatabaseTimelineNodeViewImpl() {
  const { db, source, sortedRecords, onUpdateView } = useDatabaseContext();
  const { setTarget } = usePageViewActions();
  const { addRecordAsync } = useDataSource(source?.id);
  const { year, month } = useTimelineViewState();
  const { timelineLayout } = useTimelineLayout(
    sortedRecords,
    source,
    db,
    year,
    month,
  );
  const { setYear, setMonth, goToToday } = useTimelineViewActions();

  const activeView = db.activeView as TimelineView | undefined;
  const timeframe = activeView?.timeframe ?? "month";
  const showTable = activeView?.showTable ?? true;

  const { range, startProp, titleProp, placement } = timelineLayout;
  const gridWidth = range.days.length * DAY_WIDTH;

  const today = new Date();
  const todayIdx = range.days.findIndex(
    (d) =>
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate(),
  );
  const todayLeft = todayIdx >= 0 ? todayIdx * DAY_WIDTH + DAY_WIDTH / 2 : null;

  function navigate(dir: -1 | 1) {
    const cur = range.startDate;
    if (timeframe === "year") {
      setYear(cur.getFullYear() + dir);
      return;
    }
    let m = cur.getMonth() + (timeframe === "quarter" ? dir * 3 : dir);
    let y = cur.getFullYear();
    if (m < 0) {
      m += 12;
      y -= 1;
    } else if (m > 11) {
      m -= 12;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  }

  // ── Horizontal viewport tracking ──────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const viewportEl = viewportRef.current;
    if (!scrollEl || !viewportEl) return;

    const update = () => {
      setScrollLeft(scrollEl.scrollLeft);
      setViewportWidth(viewportEl.clientWidth);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(viewportEl);
    scrollEl.addEventListener("scroll", update, { passive: true });

    return () => {
      ro.disconnect();
      scrollEl.removeEventListener("scroll", update);
    };
  }, [gridWidth]);

  // ── Center-on-target, deferred until the target's range has committed ──
  const pendingScrollRef = useRef<
    { type: "today" } | { type: "record"; recordId: string } | null
  >(null);

  useEffect(() => {
    const pending = pendingScrollRef.current;
    if (!pending) return;
    const el = scrollRef.current;
    if (!el) return;

    if (pending.type === "today") {
      if (todayLeft === null) return;
      el.scrollTo({
        left: Math.max(0, todayLeft - el.clientWidth / 2),
        behavior: "smooth",
      });
      pendingScrollRef.current = null;
      return;
    }

    if (pending.type === "record") {
      const geo = placement[pending.recordId];
      if (!geo) return;
      el.scrollTo({
        left: Math.max(0, geo.left - el.clientWidth / 2 + geo.width / 2),
        behavior: "smooth",
      });
      pendingScrollRef.current = null;
    }
  }, [todayLeft, placement]);

  function handleToday() {
    pendingScrollRef.current = { type: "today" };
    goToToday();
    if (todayLeft !== null) {
      scrollRef.current?.scrollTo({
        left: Math.max(
          0,
          todayLeft - (scrollRef.current?.clientWidth ?? 0) / 2,
        ),
        behavior: "smooth",
      });
      pendingScrollRef.current = null;
    }
  }

  const indicators = useMemo<RowIndicator[]>(() => {
    if (!viewportWidth) return [];
    const out: RowIndicator[] = [];
    timelineLayout.records.forEach((rec, rowIndex) => {
      if (!rec.start) return;
      const geo = placement[rec.id];
      const viewportRight = scrollLeft + viewportWidth;

      let direction: "left" | "right" | null = null;
      if (!geo) {
        direction = rec.start < range.startDate ? "left" : "right";
      } else {
        const barRight = geo.left + geo.width;
        if (barRight < scrollLeft) direction = "left";
        else if (geo.left > viewportRight) direction = "right";
      }

      if (direction) {
        out.push({
          recordId: rec.id,
          rowIndex,
          direction,
          start: rec.start,
          geo,
        });
      }
    });
    return out;
  }, [timelineLayout.records, placement, range, scrollLeft, viewportWidth]);

  function scrollToRecord(ind: RowIndicator) {
    if (!ind.geo) {
      pendingScrollRef.current = { type: "record", recordId: ind.recordId };
      setYear(ind.start.getFullYear());
      setMonth(ind.start.getMonth());
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: Math.max(0, ind.geo.left - el.clientWidth / 2 + ind.geo.width / 2),
      behavior: "smooth",
    });
  }

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

  const ganttHeight = sortedRecords.length * ROW_HEIGHT;

  return (
    <div className="db-tl-layout-wrap">
      <div className="db-tl-toprow">
        <div
          className="db-tl-toggle-slot"
          style={{ height: GROUP_ROW_HEIGHT + 15 }}
        >
          <TimelineShowTableToggle
            showTable={showTable}
            onToggle={(showTable) => onUpdateView({ showTable })}
          />
        </div>

        <div className="db-tl-layout">
          {showTable && (
            <div className="db-tl-table" style={{ width: 220, minWidth: 220 }}>
              <div
                className="db-tl-table__header"
                style={{ height: HEADER_HEIGHT + GROUP_ROW_HEIGHT }}
              >
                <span className="db-tl-table__header-label">
                  {titleProp?.name ?? "Name"}
                </span>
              </div>
              <div className="db-tl-table__body">
                {sortedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="db-tl-table__row"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <button
                      className="db-tl-table__name-btn"
                      onClick={() =>
                        setTarget({ pageId: rec.id, view: "Peek" })
                      }
                    >
                      {titleProp
                        ? String(rec.values?.[titleProp.id] ?? "Untitled")
                        : "Untitled"}
                    </button>
                  </div>
                ))}
                <div
                  className="db-tl-table__row"
                  style={{ height: ROW_HEIGHT }}
                >
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

          <div className="db-tl-viewport" ref={viewportRef}>
            {/* Overlay: sits at the same height as the sticky group row
                (GROUP_ROW_HEIGHT), pinned to the viewport's top-right. The
                group row underneath keeps scrolling/sticking normally — this
                just floats the always-visible controls on top of it, on the
                right edge, so both read as one row. */}
            <div
              className="db-tl-nav-overlay"
              style={{ height: GROUP_ROW_HEIGHT }}
            >
              <TimeframeSwitcher
                timeframe={timeframe}
                onSelect={(tf) =>
                  onUpdateView({ timeframe: tf as TimelineView["timeframe"] })
                }
              />
              <Spacer orientation="horizontal" size={2} />
              <TimelineNav goToday={handleToday} navigate={navigate} />
            </div>

            <div className="db-tl-scroll" ref={scrollRef}>
              <div style={{ width: gridWidth, minWidth: gridWidth }}>
                <TimelineHeader range={range} />
                <div
                  className="db-tl-gantt__body"
                  style={{
                    width: gridWidth,
                    minWidth: gridWidth,
                    height: ganttHeight,
                    position: "relative",
                  }}
                >
                  <TimelineDayGrid range={range} />

                  {todayLeft !== null && (
                    <div
                      className="db-tl-today-line"
                      style={{ left: todayLeft }}
                      aria-hidden
                    />
                  )}

                  <NodeViewContent as="div" className="db-tl-gantt__content" />
                </div>
              </div>
            </div>

            <div
              className="db-tl-indicators"
              style={{ top: HEADER_HEIGHT + GROUP_ROW_HEIGHT }}
            >
              {indicators.map((ind) => (
                <Button
                  key={ind.recordId}
                  className={`db-tl-indicator db-tl-indicator--${ind.direction}`}
                  style={{ top: ind.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 }}
                  onClick={() => scrollToRecord(ind)}
                  aria-label={
                    ind.direction === "left"
                      ? "Scroll to earlier record"
                      : "Scroll to later record"
                  }
                >
                  {ind.direction === "left" ? (
                    <ArrowLeft className="tiptap-button-icon" size={12} />
                  ) : (
                    <ArrowRight className="tiptap-button-icon" size={12} />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const DatabaseTimelineNodeView = memo(DatabaseTimelineNodeViewImpl);
