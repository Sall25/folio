import { NodeViewWrapper } from "@tiptap/react";
import "./database-loading-skeleton.scss";

type DatabaseLoadingSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function DatabaseLoadingSkeleton({
  rows = 6,
  columns = 4,
}: DatabaseLoadingSkeletonProps) {
  // First column reads as the title column (wider), rest equal.
  const gridTemplateColumns = `2fr ${"1fr ".repeat(Math.max(0, columns - 1)).trim()}`;

  return (
    <NodeViewWrapper as="div" data-type="database">
      <div className="db-skeleton" aria-busy="true" aria-live="polite">
        <span className="db-skeleton__sr">Loading database…</span>

        {/* toolbar / view-tabs placeholder */}
        <div className="db-skeleton__toolbar">
          <span className="db-skeleton__chip db-skeleton__shimmer" />
          <span className="db-skeleton__chip db-skeleton__shimmer" />
        </div>

        {/* header row */}
        <div
          className="db-skeleton__row db-skeleton__row--header"
          style={{ gridTemplateColumns }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="db-skeleton__cell">
              <span
                className="db-skeleton__bar db-skeleton__shimmer"
                style={{ width: `${55 + (c % 3) * 12}%` }}
              />
            </div>
          ))}
        </div>

        {/* body rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="db-skeleton__row"
            style={{ gridTemplateColumns }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <div key={c} className="db-skeleton__cell">
                <span
                  className="db-skeleton__bar db-skeleton__shimmer"
                  style={{ width: `${40 + ((r + c) % 4) * 14}%` }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}
