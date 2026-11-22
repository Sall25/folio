import { memo, useMemo } from "react";
import type { ID } from "src/types";
import type { TimelinePlacement } from "../../hooks/use-timeline-layout";
import { ROW_HEIGHT } from "../../hooks/use-timeline-layout";
import { linkPath, type DependencyEdge } from "../../utils/dependencies";

/** Where a bar sits, to the layer that draws arrows between them. */
export interface LinkedBar extends TimelinePlacement {
  row: number;
}

/** How far an arrowhead stops short of the bar it points at. */
const TIP_GAP = 4;

/**
 * The arrows between bars: one curve per link, from the end of what blocks
 * to the start of what waits on it.
 *
 * Only the ones on screen are drawn. A grid is a near-infinite canvas and a
 * database can hold thousands of links; the ones whose two bars are both
 * far off to one side would be a few thousand paths nobody is looking at.
 * The window is the one the columns use, widened by what a curve can loop
 * out to, so an arrow is never cut off at its edge.
 */
function TimelineLinksImpl({
  edges,
  bars,
  width,
  height,
  from,
  to,
}: {
  edges: DependencyEdge[];
  bars: Record<ID, LinkedBar>;
  width: number;
  height: number;
  /** The visible span in px, as the columns know it. */
  from: number;
  to: number;
}) {
  const paths = useMemo(() => {
    const out: { key: string; d: string }[] = [];
    for (const edge of edges) {
      const a = bars[edge.from];
      const b = bars[edge.to];
      if (!a || !b) continue;
      const left = Math.min(a.left, b.left);
      const right = Math.max(a.left + a.width, b.left + b.width);
      if (right < from || left > to) continue;
      out.push({
        key: `${edge.from}>${edge.to}`,
        d: linkPath(
          { x: a.left + a.width, y: a.row * ROW_HEIGHT + ROW_HEIGHT / 2 },
          { x: b.left - TIP_GAP, y: b.row * ROW_HEIGHT + ROW_HEIGHT / 2 },
        ),
      });
    }
    return out;
  }, [edges, bars, from, to]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="db-tl-links"
      width={width}
      height={height}
      aria-hidden
      // The marker is defined per layer rather than per page: two timelines
      // on one page would otherwise share one id and the second would point
      // at the first's.
    >
      <defs>
        <marker
          id="db-tl-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="currentColor" />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.key}
          className="db-tl-link"
          d={p.d}
          markerEnd="url(#db-tl-arrow)"
        />
      ))}
    </svg>
  );
}

export const TimelineLinks = memo(TimelineLinksImpl);
