import { Bone } from "src/components/tiptap-ui-primitive/bone";
import "./page-row-skeleton.scss";

/**
 * A single bone row, standing in for one PageItem while the tree loads.
 *
 * Its geometry mirrors .page-item exactly — 28.5px tall, 6px left pad, a 15px
 * icon — because a skeleton row of a different height than the real one produces
 * a jolt at precisely the moment you're trying to hide one.
 */

// Deterministic widths: they don't reshuffle on re-render, and they're irregular
// enough to read as page titles rather than a progress bar.
const TITLE_WIDTHS = ["62%", "48%", "74%", "55%", "68%", "42%"];

export function PageRowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="page-row-skeleton" aria-hidden="true">
      <Bone width={15} height={15} rounded />
      <Bone
        width={TITLE_WIDTHS[index % TITLE_WIDTHS.length]}
        height={13}
        pill
      />
    </div>
  );
}