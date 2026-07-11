import { Bone } from "src/components/tiptap-ui-primitive/bone/bone";

/**
 * Placeholder shown while an image's bytes are still downloading.
 *
 * Sized to the node's known box so the document doesn't reflow when the real
 * <img> paints: width comes from the node (preset or pixel width), height from
 * the aspect ratio captured on the image's first successful load. Before that
 * ratio is known there's nothing to derive a height from, so we fall back to a
 * neutral box — the one and only load where a shift is still possible.
 */
export function ImageNodeSkeleton({
  aspectRatio,
  fallbackHeight = 220,
}: {
  /** width / height of the real image, once known. */
  aspectRatio?: number | null;
  fallbackHeight?: number;
}) {
  // With a ratio we can reserve the exact box via padding-top; without one we
  // reserve a neutral height rather than collapsing to zero.
  if (aspectRatio && aspectRatio > 0) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: `${100 / aspectRatio}%`,
        }}
        aria-hidden="true"
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <Bone width="100%" height="100%" rounded />
        </div>
      </div>
    );
  }

  return <Bone width="100%" height={fallbackHeight} rounded />;
}