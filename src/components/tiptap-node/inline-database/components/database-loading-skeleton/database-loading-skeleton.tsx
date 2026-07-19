import { NodeViewWrapper } from "@tiptap/react";
import { Bone } from "src/components/tiptap-ui-primitive/bone/bone";
import type { DatabaseView } from "src/types";
import "./database-loading-skeleton.scss";

type DatabaseLoadingSkeletonProps = {
  /** Which view's shape to mimic. Defaults to table. */
  type?: DatabaseView["type"];
  rows?: number;
  columns?: number;
};

export function DatabaseLoadingSkeleton({
  type = "table",
  rows = 6,
  columns = 4,
}: DatabaseLoadingSkeletonProps) {
  // Use a neutral fixed default width matching the real fallback (160px),
  // so the column geometry is close to what loads in.
  const gridTemplateColumns = `220px ${"160px ".repeat(Math.max(0, columns - 1)).trim()} 1fr`;

  const body = (() => {
    switch (type) {
      // ── Board: 3 columns of stacked cards ─────────────────────────────
      case "board":
        return (
          <div className="db-skeleton__board">
            {Array.from({ length: 3 }).map((_, c) => (
              <div key={c} className="db-skeleton__board-col">
                <div className="db-skeleton__board-head">
                  <Bone width={14} height={14} rounded />
                  <Bone width={`${40 + (c % 3) * 12}%`} height={12} />
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="db-skeleton__card">
                    <Bone width={`${60 + ((c + i) % 3) * 12}%`} height={14} />
                    <Bone width={`${30 + ((c + i) % 4) * 10}%`} height={12} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        );

      // ── Gallery: card grid with cover ─────────────────────────────────
      case "gallery":
        return (
          <div className="db-skeleton__gallery">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="db-skeleton__gallery-card">
                <div className="db-skeleton__cover">
                  <Bone width="100%" height={110} />
                </div>
                <div className="db-skeleton__card-body">
                  <Bone width={`${55 + (i % 3) * 14}%`} height={14} />
                  <Bone width={`${30 + (i % 4) * 10}%`} height={12} />
                </div>
              </div>
            ))}
          </div>
        );

      // ── List: title + trailing inline props ───────────────────────────
      case "list":
        return (
          <div className="db-skeleton__list">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="db-skeleton__list-row">
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

      // ── Table (unchanged) ─────────────────────────────────────────────
      case "table":
      default:
        return (
          <>
            {/* Header row */}
            <div
              className="db-skeleton__row db-skeleton__row--header"
              style={{ gridTemplateColumns }}
            >
              {Array.from({ length: columns }).map((_, c) => (
                <div key={c} className="db-skeleton__cell">
                  <Bone width={16} height={16} rounded />
                  <Bone width={`${48 + (c % 3) * 14}%`} height={14} />
                </div>
              ))}
              <div className="db-skeleton__cell" />
            </div>

            {/* Body rows */}
            {Array.from({ length: rows }).map((_, r) => (
              <div
                key={r}
                className="db-skeleton__row"
                style={{ gridTemplateColumns }}
              >
                {Array.from({ length: columns }).map((_, c) => (
                  <div key={c} className="db-skeleton__cell">
                    {c === 0 && <Bone width={18} height={18} rounded />}
                    <Bone width={`${36 + ((r + c) % 4) * 14}%`} height={14} />
                  </div>
                ))}
                <div className="db-skeleton__cell" />
              </div>
            ))}
          </>
        );
    }
  })();

  return (
    <NodeViewWrapper className="db-node" contentEditable={false}>
      <div
        className="db-skeleton"
        aria-label="Loading database"
        aria-busy="true"
        aria-live="polite"
      >
        {/* Toolbar (view tabs + add-view) — shared by every view type */}
        <div className="db-skeleton__toolbar">
          <Bone width={64} height={26} rounded />
          <Bone width={48} height={26} rounded />
          <Bone width={26} height={26} rounded />
        </div>

        {/* Title bar */}
        <Bone
          width="32%"
          height={28}
          rounded
          style={{ margin: "12px 0 4px" }}
        />

        {body}
      </div>
    </NodeViewWrapper>
  );
}
