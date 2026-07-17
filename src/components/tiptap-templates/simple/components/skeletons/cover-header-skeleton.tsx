import { Bone } from "src/components/tiptap-ui-primitive/bone";
import "./cover-header-skeleton.scss";

/**
 * Shown while the PAGE RECORD is still fetching — the window where CoverHeader
 * currently returns null, so the title and body jump down the moment a cover
 * appears.
 *
 * This is an honest guess and nothing more: with no page we don't know whether
 * there's a cover at all, let alone which. So it reserves the cover band and the
 * icon's box, and no more. Once the record lands, CoverHeader knows exactly what
 * to draw (cover data lives on the Page, not in the Yjs doc) and renders it for
 * real — no second guess needed.
 *
 * Geometry mirrors the real thing: a 260px band (CoverImage's height) and a
 * 100x100 icon (.cover-icon-btn) overlapping it by 60px, so nothing shifts.
 */
export function CoverHeaderSkeleton({
  paddingLeft = 0,
  marginLeft = 0,
}: {
  paddingLeft?: number;
  marginLeft?: number;
}) {
  return (
    <div className="cover-header-skeleton" aria-hidden="true">
      <div className="cover-header-skeleton__band" style={{ marginLeft }}>
        <Bone width="100%" height={260} />
      </div>

      <div style={{ marginLeft, paddingLeft }}>
        <Bone
          width={100}
          height={100}
          rounded
          className="cover-header-skeleton__icon"
        />
      </div>
    </div>
  );
}
