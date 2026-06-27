import { Bone } from "src/components/tiptap-ui-primitive/bone/bone";
import "./section-skeleton.scss";

const ROW_WIDTHS = [120, 96, 78, 110, 70, 88, 64, 102];

function widthsFor(rows: number | number[]): number[] {
  if (Array.isArray(rows)) return rows;
  return Array.from(
    { length: Math.max(0, rows) },
    (_, i) => ROW_WIDTHS[i % ROW_WIDTHS.length],
  );
}

function RowSkeleton({
  labelWidth,
  indent = 0,
}: {
  labelWidth: number;
  indent?: number;
}) {
  return (
    <div className="section-skeleton__row" style={{ paddingLeft: 8 + indent }}>
      <Bone width={18} height={18} rounded />
      <Bone width={labelWidth} height={12} />
    </div>
  );
}

export interface SectionSkeletonProps {
  /** width of the section label bone */
  labelWidth?: number;
  /** row count (varied widths) or explicit list of widths; 0 / [] = label only */
  rows?: number | number[];
  /** indent the rows (px) for a nested look */
  indent?: number;
  /** render rows without the section label */
  hideLabel?: boolean;
  className?: string;
}

export function SectionSkeleton({
  labelWidth = 52,
  rows = 5,
  indent = 0,
  hideLabel = false,
  className,
}: SectionSkeletonProps) {
  const widths = widthsFor(rows);
  return (
    <div
      className={["section-skeleton", className].filter(Boolean).join(" ")}
      role="presentation"
      aria-busy="true"
    >
      {!hideLabel && (
        <Bone
          width={labelWidth}
          height={10}
          className="section-skeleton__label"
        />
      )}
      {widths.length > 0 && (
        <div className="section-skeleton__rows">
          {widths.map((w, i) => (
            <RowSkeleton key={i} labelWidth={w} indent={indent} />
          ))}
        </div>
      )}
    </div>
  );
}
