import { NodeViewWrapper } from "@tiptap/react";
import { Bone } from "src/components/tiptap-ui-primitive/bone/bone";
import "./database-loading-skeleton.scss";

type DatabaseLoadingSkeletonProps = { rows?: number; columns?: number };

export function DatabaseLoadingSkeleton({
  rows = 6,
  columns = 4,
}: DatabaseLoadingSkeletonProps) {
  // Use a neutral fixed default width matching the real fallback (160px),
  // so the column geometry is close to what loads in.
  const gridTemplateColumns = `220px ${"160px ".repeat(Math.max(0, columns - 1)).trim()} 1fr`;

  return (
    <NodeViewWrapper className="db-node" contentEditable={false}>
      <div className="db-skeleton" aria-busy="true" aria-live="polite">
        <span className="db-skeleton__sr">Loading database…</span>

        {/* Toolbar (view tabs + add-view) */}
        <div className="db-skeleton__toolbar">
          <Bone width={64} height={26} rounded />
          <Bone width={48} height={26} rounded />
          <Bone width={26} height={26} rounded />
        </div>

        {/* Title bar */}
        <Bone width="32%" height={28} rounded style={{ margin: "12px 0 4px" }} />

        {/* Header row */}
        <div
          className="db-skeleton__row db-skeleton__row--header"
          style={{ gridTemplateColumns }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="db-skeleton__cell">
              <Bone width={14} height={14} rounded />
              <Bone width={`${48 + (c % 3) * 14}%`} height={12} />
            </div>
          ))}
          <div className="db-skeleton__cell" />
        </div>

        {/* Body rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="db-skeleton__row" style={{ gridTemplateColumns }}>
            {Array.from({ length: columns }).map((_, c) => (
              <div key={c} className="db-skeleton__cell">
                {c === 0 && <Bone width={16} height={16} rounded />}
                <Bone width={`${36 + ((r + c) % 4) * 14}%`} height={12} />
              </div>
            ))}
            <div className="db-skeleton__cell" />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}