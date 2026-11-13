import type { CSSProperties } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Bone } from "src/components/tiptap-ui-primitive/bone/bone";
import {
  Calendar,
  ChartGantt,
  Columns3,
  LayoutGrid,
  List,
  ListChecks,
  Table,
} from "src/components/icons";
import type { DatabaseView } from "src/types";
import type { ViewDims } from "../../hooks/use-view-skeleton-dims";
import "./database-loading-skeleton.scss";

const VIEW_ICONS = {
  table: Table,
  list: List,
  board: Columns3,
  gallery: LayoutGrid,
  calendar: Calendar,
  timeline: ChartGantt,
  form: ListChecks,
} as const;

// More than this never fits on screen: the box is clipped to the height the
// view had anyway.
const MAX_ROWS = 60;

type DatabaseLoadingSkeletonProps = {
  /** Which view's shape to mimic. Defaults to table. */
  type?: DatabaseView["type"];
  /** What this view looked like last time on this device. */
  dims: ViewDims;
  /** The node's views: their tabs are real before anything loads. */
  views?: DatabaseView[];
  activeViewId?: string | null;
  switching?: boolean;
};

export function DatabaseLoadingSkeleton({
  type = "table",
  dims,
  views,
  activeViewId,
  switching = false,
}: DatabaseLoadingSkeletonProps) {
  const rows = Math.min(Math.max(dims.rows, 0), MAX_ROWS);
  const columns = Math.max(dims.columns, 1);

  const body = (() => {
    switch (type) {
      // ── Board: its columns, with as many cards as each had ────────────
      case "board": {
        const per =
          dims.perColumn ?? Array.from({ length: columns }, () => rows);
        return (
          <div className="db-skeleton__board" style={gaps(dims, { x: true })}>
            {per.map((count, c) => (
              <div
                key={c}
                className="db-skeleton__board-col"
                style={{
                  ...((dims.laneWidth ?? dims.cardWidth)
                    ? {
                        flex: `0 0 ${dims.laneWidth ?? dims.cardWidth}px`,
                      }
                    : undefined),
                  ...(dims.gapY != null ? { gap: dims.gapY } : undefined),
                }}
              >
                <div className="db-skeleton__board-head">
                  <Bone width={14} height={14} rounded />
                  <Bone width={`${40 + (c % 3) * 12}%`} height={12} />
                </div>
                {Array.from({ length: Math.min(count, MAX_ROWS) }).map(
                  (_, i) => (
                    <SkeletonCard key={i} dims={dims} seed={c + i} />
                  ),
                )}
              </div>
            ))}
          </div>
        );
      }

      // ── Gallery: its cards, at their size ─────────────────────────────
      case "gallery":
        return (
          <div
            className="db-skeleton__gallery"
            style={{
              // As many across as last time, at the width they had.
              ...(dims.columns > 0
                ? {
                    gridTemplateColumns: `repeat(${dims.columns}, minmax(0, ${
                      dims.cardWidth ? `${dims.cardWidth}px` : "1fr"
                    }))`,
                  }
                : dims.cardWidth
                  ? {
                      gridTemplateColumns: `repeat(auto-fill, minmax(min(${dims.cardWidth}px, 100%), 1fr))`,
                    }
                  : undefined),
              ...gaps(dims, { x: true, y: true }),
            }}
          >
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonCard key={i} dims={dims} seed={i} gallery />
            ))}
          </div>
        );

      // ── List: title + trailing inline props ───────────────────────────
      case "list":
        return (
          <div className="db-skeleton__list" style={gaps(dims, { y: true })}>
            {Array.from({ length: rows }).map((_, r) => (
              <div
                key={r}
                className="db-skeleton__list-row"
                style={dims.rowHeight ? { height: dims.rowHeight } : undefined}
              >
                <Bone width={16} height={16} rounded />
                <Bone width={`${30 + (r % 4) * 12}%`} height={13} />
                <span className="db-skeleton__spacer" />
                <Bone width={64} height={18} rounded />
                <Bone width={48} height={18} rounded />
              </div>
            ))}
          </div>
        );

      // ── Calendar: 5-week grid, chips on some days ─────────────────────
      case "calendar":
        return (
          <div className="db-skeleton__calendar">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="db-skeleton__day">
                <Bone width={18} height={10} />
                {i % 3 === 0 && (
                  <Bone width={`${50 + (i % 4) * 10}%`} height={16} rounded />
                )}
              </div>
            ))}
          </div>
        );

      // ── Timeline: label + offset bar per row ──────────────────────────
      case "timeline":
        return (
          <div className="db-skeleton__timeline">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="db-skeleton__timeline-row">
                <Bone width={120} height={12} />
                <div className="db-skeleton__track">
                  <Bone
                    width={`${20 + (r % 4) * 8}%`}
                    height={20}
                    rounded
                    style={{ marginLeft: `${(r % 5) * 11}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        );

      // ── Table: the real column names and widths ───────────────────────
      case "table":
      default: {
        const header = dims.header?.length
          ? dims.header
          : Array.from({ length: columns }, (_, c) => ({
              name: "",
              width: c === 0 ? 220 : 160,
            }));
        const gridTemplateColumns = `${header.map((h) => `${h.width}px`).join(" ")} 1fr`;
        const rowStyle = { gridTemplateColumns } as CSSProperties;
        const cellStyle = dims.rowHeight
          ? { height: dims.rowHeight }
          : undefined;
        return (
          <>
            <div
              className="db-skeleton__row db-skeleton__row--header"
              style={
                dims.headerHeight
                  ? { ...rowStyle, height: dims.headerHeight }
                  : rowStyle
              }
            >
              {header.map((h, c) => (
                <div key={c} className="db-skeleton__cell">
                  {h.name ? (
                    <span className="db-skeleton__th">{h.name}</span>
                  ) : (
                    <>
                      <Bone width={16} height={16} rounded />
                      <Bone width={`${48 + (c % 3) * 14}%`} height={14} />
                    </>
                  )}
                </div>
              ))}
              <div className="db-skeleton__cell" />
            </div>

            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="db-skeleton__row" style={rowStyle}>
                {header.map((_, c) => (
                  <div key={c} className="db-skeleton__cell" style={cellStyle}>
                    {c === 0 && <Bone width={18} height={18} rounded />}
                    <Bone width={`${36 + ((r + c) % 4) * 14}%`} height={14} />
                  </div>
                ))}
                <div className="db-skeleton__cell" style={cellStyle} />
              </div>
            ))}
          </>
        );
      }
    }
  })();

  // As tall as the view was, never taller: a one-card gallery in a column
  // doesn't stretch it while it loads.
  const height = switching ? dims.bodyHeight : dims.height;
  const boxStyle: CSSProperties | undefined = height
    ? { height, overflow: "hidden" }
    : undefined;

  // First load: the real view's alignment (.db-node padded by
  // useDatabaseAlign) isn't there yet, so sit in the text column like any
  // other block (.top-level-block) and clip anything wider than it.
  // Switching views: the skeleton renders inside the already-aligned
  // database chrome, so it keeps the container's layout.
  return (
    <NodeViewWrapper
      className={switching ? "db-container" : "db-skeleton-node"}
      contentEditable={false}
    >
      <div
        className={
          switching
            ? "db-skeleton"
            : "db-skeleton db-skeleton--column top-level-block"
        }
        style={boxStyle}
        aria-label="Loading database"
        aria-busy="true"
        aria-live="polite"
      >
        {!switching && (
          <>
            {/* The view tabs, from the node: real names right away. */}
            <div className="db-skeleton__toolbar">
              {views?.length ? (
                views.map((v) => {
                  const Icon = VIEW_ICONS[v.type] ?? ChartGantt;
                  return (
                    <span
                      key={v.id}
                      className="db-skeleton__tab"
                      data-active={v.id === activeViewId || undefined}
                    >
                      <Icon className="db-skeleton__tab-icon" />
                      {v.name}
                    </span>
                  );
                })
              ) : (
                <>
                  <Bone width={64} height={26} rounded />
                  <Bone width={48} height={26} rounded />
                </>
              )}
            </div>
          </>
        )}

        <div>{body}</div>
      </div>
    </NodeViewWrapper>
  );
}

/** The spaces a view had, where they are known. */
function gaps(
  dims: ViewDims,
  which: { x?: boolean; y?: boolean },
): CSSProperties | undefined {
  const out: CSSProperties = {};
  if (which.x && dims.gapX != null) out.columnGap = dims.gapX;
  if (which.y && dims.gapY != null) out.rowGap = dims.gapY;
  return Object.keys(out).length > 0 ? out : undefined;
}

function SkeletonCard({
  dims,
  seed,
  gallery = false,
}: {
  dims: ViewDims;
  seed: number;
  gallery?: boolean;
}) {
  // A gallery card has a cover unless it was measured without one.
  const cover = dims.coverHeight ?? (gallery ? 110 : 0);
  return (
    <div
      className={gallery ? "db-skeleton__gallery-card" : "db-skeleton__card"}
      style={dims.cardHeight ? { height: dims.cardHeight } : undefined}
    >
      {cover > 0 && (
        <div className="db-skeleton__cover">
          <Bone width="100%" height={cover} />
        </div>
      )}
      <div className={gallery ? "db-skeleton__card-body" : undefined}>
        <Bone width={`${55 + (seed % 3) * 14}%`} height={14} />
        <Bone width={`${30 + (seed % 4) * 10}%`} height={12} />
      </div>
    </div>
  );
}
