import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from "src/components/icons";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { NodeViewContent } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useDataSource } from "../../hooks/use-data-source";
import type { TimelineView } from "src/types";
import "./database-timeline-node-view.scss";
import { useDatabaseContext } from "../../context/database-context";
import { useDatabaseColumnLayout } from "../../hooks/use-database-column-layout";
import { DatabaseTableHeader } from "../database-table-node/database-table-header";
import {
  clampTableWidth,
  columnWindow,
  DAY_LEAD_HOURS,
  DEFAULT_TABLE_WIDTH,
  ROW_HEIGHT,
  GROUP_ROW_HEIGHT,
  TOTAL_HEADER_HEIGHT,
  sameDay,
  sameHour,
  stepRange,
  useTimelineLayout,
} from "../../hooks/use-timeline-layout";
import {
  useTimelineViewActions,
  useTimelineViewState,
} from "../../context/timeline-view-context";
import { TimelineHeader, type HighlightRange } from "./timeline-header";
import { TimelineDayGrid } from "./timeline-day-grid";
import { TimelinePlaceholder } from "./timeline-placeholder";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { MenuRow } from "../../components/menu-row";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  recordSelection,
  subscribe as subscribeSelection,
  useRecordSelection,
} from "../../utils/record-selection-store";

function useHoveredRecordId(): string | null {
  return useSyncExternalStore(
    subscribeSelection,
    () => recordSelection.getHovered(),
    () => null,
  );
}

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
  const {
    db,
    source,
    sortedRecords,
    onUpdateView,
    attrs,
    visibleProperties,
    onNewRecord,
  } = useDatabaseContext();
  const { addRecordAsync, updatePropertiesAsync } = useDataSource(source?.id);
  const { year, month, day } = useTimelineViewState();
  const { goTo, goToToday } = useTimelineViewActions();

  const activeView = db.activeView as TimelineView | undefined;
  const timeframe = activeView?.timeframe ?? "month";
  const showTable = activeView?.showTable ?? true;

  const { timelineLayout } = useTimelineLayout(
    sortedRecords,
    source,
    db,
    year,
    month,
    day,
  );

  const { range, startProp, placement } = timelineLayout;

  // The panel's own columns, from the same hook the table view uses, so a
  // width set here is the width there.
  const tableRef = useRef<HTMLDivElement>(null);
  const {
    widthFor,
    gridTemplateColumns,
    bodyGridTemplateColumns,
    commitColumnWidth,
  } = useDatabaseColumnLayout({
    properties: source?.properties ?? [],
    activeView,
    locked: !!attrs.locked,
    tableRef,
    updatePropertiesAsync,
  });

  // How much of that table shows. Only the name fits by default; the rest
  // is there, past the panel's edge, until the separator is dragged.
  const layoutRef = useRef<HTMLDivElement>(null);
  /** The width while the separator is being dragged; the view gets the last
   *  one, so a drag is one change rather than one per frame. */
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const tableWidth = liveWidth ?? activeView?.tableWidth ?? DEFAULT_TABLE_WIDTH;

  function startTableResize(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    const frame = layoutRef.current?.getBoundingClientRect();
    if (!frame) return;
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);

    const widthAt = (ev: { clientX: number }) =>
      clampTableWidth(ev.clientX - frame.left, frame.width);

    const move = (ev: PointerEvent) => setLiveWidth(widthAt(ev));
    const up = (ev: PointerEvent) => {
      const next = widthAt(ev);
      setLiveWidth(null);
      onUpdateView({ tableWidth: next } as Partial<TimelineView>);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  }
  const gridWidth = range.days.length * range.cellWidth;

  // The column today stands in: a day of the range, or — in Day, where a
  // column is an hour — the hour it is now. Worked out when the range
  // changes and not on every render: there are thousands of columns to look
  // through, and a render happens on every scroll event.
  const todayLeft = useMemo(() => {
    const today = new Date();
    const i = range.days.findIndex((d) =>
      range.unit === "hour" ? sameHour(d, today) : sameDay(d, today),
    );
    return i >= 0 ? i * range.cellWidth + range.cellWidth / 2 : null;
  }, [range]);

  function navigate(dir: -1 | 1) {
    // From the date the view is anchored to, not from where its grid
    // begins: a quarter's grid starts on the Monday before the quarter
    // does, so stepping from there went nowhere (stepRange says more).
    goTo(stepRange(new Date(year, month, day), timeframe, dir));
  }

  // ── Horizontal viewport tracking ──────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Where the gantt's first row begins, measured from the top of the grid:
  // the month row, the gap under it, the day row, and the line the body
  // draws above its own content. The panel's header is then made exactly
  // that tall, which is the whole of why a record's row and its bar sit on
  // the same line.
  //
  // Measured rather than computed. The same number worked out by hand in two
  // files is a number that goes wrong the first time either file is touched
  // — it already had, by the 5px gap under the month row. TOTAL_HEADER_HEIGHT
  // is only what the first paint uses, before the real one is known.
  const [headerHeight, setHeaderHeight] = useState<number>(TOTAL_HEADER_HEIGHT);
  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const header = scroll?.querySelector<HTMLElement>(".db-tl-header");
    const body = scroll?.querySelector<HTMLElement>(".db-tl-gantt__body");
    if (!header || !body) return;
    const measure = () => {
      const next = header.getBoundingClientRect().height + body.clientTop;
      // Only a real change: a no-op set here would be a render in a
      // ResizeObserver callback, every time.
      setHeaderHeight((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    ro.observe(body);
    return () => ro.disconnect();
  }, []);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  // Which columns the header and the grid draw: the ones on screen and a
  // block either side, rounded outwards so that scrolling a few pixels asks
  // for the same window again and leaves them both alone. The range itself
  // is years wide and a column is two divs; drawn in full it would be tens
  // of thousands of them to show thirty.
  const { from, to } = columnWindow(range, scrollLeft, viewportWidth);
  const shown = useMemo(() => ({ from, to }), [from, to]);

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

  // ── What lies past the right of the screen ────────────────────────────
  // The grid's right edge can fall outside what is on screen: the editor's
  // column is sized in vw, which counts a vertical scrollbar the page has
  // no room for. Whatever is out there cannot be scrolled to — the scroller
  // is already at its end — and anything pinned to the viewport's right
  // edge, the row arrows, is pinned where nobody can see it.
  //
  // So the grid is given a gutter of exactly this much and no more. More
  // than this is empty space for the scrollbar to wander into, past the end
  // of the timeline. The timeframe controls are not a reason for one: they
  // float over the group row, 28px of it, and a column's label and its bars
  // are below them.
  const [endSpill, setEndSpill] = useState(0);
  useEffect(() => {
    const view = viewportRef.current;
    if (!view) return;
    const measure = () => {
      const spill = Math.max(
        0,
        Math.ceil(
          view.getBoundingClientRect().right -
            document.documentElement.clientWidth,
        ),
      );
      setEndSpill((prev) => (prev === spill ? prev : spill));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(view);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  // ── Where a range opens ───────────────────────────────────────────────
  // On the page the view is anchored to, not on the first of the columns:
  // a range carries pages of context either side of its own (padFor), and
  // all of them are there to be scrolled into rather than opened on.
  //
  // Day's page then starts before the date on show, which buildRange
  // centres, so column 0 of it is the previous afternoon: open on the date
  // itself. Again whenever the arrows move to another page — but never over
  // a scroll that was asked for, which Today and the row arrows set below.
  const openLeft = useMemo(() => {
    const lead = range.unit === "hour" ? DAY_LEAD_HOURS : 0;
    return (range.anchorIndex + lead) * range.cellWidth;
  }, [range]);

  const openedAtRef = useRef<number | null>(null);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (openedAtRef.current === openLeft) return;
    openedAtRef.current = openLeft;
    // A scroll that was asked for knows better than the range's own start.
    if (pendingScrollRef.current) return;
    el.scrollTo({ left: openLeft, behavior: "auto" });
  }, [openLeft]);

  // ── Scrolling past the range on show ──────────────────────────────────
  // There is nothing here, and that is the fix. The range is built with a
  // year of hours, ten years of days, a century of weeks either side of the
  // page the view is anchored to (padFor), so a scroll has nowhere it can
  // arrive at: no wheel, no flick, no thumb dragged across the track runs
  // out of columns in a sitting. The browser scrolls its own content and
  // no scroll position is ever written while a gesture is under way.
  //
  // Which is what every version of this before it got wrong. Each one let
  // the range run out and then tried to hide it — stepping the range at the
  // end, waiting for the gesture to be over, growing the range as the end
  // came near — and all of them had to write a scroll position to do it.
  // Mid-gesture that write is either overridden a frame later or lands as a
  // jump of the thumb, which is the snap. An end that cannot be reached
  // needs no handling at all.
  //
  // Only what is on screen is drawn (columnWindow), so what this costs is
  // the Dates in the range and not a div per column.

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
      // The record's own date, all of it: its day is what Day and Week are
      // built around, and without it the view never reaches the record the
      // arrow is pointing at.
      pendingScrollRef.current = { type: "record", recordId: ind.recordId };
      goTo(ind.start);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      left: Math.max(0, ind.geo.left - el.clientWidth / 2 + ind.geo.width / 2),
      behavior: "smooth",
    });
  }

  const hoveredRecordId = useHoveredRecordId();
  const selectedRecordIds = useRecordSelection(attrs.id);

  const highlights = useMemo(() => {
    const out: HighlightRange[] = [];
    const { placement } = timelineLayout;

    selectedRecordIds.forEach((id) => {
      const geo = placement[id];
      if (geo) out.push({ left: geo.left, width: geo.width, tone: "selected" });
    });

    if (hoveredRecordId && !selectedRecordIds.includes(hoveredRecordId)) {
      const geo = placement[hoveredRecordId];
      if (geo) out.push({ left: geo.left, width: geo.width, tone: "hover" });
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineLayout.placement, hoveredRecordId, selectedRecordIds]);

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

  // One row per record, plus the empty one underneath — level with the name
  // table's "+ New" row, and the only place a page with no dates yet could
  // be drawn.
  const rowCount = sortedRecords.length + 1;
  const ganttHeight = rowCount * ROW_HEIGHT;

  async function createFromPlaceholder(start: Date, end: Date, title: string) {
    if (!startProp) return;
    // Both dates live in the start property, as the resize handler writes
    // them (database-record-node-view).
    await addRecordAsync({
      title,
      values: {
        [startProp.id]: { start: start.toISOString(), end: end.toISOString() },
      },
    });
  }

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

        <div className="db-tl-layout" ref={layoutRef}>
          {/* Always mounted, even when it is hidden. The records live in
              here now, and their bars are portalled out of them: unmounting
              the panel would take every bar in the grid with it. Hidden, it
              is a panel of no width. */}
          <div
            className="db-tl-table"
            data-hidden={!showTable || undefined}
            style={{
              width: showTable ? tableWidth : 0,
              minWidth: showTable ? tableWidth : 0,
            }}
          >
            {/* The same grid the table view is: one column per property,
                  each record a subgrid row of its own cells. That is what
                  makes these rows ordinary rows — the editor's drag handle
                  finds them, and reordering goes down the same path as the
                  table's (board-drag.ts). Only as much of it shows as the
                  panel is wide; the rest is there, past the edge. */}
            <div
              ref={tableRef}
              className="db-node-grid db-tl-grid"
              // The same inline style the table view's own grid carries
              // (database-table-body.tsx): display and width are set there,
              // not in CSS, and without them this is a column of stacked
              // headers and rows whose subgrid has no grid to sub.
              style={{
                display: "grid",
                width: "max-content",
                minWidth: "100%",
                // As tall as the gantt's own header, measured: row 1 of
                // this grid ends where the gantt's first row begins.
                ["--tl-header-height" as string]: `${headerHeight}px`,
                // The trailing track the table's own grid carries too: the
                // header ends in the add-property cell, so a grid one column
                // short wraps that cell onto a second line and pushes every
                // row below out of step with its bar.
                gridTemplateColumns: `${bodyGridTemplateColumns} 300px`,
              }}
            >
              <DatabaseTableHeader
                subgrid
                gridRow={1}
                visibleProperties={visibleProperties}
                allProperties={source?.properties ?? []}
                activeView={activeView}
                locked={!!attrs.locked}
                gridTemplateColumns={gridTemplateColumns}
                widthFor={widthFor}
                onReorder={(ids) => db.reorderProperties(ids)}
                onAddProperty={(type) => db.addProperty(type)}
                onCommitColumnWidth={commitColumnWidth}
              />
              <NodeViewContent as="div" className="db-node-grid__body" />
            </div>

            <div className="db-tl-table__row db-tl-table__row--new">
              <Button
                variant="ghost"
                className="db-tl-table__add-btn"
                // The database's own "new record", not a bare addRecord:
                // that one skipped the default row template, and the date
                // a timeline needs to be able to place the row at all.
                onClick={onNewRecord}
              >
                <Plus className="tiptap-button-icon" />
                <span className="tiptap-button-text">New</span>
              </Button>
            </div>
          </div>

          {showTable && (
            // Drag it to give the table more of the room, or less. The
            // columns past the panel's edge are already rendered; this is
            // what lets them be seen.
            <div
              className="db-tl-splitter"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the table"
              data-dragging={liveWidth !== null || undefined}
              onPointerDown={startTableResize}
            />
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
              <div
                style={{
                  width: gridWidth,
                  minWidth: gridWidth,
                  // Outside the width, not inside it: the columns keep the
                  // room they are drawn in and the scroller gains the rest.
                  boxSizing: "content-box",
                  paddingRight: endSpill,
                }}
              >
                <TimelineHeader
                  highlights={highlights}
                  range={range}
                  shown={shown}
                />
                <div
                  className="db-tl-gantt__body"
                  style={{
                    width: gridWidth,
                    minWidth: gridWidth,
                    height: ganttHeight,
                    position: "relative",
                  }}
                >
                  <TimelineDayGrid range={range} shown={shown} />

                  {/* Before the bars on purpose: they are drawn after it,
                      so a bar takes its own pointer events and the
                      placeholder never appears on top of a record. */}
                  <TimelinePlaceholder
                    range={range}
                    rowCount={rowCount}
                    onCreate={createFromPlaceholder}
                  />

                  {todayLeft !== null && (
                    <div
                      className="db-tl-today-line"
                      style={{ left: todayLeft }}
                      aria-hidden
                    />
                  )}

                  {/* The bars are portalled in here by timeline-bar.tsx:
                      each record's own DOM is its row in the panel. */}
                </div>
              </div>
            </div>

            <div
              className="db-tl-indicators"
              // Held inside what is on screen: the arrow that says a record
              // is off to the right is no use if it is off to the right
              // itself.
              style={{ top: headerHeight, right: endSpill }}
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
