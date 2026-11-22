import { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ID } from "src/types";
import type { TimelinePlacement } from "../../hooks/use-timeline-layout";
import { ROW_HEIGHT } from "../../hooks/use-timeline-layout";
import {
  linkMidpoint,
  linkPath,
  type DependencyEdge,
} from "../../utils/dependencies";
import { useLinkDraft } from "../../utils/link-draft-store";

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
  onRemove,
}: {
  edges: DependencyEdge[];
  bars: Record<ID, LinkedBar>;
  width: number;
  height: number;
  /** The visible span in px, as the columns know it. */
  from: number;
  to: number;
  /** Takes the link away. */
  onRemove: (edge: DependencyEdge) => void;
}) {
  const paths = useMemo(() => {
    const out: {
      key: string;
      d: string;
      conflict: boolean;
      edge: DependencyEdge;
      at: { x: number; y: number };
    }[] = [];
    for (const edge of edges) {
      const a = bars[edge.from];
      const b = bars[edge.to];
      if (!a || !b) continue;
      const left = Math.min(a.left, b.left);
      const right = Math.max(a.left + a.width, b.left + b.width);
      if (right < from || left > to) continue;
      const tail = {
        x: a.left + a.width,
        y: a.row * ROW_HEIGHT + ROW_HEIGHT / 2,
      };
      const head = {
        x: b.left - TIP_GAP,
        y: b.row * ROW_HEIGHT + ROW_HEIGHT / 2,
      };
      out.push({
        key: `${edge.from}>${edge.to}`,
        conflict: !!edge.conflict,
        edge,
        at: linkMidpoint(tail, head),
        d: linkPath(tail, head),
      });
    }
    return out;
  }, [edges, bars, from, to]);

  // The link being drawn, if one is: from the dot the drag started on to
  // the pointer, dashed, and shown as refused where it cannot be made.
  const draft = useLinkDraft();

  // The arrow under the pointer, which is the one wearing the button that
  // takes it away. Held on a tap too, so a link can be undone by touch.
  const [held, setHeld] = useState<string | null>(null);
  const { t } = useTranslation();
  const removeLabel = t("database.dependencies.removeLink");

  if (paths.length === 0 && !draft) return null;

  return (
    <svg
      className="db-tl-links"
      width={width}
      height={height}
      // Not aria-hidden: an arrow carries a button that removes the link.
      role="presentation"
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
        <g
          key={p.key}
          className="db-tl-link-group"
          data-held={held === p.key || undefined}
          onPointerEnter={() => setHeld(p.key)}
          onPointerLeave={() => setHeld((at) => (at === p.key ? null : at))}
        >
          <path
            className="db-tl-link"
            data-conflict={p.conflict || undefined}
            d={p.d}
            markerEnd="url(#db-tl-arrow)"
          />
          {/* A line and a half is nothing to aim at: this one is wide,
              invisible, and the thing the pointer actually meets. */}
          <path className="db-tl-link__grab" d={p.d} />
          {held === p.key && (
            <g
              className="db-tl-link__remove"
              transform={`translate(${p.at.x} ${p.at.y})`}
              role="button"
              tabIndex={0}
              aria-label={removeLabel}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setHeld(null);
                onRemove(p.edge);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                setHeld(null);
                onRemove(p.edge);
              }}
            >
              <circle r="9" />
              <path d="M -3.2 -3.2 L 3.2 3.2 M 3.2 -3.2 L -3.2 3.2" />
            </g>
          )}
        </g>
      ))}
      {draft && (
        <path
          className="db-tl-link db-tl-link--draft"
          data-refused={draft.over && !draft.valid ? "" : undefined}
          d={linkPath(
            { x: draft.anchorX, y: draft.anchorY },
            { x: draft.x, y: draft.y },
          )}
          markerEnd="url(#db-tl-arrow)"
        />
      )}
    </svg>
  );
}

export const TimelineLinks = memo(TimelineLinksImpl);
